var RUNNING = 0,
    COMPLETED = 1,
    ABORTED = 3;

var TransactionAbortion = {};

function abortTransaction() {
  throw TransactionAbortion;
}

function transactions_newContext () {
  return {currentTxn: null};
}

function transactions_inTransaction (ctx) {
  return ctx.currentTxn !== null;
}

function transactions_currentTransaction (ctx) {
  return ctx.currentTxn;
}

function begin (ctx, txn) {
  txn._parent = ctx.currentTxn;
  txn._state = RUNNING;
  ctx.currentTxn = txn;
}

function popTransaction (ctx, cb) {
  var txn = ctx.currentTxn;
  ctx.currentTxn = txn._parent;
  if (txn._state !== RUNNING) {
    throw new Error("unexpected state: " + txn._state);
  }
  cb(txn);
}

function commit (ctx) {
  popTransaction(ctx, function (txn) {
    txn._state = COMPLETED;
    txn.onCommit && txn.onCommit();
  });
}

function abort (ctx) {
  popTransaction(ctx, function (txn) {
    txn._state = ABORTED;
    txn.onAbort && txn.onAbort();
  });
}

function transactions_transact (ctx, txn, f) {
  begin(ctx, txn);
  try {
    f(abortTransaction);
  } catch (e) {
    abort(ctx);
    if (e !== TransactionAbortion) {
      throw e;
    } else {
      return;
    }
  }
  commit(ctx);
}
