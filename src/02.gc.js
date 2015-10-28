// node modes
var gc_NEW = 0,
    gc_CHANGED = 1,
    gc_UNCHANGED = 2,
    gc_ORPHANED = 3,
    gc_UNSTABLE = 4,
    gc_STABLE = 5,
    gc_DISOWNED = 6;

function gc_mark(node, reactors) {
  // make everything unstable
  if (node._type === types_REACTION) {
    if (node.reacting) {
      throw new Error("Cycle detected! Don't do this!");
    }
    reactors.push(node);
  } else {
    for (var i = node._children.length; i--;) {
      var child = node._children[i];
      if (child._state !== gc_UNSTABLE) {
        child._state = gc_UNSTABLE;
        gc_mark(child, reactors);
      }
    }
  }
}

function gc_sweep(node) {
  var i;
  switch (node._state) {
  case gc_CHANGED:
  case gc_UNCHANGED:
    // changed or unchanged means the node was visited
    // during the react phase, which means we keep it in
    // the graph for the next go round
    for (i = node._children.length; i--;) {
      var child = node._children[i];
      gc_sweep(child);
      if (child._state !== gc_STABLE) {
        node._children.splice(i, 1);
      }
    }
    node._state = gc_STABLE;
    break;
  case gc_UNSTABLE:
    if (node._type === types_REACTION) {
      // only happens when reaction created in transaction. see issue #14
      node._state = gc_STABLE;
    } else {
      // unstable means the node was not visited during
      // the react phase, which means we kick it out of the
      // graph.

      // but first we check if all of its parents were unchanged
      // if so, we can avoid recalculating it in future by
      // caching its parents' current values.
      var stashedParentStates = [];
      for (i = node._parents.length; i--;) {
        var parent = node._parents[i];
        if (parent._state !== gc_UNCHANGED) {
          // nope, its parents either have changed or weren't visited,
          // so we have to orphan this node
          node._state = gc_ORPHANED;
          break;
        }
        stashedParentStates.push([parent, parent._value]);
      }
      if (node._state !== gc_ORPHANED) {
        node._state = gc_DISOWNED;
        node._parents = stashedParentStates;
      }
    }
    break;
  case gc_STABLE:
  case gc_ORPHANED:
  case gc_DISOWNED:
    break;
  default:
    throw new Error("can't sweep state " + node._state);
  }
}

function gc_abort_sweep(node) {
  // set everything to unstable, kill all derivation caches and disconnect
  // the graph
  var doChildren = false;
  switch (node._type) {
  case types_ATOM:
    node._state = gc_STABLE;
    doChildren = true;
    break;
  case types_DERIVATION:
  case types_LENS:
    node._state = gc_NEW;
    node._value = util_unique;
    doChildren = true;
    break;
  case types_REACTION:
    node._state = gc_STABLE;
    doChildren = false;
    break;
  }
  if (doChildren) {
    for (var i = node._children.length; i--;) {
      gc_abort_sweep(node._children[i]);
    }
    node._children = [];
  }
}
