/**
 *  Copyright (c) 2015, David Sheldrick.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { symbolValues, extend } from './util'

const RUNNING = Symbol("running"),
      COMPLETED = Symbol("completed"),
      ABORTED = Symbol("aborted");

const $parent = Symbol("parent_txn");
const $state = Symbol("txn_value");

export class TransactionContext {
  constructor () {
    this.currentTxn = null;
  }
  inTransaction () {
    return this.currentTxn != null;
  }
  currentTransaction () {
    return this.currentTxn;
  }
  _begin (txn) {
    txn[$parent] = this.currentTxn;
    txn[$state] = RUNNING;
    this.currentTxn = txn;
  }
  _popTransaction (name, cb) {
    let txn = this.currentTxn;
    this.currentTxn = txn[$parent];
    if (txn[$state] !== RUNNING) {
      throw new Error(`Must be in state 'RUNNING' to ${name} transaction.`
                     + ` Was in state ${txn[$state]}.`);
    }
    cb(txn);
  }
  _commit () {
    this._popTransaction("commit", txn => {
      txn[$state] = COMPLETED;
      txn.onCommit && txn.onCommit();
    });
  }
  _abort () {
    this._popTransaction("abort", txn => {
      txn[$state] = ABORTED;
      txn.onAbort && txn.onAbort();
    });
  }

  transact (txn, f) {
    this._begin(txn);
    try {
      f(abortTransaction);
      this._commit();
    } catch (e) {
      this._abort();
      if (e !== TransactionAbortion) {
        throw e;
      }
    }
  }
}

const TransactionAbortion = Symbol("abort that junk yo");

function abortTransaction() {
  throw TransactionAbortion;
}
