var reactorParentStack = [];

function Reactor(react, derivable) {
  this._derivable = derivable;
  if (react) {
    this.react = react;
  }
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

var reactors_Reactor = Reactor;

function captureAtoms(derivable, atoms) {
  if (derivable._type === types_ATOM) {
    util_addToArray(atoms, derivable);
  }
  else {
    for (var i = 0, len = derivable._lastParentsEpochs.length; i < len; i += 2) {
      captureAtoms(derivable._lastParentsEpochs[i], atoms);
    }
  }
}

Object.assign(reactors_Reactor.prototype, {
  start: function () {
    this._lastValue = this._derivable.get();
    this._lastEpoch = this._derivable._epoch;
    this._atoms = [];
    captureAtoms(this._derivable, this._atoms);
    var that = this;
    this._atoms.forEach(function (atom) {
      util_addToArray(atom._reactors, that);
    });

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
      var oldAtoms = this._atoms;
      var newAtoms = [];
      this._atoms = newAtoms;
      captureAtoms(this._derivable, newAtoms);

      var that = this;

      newAtoms.forEach(function (atom) {
        var idx = oldAtoms.indexOf(atom);
        if (idx === -1) {
          util_addToArray(atom._reactors, that);
        } else {
          oldAtoms[idx] = null;
        }
      });

      oldAtoms.forEach(function (atom) {
        if (atom !== null) {
          util_removeFromArray(atom._reactors, that);
        }
      });

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

    return this;
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
      if (this._derivable._epoch !== this._lastEpoch &&
          !this._derivable.__equals(nextValue, this._lastValue)) {
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
    return this;
  },
  adopt: function (child) {
    child._parent = this;
    return this;
  },
  isActive: function () {
    return this._active;
  },
});
