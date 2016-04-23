var reactorParentStack = [];

function reactors_Reactor(react, derivable) {
    this._derivable = derivable;
    this.react = react;
    this._atoms = [];
    this._parent = null;
    this._active = false;
    this._yielding = false;
    this._reacting = false;
    this._type = types_REACTION;
    if (util_DEBUG_MODE) {
      this.stack = Error().stack;
    }
}

function bindAtomsToReactors(derivable, reactor) {
  if (derivable instanceof Atom) {
    util_addToArray(derivable.reactors, reactor);
    util_addToArray(reactor.atoms, derivable);
  }
  else {
    for (var i = 0, len = derivable.lastParentsEpochs.length; i < len; i += 2) {
      bindAtomsToReactors(derivable.lastParentsEpochs[i], reactor);
    }
  }
}

Object.assign(reactors_Reactor.prototype, {
  start: function () {
    this._lastValue = this._derivable.get();
    this._lastEpoch = this._derivable._epoch;
    this._atoms = [];
    bindAtomsToReactors(this._derivable, this);
    var len = reactorParentStack.length;
    if (len > 0) {
      this._parent = reactorParentStack[len - 1];
    }
    this._active = true;
    this.onStart && this.onStart();
    return this;
  },
  _force: function (nextValue) {
    try {
      reactorParentStack.push(this);
      this._reacting = true;
      this.react(nextValue);
    } catch (e) {
      if (util_DEBUG_MODE) {
        console.error(this.stack);
      }
      throw e;
    } finally {
      this._reacting = false;
      reactorParentStack.pop();
    }
  },
  force: function () {
    this._force(this._derivable.get());
  },
  _maybeReact: function () {
    if (this._reacting) {
      throw Error('cyclical update detected!!');
    } else if (this._active) {
      if (this._yielding) {
        throw Error('reactor dependency cycle detected');
      }
      if (this._parent !== null) {
        this._yielding = true;
        this._parent._maybeReact();
        this._yielding = false;
      }
      var nextValue = this._derivable.get();
      if (this._derivable._epoch !== this._lastEpoch
         && nextValue !== this._lastValue) {
        this._force(nextValue);
      }
      this._lastEpoch = this._derivable._epoch;
      this._lastValue = nextValue;
    }
  },
  stop: function () {
    var _this = this;
    this._atoms.forEach(function (atom) {
      return util_removeFromArray(atom._reactors, _this);
    });
    this._atoms = [];
    this._parent = null;
    this._active = false;
    this.onStop && this.onStop();
    return this;
  },
  orphan: function () {
    this._parent = null;
  },
  adopt: function (child) {
    child._parent = this;
  },
  isActive: function () {
    return this._active;
  },
});
