import * as util from './util';
import * as parents from './parents';
import * as transactions from './transactions';
import epoch from './epoch';
import * as types from './types';

export function createPrototype (D, opts) {
  return {
    _clone: function () {
      return util.setEquals(D.derivation(this._deriver), this._equals);
    },

    _forceEval: function () {
      var that = this;
      var newVal = null;
      var capturedParentsEpochs = parents.capturingParentsEpochs(function () {
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
      });

      if (!this.__equals(newVal, this._value)) {
        this._epoch++;
      }

      if (this._refCount > 0) {
        var i = 0, j = 0;
        var oldLen = this._lastParentsEpochs.length;
        var newLen = capturedParentsEpochs.length;

        while (i < oldLen && j < newLen) {
          if (this._lastParentsEpochs[i] !== capturedParentsEpochs[j]) {
            break;
          } else {
            i += 2;
            j += 2;
          }
        }

        while (i < oldLen) {
          util.removeFromArray(this._lastParentsEpochs[i]._activeChildren, this);
          this._lastParentsEpochs[i]._unlisten();
          i += 2;
        }

        while (j < newLen) {
          util.addToArray(capturedParentsEpochs[j]._activeChildren, this);
          capturedParentsEpochs[j]._listen();
          j += 2;
        }
      }

      this._lastParentsEpochs = capturedParentsEpochs;
      this._value = newVal;
    },

    _update: function () {
      var globalEpoch = transactions.currentCtx === null ?
                         epoch.globalEpoch :
                         transactions.currentCtx.globalEpoch;
      if (this._lastGlobalEpoch !== globalEpoch) {
        if (this._value === util.unique) {
          // brand spanking new, so force eval
          this._forceEval();
        } else {
          for (var i = 0, len = this._lastParentsEpochs.length; i < len; i += 2) {
            var parent_1 = this._lastParentsEpochs[i];
            var lastParentEpoch = this._lastParentsEpochs[i + 1];
            var currentParentEpoch;
            if (parent_1._type === types.ATOM) {
              currentParentEpoch = parent_1._getEpoch();
            } else {
              parent_1._update();
              currentParentEpoch = parent_1._epoch;
            }
            if (currentParentEpoch !== lastParentEpoch) {
              this._forceEval();
              return;
            }
          }
        }
        this._lastGlobalEpoch = globalEpoch;
      }
    },

    get: function () {
      var idx = parents.captureParent(this);
      this._update();
      parents.captureEpoch(idx, this._epoch);
      return this._value;
    },

    _listen: function () {
      this._refCount++;
      for (var i = 0, len = this._lastParentsEpochs.length; i < len; i += 2) {
        var parent = this._lastParentsEpochs[i];
        if (this._refCount === 1) {
          // any compiler worth its salt will hoist this check of the loop
          util.addToArray(parent._activeChildren, this);
        }
        parent._listen();
      }
    },

    _unlisten: function () {
      this._refCount--;
      for (var i = 0, len = this._lastParentsEpochs.length; i < len; i += 2) {
        var parent = this._lastParentsEpochs[i];
        if (this._refCount === 0) {
          // any compiler worth its salt will hoist this check of the loop
          util.removeFromArray(parent._activeChildren, this);
        }
        parent._unlisten();
      }
    },
  };
};

export function construct (obj, deriver) {
  obj._deriver = deriver;
  obj._lastParentsEpochs = [];
  obj._lastGlobalEpoch = epoch.globalEpoch - 1;
  obj._epoch = 0;
  obj._type = types.DERIVATION;
  obj._value = util.unique;
  obj._equals = null;
  obj._activeChildren = [];
  obj._refCount = 0;

  if (util.DEBUG_MODE) {
    obj.stack = Error().stack;
  }

  return obj;
};
