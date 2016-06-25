import * as util from './util';
import * as parents from './parents';
import * as transactions from './transactions';
import epoch from './epoch';
import * as types from './types';
import {CHANGED, UNCHANGED, UNKNOWN, DISCONNECTED} from './states';

export function Derivation (deriver) {
  this._deriver = deriver;
  this._parents = null;
  this._type = types.DERIVATION;
  this._value = util.unique;
  this._equals = null;
  this._activeChildren = [];
  this._state = DISCONNECTED;

  if (util.DEBUG_MODE) {
    this.stack = Error().stack;
  }
};

util.assign(Derivation.prototype, {
  _clone: function () {
    return util.setEquals(derivation(this._deriver), this._equals);
  },

  _forceEval: function () {
    var that = this;
    var newVal = null;
    var newParents = null;

    try {
      parents.startCapturingParents();
      if (!util.DEBUG_MODE) {
        newVal = that._deriver();
      } else {
        try {
          newVal = that._deriver();
        } catch (e) {
          console.error(that.stack);
          throw e;
        }
      }
      newParents = parents.retrieveParents();
    } finally {
      parents.stopCapturingParents();
    }

    if (!this.__equals(newVal, this._value)) {
      this._state = CHANGED;
    } else {
      this._state = UNCHANGED;
    }

    if (this._parents) {
      // disconnect old parents
      const len = this._parents.length;
      for (let i = 0; i < len; i++) {
        const oldParent = this._parents[i];
        if (newParents.indexOf(oldParent) === -1) {
          detach(oldParent, this);
        }
      }
    }

    this._parents = newParents;
    this._value = newVal;
  },

  _update: function () {
    if (this._parents === null) {
      this._forceEval();
    } else if (this._state === UNKNOWN) {
      const len = this._parents.length;
      for (let i = 0; i < len; i++) {
        if (this._parents[i]._state !== UNCHANGED) {
          this._forceEval();
          break;
        }
      }
    }
  },

  get: function () {
    if (this._activeChildren.length > 0) {
      parents.maybeCaptureParent(this);
      this._update();
      return this._value;
    } else {
      return this._deriver();
    }
  },
});

export function detach (parent, child) {
  util.removeFromArray(parent._activeChildren, child);
  if (parent._activeChildren.length === 0 && parent._parents != null) {
    const len = parent._parents.length;
    for (var i = 0; i < len; i++) {
      detach(parent._parents[i], parent);
    }
    parent._parents = null;
    parent._state = DISCONNECTED;
  }
}

export function derivation (deriver) {
  return new Derivation(deriver);
}
