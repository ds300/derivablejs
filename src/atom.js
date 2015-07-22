/**
 *  Copyright (c) 2015, David Sheldrick.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { TransactionContext } from './transact'
import { symbolValues } from './util'
import { ATOM, CHANGED, STABLE, mark, sweep } from './gc'
import Set from './set'


let inReactCycle = false;

function processReactionQueue (rq) {
  inReactCycle = true;
  rq.forEach(r => r.maybeReact());
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
      return atom._value;
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
        atom._value = value;
        mark(atom, NOOP_ARRAY);
      }

      processReactionQueue(this.reactionQueue);

      // then sweep for a clean finish
      for (let [atom,] of symbolValues(this.inTxnValues)) {
        sweep(atom);
      }
    }
  }

  onAbort () {
    if (!TXN_CTX.inTransaction()) {
      for (let [atom,] of symbolValues(this.inTxnValues)) {
        sweep(atom);
      }
    }
  }
}

export function createAtomPrototype (havelock, {equals}) {
  return {
    _clone () {
      return havelock.atom(this._value);
    },

    withValidator (f) {
      if (f === null) {
        return this._clone();
      } if (typeof f === 'function') {
        let result = this._clone();
        let existing = this._validator;
        if (existing) {
          result._validator = x => f(x) && existing(x)
        } else {
          result._validator = f;
        }
        return result;
      } else {
        throw new Error(".withValidator expects function or null");
      }
    },

    validate () {
      this._validate(this.get());
    },

    _validate (value) {
      let validationResult = this._validator && this._validator(value);
      if (this._validator && validationResult !== true) {
        throw new Error(`Failed validation with value: '${value}'.` +
                        ` Validator returned '${validationResult}' `);
      }
    },

    set (value) {
      if (inReactCycle) {
        throw new Error("Trying to set atom state during reaction phase. This" +
                        " is an error. Use middleware for cascading changes.");
      }
      this._validate(value);
      if (!equals(value, this._value)) {
        this._state = CHANGED;

        if (TXN_CTX.inTransaction()) {
          TXN_CTX.currentTransaction().setState(this, value);
        } else {
          this._value = value;

          let reactionQueue = [];
          mark(this, reactionQueue);
          processReactionQueue(reactionQueue);
          sweep(this);
        }
      }
      return value;
    },

    _get () {
      if (TXN_CTX.inTransaction()) {
        return TXN_CTX.currentTransaction().getState(this);
      }
      return this._value;
    }
  };
}

export function constructAtom (atom, value) {
  atom._uid = Symbol("my_uid");
  atom._children = new Set();
  atom._state = STABLE;
  atom._value = value;
  atom._type = ATOM;
  return atom;
}

export function transact (f) {
  TXN_CTX.transact(new AtomicTransactionState(), f);
}
