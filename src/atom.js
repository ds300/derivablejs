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
        // we are in a transaction!
        var inTxnThis = transactions.currentCtx.id2txnAtom[this._id];
        if (inTxnThis != null) {
          // we already have an in-txn verison of this atom, so update that
          if (!this.__equals(value, inTxnThis._value)) {
            inTxnThis._epoch++;
            transactions.currentCtx.globalEpoch++;
          }
          inTxnThis._value = value;
        } else {
          // look for other versions of this atom in higher txn layers
          var txnCtx = transactions.currentCtx.parent;
          while (txnCtx !== null) {
            inTxnThis = txnCtx.id2txnAtom[this._id];
            if (inTxnThis !== void 0) {
              // create new in-txn atom for this layer if need be
              if (!this.__equals(inTxnThis._value, value)) {
                var newInTxnThis = inTxnThis._clone();
                newInTxnThis._id = this._id;
                newInTxnThis._value = value;
                newInTxnThis._epoch = inTxnThis._epoch + 1;
                transactions.currentCtx.globalEpoch++;
                transactions.currentCtx.id2txnAtom[this._id] = newInTxnThis;
                util.addToArray(transactions.currentCtx.modifiedAtoms, this);
              }
              return;
            } else {
              txnCtx = txnCtx.parent;
            }
          }
          // no in-txn versions of this atom yet;
          transactions.currentCtx.globalEpoch++;
          inTxnThis = this._clone();
          inTxnThis._value = value;
          inTxnThis._id = this._id;
          inTxnThis._epoch = this._epoch + 1;
          transactions.currentCtx.id2txnAtom[this._id] = inTxnThis;
          util.addToArray(transactions.currentCtx.modifiedAtoms, this);
        }
      } else {
        // not in a transaction
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
