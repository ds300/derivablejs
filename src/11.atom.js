function atom_createPrototype (D, opts) {
  return {
    _clone: function () {
      return util_setEquals(D.atom(this._value), this._equals);
    },

    set: function (value) {

      if (transactions_currentCtx !== null) {
        var inTxnThis = void 0;
        if ((inTxnThis = transactions_currentCtx.id2txnAtom[this.id]) !== void 0 &&
            value !== inTxnThis._value) {
          transactions_currentCtx.globalEpoch++;
          inTxnThis._epoch++;
          inTxnThis._value = value;
        } else if (value !== this._value) {
          transactions_currentCtx.globalEpoch++;
          inTxnThis = this._clone(value);
          inTxnThis._epoch = this._epoch + 1;
          transactions_currentCtx.id2txnAtom[this._id] = inTxnThis;
          util_addToArray(transactions_currentCtx.modifiedAtoms, this);
        }
      } else {
        if (!this.__equals(value, this._value)) {
          this._set(value);
          this.reactors.forEach(function (r) { return r.maybeReact(); });
        }
      }
    },

    _update: function () {},

    _set: function (value) {
      epoch_globalEpoch++;
      this._epoch++;
      this._value = value;
    },

    get: function () {
      var inTxnThis;
      var txnCtx = transactions_currentCtx;
      while (txnCtx !== null) {
          inTxnThis = txnCtx.id2txnAtom[this._id];
          if (inTxnThis !== void 0) {
              parents_captureEpoch(parents_captureParent(inTxnThis), inTxnThis._epoch);
              return inTxnThis._value;
          }
          else {
              txnCtx = txnCtx.parent;
          }
      }
      parents_captureEpoch(parents_captureParent(this), this._epoch);
      return this.value;
    },
  };
}

function atom_construct (atom, value) {
  atom._id = util_nextId();
  atom._reactors = [];
  atom._epoch = 0;
  atom._value = value;
  atom._type = types_ATOM;
  atom._equals = null;
  return atom;
}

function atom_transaction (f) {
  return function () {
    var args = util_slice(arguments, 0);
    var that = this;
    var result;
    transactions_transact(function () {
      result = f.apply(that, args);
    });
    return result;
  }
}

var ticker = null;

function atom_ticker () {
  if (ticker) {
    ticker.refCount++;
  } else {
    ticker = transactions_ticker();
    ticker.refCount = 1;
  }
  var done = false;
  return {
    tick: function () {
      if (done) throw new Error('tyring to use ticker after release');
      ticker.tick();
    },
    release: function () {
      if (done) throw new Error('ticker already released');
      if (--ticker.refCount === 0) {
        ticker.stop();
        ticker = null;
      }
      done = true;
    },
  };
}
