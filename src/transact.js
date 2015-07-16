/**
 *  Copyright (c) 2015, David Sheldrick.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

 import { symbolValues } from './util'

let CURRENT_TXN = null;

export function inTransaction () {
  return CURRENT_TXN !== null;
}

export function setInTransactionState (atom, value) {
  CURRENT_TXN.inTxnValues[atom._id] = [atom, value];
}

export function getInTransactionState (atom) {
  let inTxnValue = CURRENT_TXN[atom._id];
  if (inTxnValue) {
    return inTxnValue[1];
  } else {
    return atom.get();
  }
}

const RUNNING = Symbol("running"),
      COMPLETED = Symbol("completed"),
      ABORTED = Symbol("aborted");

class Transaction {
  constructor () {
    this.parent = CURRENT_TXN;
    CURRENT_TXN = this;
    this.reactionQueue = [];
    this.state = RUNNING;
    this.inTxnValues = {};
  }

  assertState (state, failMsg) {
    if (this.state !== state) {
      throw new Error(failMsg);
    }
  }

  commit () {
    this.assertState(RUNNING, "Must be in running state to commit transaction");

    CURRENT_TXN = this.parent;

    if (inTxn()) {
      // push in-txn vals up to current txn
      for (let {atom, value} of symbolValues(this.inTxnValues)) {
        atom.set(value);
      }
    } else {
      // change root state and run reactions.
      for (let {atom, value} of symbolValues(this.inTxnValues)) {
        atom._state = value;
      }

      processReactionQueue(this.reactionQueue);

      // then sweep for a clean finish
      for (let {atom} of symbolValues(this.inTxnValues)) {
        atom._color = WHITE;
        atom._sweep();
      }
    }

    this.state = COMPLETED;

    delete this.reactionQueue;
    delete this.inTxnValues;
  }

  abort () {
    this.assertState(RUNNING, "Must be in running state to abort transaction");

    CURRENT_TXN = this.parent;

    if (!inTxn()) {
      for (let {atom} of symbolValues(this.inTxnValues)) {
        atom._color = WHITE;
        atom._sweep();
      }
    }

    delete this.inTxnValues;
    delete this.reactionQueue;

    this.state = ABORTED;
  }
}

class TransactionFailedException {}

export function abortTransaction() {
  throw new TransactionFailedException();
}

Ratom.abortTransaction = abortTransaction;

/**
 * Runs f in a transaction. f should be synchronous
 */
export function transact (f) {
  let txn = new Transaction();
  let abortion = false;
  try {
    f()
  } catch (e) {
    txn.abort();
    abortion = true;
    if (!(e instanceof TransactionFailedException)) {
      throw e;
    }
  } finally {
    !abortion && txn.commit();
  }
};

Ratom.transact = transact;
