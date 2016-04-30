import * as util from './util';
import * as transactions from './transactions';
import epoch from './epoch';
import * as parents from './parents';
import * as types from './types';

export function createPrototype (D, opts) {
  return {
    _clone: function () {
      return util.setEquals(D.atom(this._value), this._equals);
    },

    set: function (value) {
      if (transactions.currentCtx !== null) {
        var inTxnThis = void 0;
        if ((inTxnThis = transactions.currentCtx.id2txnAtom[this._id]) !== void 0 &&
            value !== inTxnThis._value) {
          transactions.currentCtx.globalEpoch++;
          inTxnThis._epoch++;
          inTxnThis._value = value;
        } else if (!this.__equals(value, this._value)) {
          transactions.currentCtx.globalEpoch++;
          inTxnThis = this._clone();
          inTxnThis._value = value;
          inTxnThis._id = this._id;
          inTxnThis._epoch = this._epoch + 1;
          transactions.currentCtx.id2txnAtom[this._id] = inTxnThis;
          util.addToArray(transactions.currentCtx.modifiedAtoms, this);
        }
      } else {
        if (!this.__equals(value, this._value)) {
          this._set(value);
          this._reactors.forEach(function (r) { return r._maybeReact(); });
        }
      }
    },

    _set: function (value) {
      epoch.globalEpoch++;
      this._epoch++;
      this._value = value;
    },

    get: function () {
      var inTxnThis;
      var txnCtx = transactions.currentCtx;
      while (txnCtx !== null) {
        inTxnThis = txnCtx.id2txnAtom[this._id];
        if (inTxnThis !== void 0) {
          parents.captureEpoch(parents.captureParent(this), inTxnThis._epoch);
          return inTxnThis._value;
        }
        else {
          txnCtx = txnCtx.parent;
        }
      }
      parents.captureEpoch(parents.captureParent(this), this._epoch);
      return this._value;
    },

    _getEpoch: function () {
      var inTxnThis;
      var txnCtx = transactions.currentCtx;
      while (txnCtx !== null) {
        inTxnThis = txnCtx.id2txnAtom[this._id];
        if (inTxnThis !== void 0) {
          return inTxnThis._epoch;
        }
        else {
          txnCtx = txnCtx.parent;
        }
      }
      return this._epoch;
    },
  };
};

export function construct (atom, value) {
  atom._id = util.nextId();
  atom._reactors = [];
  atom._epoch = 0;
  atom._value = value;
  atom._type = types.ATOM;
  atom._equals = null;
  return atom;
};

export function transaction (f) {
  return function () {
    var args = util.slice(arguments, 0);
    var that = this;
    var result;
    transactions.transact(function () {
      result = f.apply(that, args);
    });
    return result;
  };
};

var _ticker = null;

export function ticker () {
  if (_ticker) {
    _ticker.refCount++;
  } else {
    _ticker = transactions.ticker();
    _ticker.refCount = 1;
  }
  var done = false;
  return {
    tick: function () {
      if (done) throw new Error('tyring to use ticker after release');
      _ticker.tick();
    },
    release: function () {
      if (done) throw new Error('ticker already released');
      if (--_ticker.refCount === 0) {
        _ticker.stop();
        _ticker = null;
      }
      done = true;
    },
  };
};
