function reactionBase (parent, control) {
  return {
    control: control,
    parent: parent,
    _state: gc_STABLE,
    active: false,
    _type: types_REACTION
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

function reactions_maybeReact (base) {
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
  if (base.control.react) {
    base._state = gc_STABLE;
    base.control.react(base.parent._get());
  } else {
      throw new Error("No reaction function available.");
  }
}

function reactions_Reaction () {
  /*jshint validthis:true */
  this._type = types_REACTION;
}

function reactions_createBase (control, parent) {
  if (control._base) {
    throw new Error("This reaction has already been initialized");
  }
  control._base = reactionBase(parent, control);
  return control;
}

util_extend(reactions_Reaction.prototype, {
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

function reactions_StandardReaction (f) {
  /*jshint validthis:true */
  this._type = types_REACTION;
  this.react = f;
}

util_extend(reactions_StandardReaction.prototype, reactions_Reaction.prototype);

function reactions_anonymousReaction (descriptor) {
  return util_extend(new reactions_Reaction(), descriptor);
}
