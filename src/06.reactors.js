function reactorBase (parent, control) {
  return {
    control: control,
    parent: parent,
    _state: gc_STABLE,
    active: false,
    _type: types_REACTION,
    uid: util_nextId(),
    reacting: false
  }
}

function stop (base) {
  util_removeFromArray(base.parent._children, base);
  base.active = false;
  base.control.onStop && base.control.onStop();
}

function start (base) {
  util_addToArray(base.parent._children, base);
  base.active = true;
  base.control.onStart && base.control.onStart();
  base.parent._get();
}

function reactors_maybeReact (base) {
  if (base._state === gc_UNSTABLE) {
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

function force (base) {
  // base.reacting check now in gc_mark; total solution there as opposed to here
  if (base.control.react) {
    base._state = gc_STABLE;
    try {
      base.reacting = true;
      base.control.react(base.parent._get());
    } finally {
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
  isRunning: function () {
    return this._base.active;
  }
})

function reactors_StandardReactor (f) {
  /*jshint validthis:true */
  this._type = types_REACTION;
  this.react = f;
}

util_extend(reactors_StandardReactor.prototype, reactors_Reactor.prototype);

function reactors_anonymousReactor (descriptor) {
  return util_extend(new reactors_Reactor(), descriptor);
}
