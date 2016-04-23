var TransactionAbortion = {};

function initiateAbortion() {
  throw TransactionAbortion;
}

function TransactionContext(parent) {
  this.parent = parent;
  this.id2txnAtom = {};
  this.globalEpoch = epoch_globalEpoch;
  this.modifiedAtoms = [];
}

var transactions_currentCtx = null;

function transactions_inTransaction () {
  return transactions_currentCtx !== null;
}

function transactions_transact (f) {
  beginTransaction();
  try {
    f.call(null, initiateAbortion);
  }
  catch (e) {
    abortTransaction();
    if (e !== TransactionAbortion) {
      throw e;
    }
    return;
  }
  commitTransaction();
}

function beginTransaction() {
  transactions_currentCtx = new TransactionContext(transactions_currentCtx);
}

function commitTransaction() {
  var ctx = transactions_currentCtx;
  transactions_currentCtx = ctx.parent;
  var reactorss = [];
  ctx.modifiedAtoms.forEach(function (a) {
    if (transactions_currentCtx !== null) {
      a.set(ctx.id2txnAtom[a.id].value);
    }
    else {
      a._set(ctx.id2txnAtom[a.id].value);
      reactorss.push(a.reactors);
    }
  });
  if (transactions_currentCtx === null) {
    epoch_globalEpoch = ctx.globalEpoch;
  } else {
    transactions_currentCtx.globalEpoch = ctx.globalEpoch;
  }
  reactorss.forEach(function (reactors) {
    reactors.forEach(function (r) {
      r.maybeReact();
    });
  });
}

function abortTransaction() {
  var ctx = transactions_currentCtx;
  transactions_currentCtx = ctx.parent;
  if (transactions_currentCtx === null) {
    epoch_globalEpoch = ctx.globalEpoch + 1;
  }
  else {
    transactions_currentCtx.globalEpoch = ctx.globalEpoch + 1;
  }
}

function transactions_ticker () {
  beginTransaction();
  var disposed = false;
  return {
    tick: function () {
      if (disposed) throw new Error("can't tick disposed ticker");
      commitTransaction();
      beginTransaction();
    },
    stop: function () {
      if (disposed) throw new Error("ticker already disposed");
      disposed = true;
      commitTransaction();
    },
    resetState: function () {
      if (disposed) throw new Error("ticker already disposed");
      abortTransaction();
      beginTransaction();
    }
  }
}
