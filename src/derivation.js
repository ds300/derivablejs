import * as util from './util';
import * as parents from './parents';
import * as types from './types';
import {unpack} from './unpack';
import {CHANGED, UNCHANGED, UNKNOWN, DISCONNECTED} from './states';

export function Derivation (deriver) {
  this._deriver = deriver;
  this._parents = null;
  this._type = types.DERIVATION;
  this._value = util.unique;
  this._equals = null;
  this._activeChildren = [];
  this._state = DISCONNECTED;

  if (util.isDebug()) {
    this.stack = Error().stack;
  }
}

util.assign(Derivation.prototype, {
  _clone: function () {
    return util.setEquals(derive(this._deriver), this._equals);
  },

  _forceEval: function () {
    var that = this;
    var newVal = null;
    var newNumParents;

    try {
      if (this._parents === null) {
        this._parents = [];
      }
      parents.startCapturingParents(this, this._parents);
      if (!util.isDebug()) {
        newVal = that._deriver();
      } else {
        try {
          newVal = that._deriver();
        } catch (e) {
          console.error(that.stack);
          throw e;
        }
      }
      newNumParents = parents.retrieveParentsFrame().offset;
    } finally {
      parents.stopCapturingParents();
    }

    if (!this.__equals(newVal, this._value)) {
      this._state = CHANGED;
    } else {
      this._state = UNCHANGED;
    }

    for (var i = newNumParents, len = this._parents.length; i < len; i++) {
      var oldParent = this._parents[i];
      detach(oldParent, this);
      this._parents[i] = null;
    }

    this._parents.length = newNumParents;

    this._value = newVal;
  },

  _update: function () {
    if (this._parents === null) {
      // this._state === DISCONNECTED
      this._forceEval();
      // this._state === CHANGED ?
    } else if (this._state === UNKNOWN) {
      var len = this._parents.length;
      for (var i = 0; i < len; i++) {
        var parent = this._parents[i];

        if (parent._state === UNKNOWN) {
          parent._update();
        }

        if (parent._state === CHANGED) {
          this._forceEval();
          break;
        }
      }
      if (this._state === UNKNOWN) {
        this._state = UNCHANGED;
      }
    }
  },

  get: function () {
    parents.maybeCaptureParent(this);
    if (this._activeChildren.length > 0) {
      this._update();
    } else {
      parents.startCapturingParents(void 0, []);
      try {
        this._value = this._deriver();
      } finally {
        parents.stopCapturingParents();
      }
    }
    return this._value;
  },
});

export function detach (parent, child) {
  util.removeFromArray(parent._activeChildren, child);
  if (parent._activeChildren.length === 0 && parent._parents != null) {
    var len = parent._parents.length;
    for (var i = 0; i < len; i++) {
      detach(parent._parents[i], parent);
    }
    parent._parents = null;
    parent._state = DISCONNECTED;
  }
}

export function deriveFactory(f) {
  return new Derivation(f);
}

const warnDeriveFn = (() => {
  let called = false;
  return () => {
    if (!called) {
      called = true;
      console.warn('derive with arguments injection (derive((a) => {}, da) is deprecated. Use map method instead');
    }
  };
})();

export function derive (f, a, b, c, d) {
  switch (arguments.length) {
    case 0:
      throw new Error('derive takes at least one argument');
    case 1:
      return deriveFactory(f);
    case 2:
      warnDeriveFn();
      return deriveFactory(function () {
        return f(unpack(a));
      });
    case 3:
      warnDeriveFn();
      return deriveFactory(function () {
        return f(unpack(a), unpack(b));
      });
    case 4:
      warnDeriveFn();
      return deriveFactory(function () {
        return f(unpack(a), unpack(b), unpack(c));
      });
    case 5:
      warnDeriveFn();
      return deriveFactory(function () {
        return f(unpack(a),
                 unpack(b),
                 unpack(c),
                 unpack(d));
      });
    default:
      warnDeriveFn();
      var args = util.slice(arguments, 1);
      return deriveFactory(function () {
        return f.apply(null, args.map(unpack));
      });
  }
}
