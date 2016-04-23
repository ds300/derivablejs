function derivation_createPrototype (D, opts) {
  return {
    _clone: function () {
      return util_setEquals(D.derivation(this._deriver), this._equals);
    },

    _forceEval: function () {
      var that = this;
      var newVal = null;
      var parents = parents_capturingParentsEpochs(function () {
        if (!util_DEBUG_MODE) {
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

      this._lastParentsEpochs = parents;
      this._value = newVal;
    },

    _update: function () {
      if (this._lastGlobalEpoch !== epoch_globalEpoch) {
        if (this._cache === util_unique) {
          // brand spanking new, so force eval
          this._forceEval();
        } else {
          for (var i = 0, len = this._lastParentsEpochs.length; i < len; i += 2) {
            var parent_1 = this._lastParentsEpochs[i];
            var lastParentEpoch = this._lastParentsEpochs[i + 1];
            parent_1._update();
            if (parent_1.epoch !== lastParentEpoch) {
              this._forceEval();
              return;
            }
          }
          this._lastGlobalEpoch = epoch_globalEpoch;
        }
      }
    },

    get: function () {
      var idx = parents_captureParent(this);
      this._update();
      parents_captureEpoch(idx, this.epoch);
      return this._value;
    },
  };
}

function derivation_construct(obj, deriver) {
  obj._deriver = deriver;
  obj._lastParentsEpochs = [];
  obj._lastGlobalEpoch = epoch_globalEpoch - 1;
  obj._epoch = 0;
  obj._type = types_DERIVATION;
  obj._value = util_unique;
  obj._equals = null;

  if (util_DEBUG_MODE) {
    obj.stack = Error().stack;
  }

  return obj;
}
