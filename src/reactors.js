import * as types from './types';
import * as util from './util';

var reactorParentStack = [];

export function Reactor(react, derivable) {
  this._derivable = derivable;
  if (react) {
    this.react = react;
  }
  this._parent = null;
  this._active = false;
  this._yielding = false;
  this._reacting = false;
  this._type = types.REACTION;
  this._atoms = [];
  this._oldAtoms = [];

  if (util.DEBUG_MODE) {
    this.stack = Error().stack;
  }
}

function forEachAtom(atoms, fn) {
  if (atoms != null) {
    if (atoms._type === types.ATOM) {
      fn(atoms);
    } else {
      for (var i = 0, len = atoms.length; i < len; i++) {
        forEachAtom(atoms[i], fn);
      }
    }
  }
}

util.assign(Reactor.prototype, {
  start: function () {
    this._lastValue = this._derivable.get();
    this._lastEpoch = this._derivable._epoch;

    var that = this;
    forEachAtom(this._derivable._atoms, function (atom) {
      util.addToArray(atom._reactors, that);
      util.addToArray(that._atoms, atom);
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

    } catch (e) {
      if (util.DEBUG_MODE) {
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
    if (!this._reacting && this._active) {
      if (this._yielding) {
        throw Error('reactor dependency cycle detected');
      }
      if (this._parent !== null) {
        this._yielding = true;
        try {
          this._parent._maybeReact();
        } finally {
          this._yielding = false;
        }
      }
      // maybe the reactor was stopped by the parent
      if (this._active) {
        var nextValue = this._derivable.get();
        if (this._derivable._epoch !== this._lastEpoch &&
            !this._derivable.__equals(nextValue, this._lastValue)) {
          this._force(nextValue);
        }

        // need to check atoms regardless of whether reactions happens
        // TODO: incorporate atom capturing into .get somehow
        this._lastEpoch = this._derivable._epoch;
        this._lastValue = nextValue;

        var i = 0;
        var that = this;
        forEachAtom(this._derivable._atoms, function (atom) {
          var thisAtom = that._atoms[i];
          if (thisAtom !== atom) {
            if (thisAtom != null) {
              util.removeFromArray(thisAtom._reactors, that);
            }
            that._atoms[i] = atom;
            util.addToArray(atom._reactors, that);
          }
          i++;
        });
        this._atoms.length = i;
      }
    }
  },
  stop: function () {
    var that = this;
    this._atoms.forEach(function (atom) {
      util.removeFromArray(atom._reactors, that);
    });
    this._atoms.length = 0;
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
