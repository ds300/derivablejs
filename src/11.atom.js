function processReactionQueue (rq) {
  for (var i = rq.length; i--;) {
    reactions_maybeReact(rq[i]);
  }
}

var TXN_CTX = transactions_newContext();

var NOOP_ARRAY = {push: function () {}};

function TransactionState () {
  this.inTxnValues = {};
  this.reactionQueue = [];
}

function getState (txnState, atom) {
  var inTxnValue = txnState.inTxnValues[atom._uid];
  if (inTxnValue) {
    return inTxnValue[1];
  } else {
    return atom._value;
  }
}

function setState (txnState, atom, state) {
  txnState.inTxnValues[atom._uid] = [atom, state];
  gc_mark(atom, txnState.reactionQueue);
}

util_extend(TransactionState.prototype, {
  onCommit: function () {
    var i, atomValueTuple;
    var keys = util_keys(this.inTxnValues);
    if (transactions_inTransaction(TXN_CTX)) {
      // push in-txn vals up to current txn
      for (i = keys.length; i--;) {
        atomValueTuple = this.inTxnValues[keys[i]];
        atomValueTuple[0].set(atomValueTuple[1]);
      }
    } else {
      // change root state and run reactions.
      for (i = keys.length; i--;) {
        atomValueTuple = this.inTxnValues[keys[i]];
        atomValueTuple[0]._value = atomValueTuple[1];
        gc_mark(atomValueTuple[0], NOOP_ARRAY);
      }

      processReactionQueue(this.reactionQueue);

      // then sweep for a clean finish
      for (i = keys.length; i--;) {
        gc_sweep(this.inTxnValues[keys[i]][0]);
      }
    }
  },

  onAbort: function () {
    if (!transactions_inTransaction(TXN_CTX)) {
      var keys = util_keys(this.inTxnValues);
      for (var i = keys.length; i--;) {
        gc_abort_sweep(this.inTxnValues[keys[i]][0]);
      }
    }
  }
})


function atom_createPrototype (havelock, opts) {
  return {
    _clone: function () {
      return havelock.atom(this._value);
    },

    withValidator: function (f) {
      if (f === null) {
        return this._clone();
      } if (typeof f === 'function') {
        var result = this._clone();
        var existing = this._validator;
        if (existing) {
          result._validator = function (x) { return f(x) && existing(x); }
        } else {
          result._validator = f;
        }
        return result;
      } else {
        throw new Error(".withValidator expects function or null");
      }
    },

    validate: function () {
      this._validate(this.get());
    },

    _validate: function (value) {
      var validationResult = this._validator && this._validator(value);
      if (this._validator && validationResult !== true) {
        throw new Error("Failed validation with value: '" + value + "'." +
                        " Validator returned '" + validationResult + "' ");
      }
    },

    set: function (value) {

      this._validate(value);
      if (!opts.equals(value, this._value)) {
        this._state = gc_CHANGED;

        if (transactions_inTransaction(TXN_CTX)) {
          setState(transactions_currentTransaction(TXN_CTX), this, value);
        } else {
          this._value = value;

          var reactionQueue = [];
          gc_mark(this, reactionQueue);
          processReactionQueue(reactionQueue);
          gc_sweep(this);
        }
      }
      return this;
    },

    _get: function () {
      if (transactions_inTransaction(TXN_CTX)) {
        return getState(transactions_currentTransaction(TXN_CTX), this);
      }
      return this._value;
    }
  };
}

function atom_construct (atom, value) {
  atom._uid = util_nextId();
  atom._children = [];
  atom._state = gc_STABLE;
  atom._value = value;
  atom._type = types_ATOM;
  return atom;
}

function atom_transact (f) {
  transactions_transact(TXN_CTX, new TransactionState(), f);
}

function atom_transaction (f) {
  return function () {
    var args = util_slice(arguments, 0);
    var that = this;
    var result;
    atom_transact(function () {
      result = f.apply(that, args);
    });
    return result;
  }
}
