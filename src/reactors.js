import * as types from './types';
import * as util from './util';

var reactorParentStack = [];

export function Reactor(react, derivable) {
  this._derivable = derivable;
  if (react) {
    this.react = react;
  }
  this._atoms = [];
  this._parent = null;
  this._active = false;
  this._yielding = false;
  this._reacting = false;
  this._type = types.REACTION;
  if (util.DEBUG_MODE) {
    this.stack = Error().stack;
  }
}

function captureAtoms(derivable, atoms) {
  if (derivable._type === types.ATOM) {
    util.addToArray(atoms, derivable);
  }
  else {
    for (var i = 0, len = derivable._lastParentsEpochs.length; i < len; i += 2) {
      captureAtoms(derivable._lastParentsEpochs[i], atoms);
    }
  }
}

util.assign(Reactor.prototype, {
  start: function () {
    this._lastValue = this._derivable.get();
    this._lastEpoch = this._derivable._epoch;
    this._atoms = [];
    captureAtoms(this._derivable, this._atoms);
    var that = this;
    this._atoms.forEach(function (atom) {
      util.addToArray(atom._reactors, that);
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
    if (this._reacting) {
      throw Error('cyclical update detected!!');
    } else if (this._active) {
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
        var oldAtoms = this._atoms;
        var newAtoms = [];
        this._atoms = newAtoms;
        captureAtoms(this._derivable, newAtoms);

        var that = this;

        newAtoms.forEach(function (atom) {
          var idx = oldAtoms.indexOf(atom);
          if (idx === -1) {
            util.addToArray(atom._reactors, that);
          } else {
            oldAtoms[idx] = null;
          }
        });

        oldAtoms.forEach(function (atom) {
          if (atom !== null) {
            util.removeFromArray(atom._reactors, that);
          }
        });
      }
    }
  },
  stop: function () {
    var that = this;
    this._atoms.forEach(function (atom) {
      return util.removeFromArray(atom._reactors, that);
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
