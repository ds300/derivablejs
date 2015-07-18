/**
 *  Copyright (c) 2015, David Sheldrick.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { TransactionContext, runTransaction } from './transact'
import { symbolValues } from './util'
import { ATOM, CHANGED, STABLE, mark, sweep } from './gc'
import Set from './set'


let inReactCycle = false;

function processReactionQueue (rq) {
  inReactCycle = true;
  rq.forEach(r => r._maybeReact());
  inReactCycle = false;
}

const TXN_CTX = new TransactionContext();

const NOOP_ARRAY = {push () {}};

class AtomicTransactionState {
  constructor () {
    this.inTxnValues = {};
    this.reactionQueue = [];
  }

  getState (atom) {
    let inTxnValue = this.inTxnValues[atom._uid];
    if (inTxnValue) {
      return inTxnValue[1];
    } else {
      return atom._state;
    }
  }

  setState (atom, state) {
    this.inTxnValues[atom._uid] = [atom, state];
    mark(atom, this.reactionQueue);
  }

  onCommit () {
    if (TXN_CTX.inTransaction()) {
      // push in-txn vals up to current txn
      for (let [atom, value] of symbolValues(this.inTxnValues)) {
        atom.set(value);
      }
    } else {
      // change root state and run reactions.
      for (let [atom, value] of symbolValues(this.inTxnValues)) {
        atom._state = value;
        mark(atom, NOOP_ARRAY);
      }

      processReactionQueue(this.reactionQueue);

      // then sweep for a clean finish
      for (let [atom, _] of symbolValues(this.inTxnValues)) {
        atom._mode = STABLE;
        sweep(atom)
      }
    }
  }

  onAbort () {
    if (!TXN_CTX.inTransaction()) {
      for (let [atom, _] of symbolValues(this.inTxnValues)) {
        atom._mode = STABLE;
        sweep(atom);
      }
    }
  }
}

export function createAtomPrototype (havelock, {equals}) {
  return {
    _clone () {
      return havelock.atom(this._state);
    },

    _type: ATOM,

    set (value) {
      if (inReactCycle) {
        throw new Error("Trying to set atom state during reaction phase. This is"
                        + " an error. Use middleware for cascading changes.");
      }
      this._validate(value);
      if (!equals(value, this._state)) {
        this._mode = CHANGED;

        if (TXN_CTX.inTransaction()) {
          TXN_CTX.currentTransaction().setState(this, value);
        } else {
          this._state = value;

          let reactionQueue = [];
          mark(this, reactionQueue);
          processReactionQueue(reactionQueue);
          sweep(this);

          this._mode = STABLE;
        }
      }
      return value;
    },

    _get () {
      if (TXN_CTX.inTransaction()) {
        return TXN_CTX.currentTransaction().getState(this);
      }
      return this._state;
    }
  };
}

export function constructAtom (atom, value) {
  atom._uid = Symbol("my_uid");
  atom._children = new Set();
  atom._mode = STABLE;
  atom._state = value;
  return atom;
}

export function transact (f) {
  TXN_CTX.transact(new AtomicTransactionState(), f);
}
