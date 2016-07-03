import * as util from './util';
import * as parents from './parents';
import * as transactions from './transactions';
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
    var newNumParents;

    try {
      if (this._parents === null) {
        this._parents = [];
      }
      parents.startCapturingParents(this, this._parents);
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
      newNumParents = parents.retrieveParentsFrame().offset;
    } finally {
      parents.stopCapturingParents();
    }

    if (!this.__equals(newVal, this._value)) {
      this._state = CHANGED;
    } else {
      this._state = UNCHANGED;
    }

    while (newNumParents < this._parents.length) {
      var oldParent = this._parents[newNumParents++];
      detach(oldParent, this);
    }

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
      this._state === UNCHANGED;
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
    var len = parent._parents.length;
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
