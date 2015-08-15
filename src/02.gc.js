// node modes
var gc_NEW = 0,
    gc_CHANGED = 1,
    gc_UNCHANGED = 2,
    gc_ORPHANED = 3,
    gc_UNSTABLE = 4,
    gc_STABLE = 5,
    gc_DISOWNED = 6;

function gc_mark(node, reactions) {
  // make everything unstable
  if (node._type === types_REACTION) {
    reactions.push(node);
  } else {
    for (var i = node._children.length; i--;) {
      var child = node._children[i];
      if (child._state !== gc_UNSTABLE) {
        child._state = gc_UNSTABLE;
        gc_mark(child, reactions);
      }
    }
  }
}

function gc_sweep(node) {
  switch (node._state) {
  case gc_CHANGED:
  case gc_UNCHANGED:
    // changed or unchanged means the node was visited
    // during the react phase, which means we keep it in
    // the graph for the next go round
    for (var i = node._children.length; i--;) {
      var child = node._children[i];
      gc_sweep(child);
      if (child._state !== gc_STABLE) {
        node._children.splice(i, 1);
      }
    }
    node._state = gc_STABLE;
    break;
  case gc_UNSTABLE:
    // unstable means the node was not visited during
    // the react phase, which means we kick it out of the
    // graph.

    // but first we check if all of its parents were unchanged
    // if so, we can avoid recalculating it in future by
    // caching its parents' current values.
    var stashedParentStates = [];
    for (var i = node._parents.length; i--;) {
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
    break;
  case gc_STABLE:
  case gc_ORPHANED:
  case gc_DISOWNED:
    break;
  default:
    throw new Error("can't sweep state " + node._state);
  }
}
