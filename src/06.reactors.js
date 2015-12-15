function reactorBase (parent, control) {
  var base = {
    control: control,      // the actual object the user gets
    parent: parent,        // the parent derivable
    parentReactor: null,
    dependentReactors: [],
    _state: gc_STABLE,
    active: false,         // whether or not listening for changes in parent
    _type: types_REACTION,
    uid: util_nextId(),
    reacting: false,       // whether or not reaction function being invoked
    yielding: false,       // whether or not letting parentReactor react first
  };
  if (util_DEBUG_MODE) {
    base.stack = Error().stack;
  }
  return base;
}
var cycleMsg = "Cyclical Reactor Dependency! Not allowed!";

function stop (base) {
  if (base.active) {
    util_removeFromArray(base.parent._children, base);
    if (base.parentReactor) {
      orphan(base);
    }
    base.active = false;
    base.control.onStop && base.control.onStop();
  }
}

var parentReactorStack = [];

function start (base) {
  if (!base.active) {
    util_addToArray(base.parent._children, base);
    base.active = true;
    base.parent._get();
    // capture reactor dependency relationships
    var len = parentReactorStack.length;
    if (len > 0) {
      base.parentReactor = parentReactorStack[len - 1];
    }

    base.control.onStart && base.control.onStart();
  }
}

function orphan (base) {
  if (base.parentReactor) {
    base.parentReactor = null;
  }
}

function adopt (parentBase, childBase) {
  childBase.parentReactor = parentBase;
}

function reactors_maybeReact (base) {
  if (base.yielding) {
    throw Error(cycleMsg);
  }
  if (base.active && base._state === gc_UNSTABLE) {
    if (base.parentReactor !== null) {
      try {
        base.yielding = true;
        reactors_maybeReact(base.parentReactor);
      } finally {
        base.yielding = false;
      }
    }
    // parent might have deactivated this one
    if (base.active) {
      var parent = base.parent, parentState = parent._state;
      if (parentState === gc_UNSTABLE ||
          parentState === gc_ORPHANED ||
          parentState === gc_DISOWNED ||
          parentState === gc_NEW) {
        parent._get();
      }
      parentState = parent._state;

      if (parentState === gc_UNCHANGED) {
        base._state = gc_STABLE;
      } else if (parentState === gc_CHANGED) {
        force(base);
      } else {
          throw new Error("invalid parent state: " + parentState);
      }
    }
  }
}

function force (base) {
  // base.reacting check now in gc_mark; total solution there as opposed to here
  if (base.control.react) {
    base._state = gc_STABLE;
    try {
      base.reacting = true;
      parentReactorStack.push(base);
      if (!util_DEBUG_MODE) {
        base.control.react(base.parent._get());
      } else {
        try {
          base.control.react(base.parent._get());
        } catch (e) {
          console.error(base.stack);
          throw e;
        }
      }
    } finally {
      parentReactorStack.pop();
      base.reacting = false;
    }
  } else {
      throw new Error("No reactor function available.");
  }
}

function reactors_Reactor () {
  /*jshint validthis:true */
  this._type = types_REACTION;
}

function reactors_createBase (control, parent) {
  if (control._base) {
    throw new Error("This reactor has already been initialized");
  }
  control._base = reactorBase(parent, control);
  return control;
}

util_extend(reactors_Reactor.prototype, {
  start: function () {
    start(this._base);
    return this;
  },
  stop: function () {
    stop(this._base);
    return this;
  },
  force: function () {
    force(this._base);
    return this;
  },
  isActive: function () {
    return this._base.active;
  },
  orphan: function () {
    orphan(this._base);
    return this;
  },
  adopt: function (child) {
    if (child._type !== types_REACTION) {
      throw Error("reactors can only adopt reactors");
    }
    adopt(this._base, child._base);
    return this;
  }
});

function reactors_StandardReactor (f) {
  /*jshint validthis:true */
  this._type = types_REACTION;
  this.react = f;
}

util_extend(reactors_StandardReactor.prototype, reactors_Reactor.prototype);

function reactors_anonymousReactor (descriptor) {
  return util_extend(new reactors_Reactor(), descriptor);
}
