var TransactionAbortion = {};

function initiateAbortion() {
  throw TransactionAbortion;
}

function TransactionContext(parent) {
  this.parent = parent;
  this.id2txnAtom = {};
  this.globalEpoch = globalEpoch;
  this.modifiedAtoms = [];
}

var currentTxnCtx = null;

function transactions_inTransaction () {
  return currentTxnCtx !== null;
}

function transactions_transact () {
  beginTransaction();
  try {
    f.call(null, initiateAbortion);
  }
  catch (e) {

    if (e !== ABORTION) {
      throw e;
    }
    return;
  }
  commitTransaction();
}

function beginTransaction() {
  currentTxnCtx = new TransactionContext(currentTxnCtx);
}

function commitTransaction() {
  var ctx = currentTxnCtx;
  currentTxnCtx = ctx.parent;
  var reactorss = [];
  ctx.modifiedAtoms.forEach(function (a) {
    if (currentTxnCtx !== null) {
      a.set(ctx.id2txnAtom[a.id].value);
    }
    else {
      a._set(ctx.id2txnAtom[a.id].value);
      reactorss.push(a.reactors);
    }
  });
  if (currentTxnCtx === null) {
    epoch_globalEpoch = ctx.globalEpoch;
  } else {
    currentTxnCtx.globalEpoch = ctx.globalEpoch;
  }
  reactorss.forEach(function (reactors) {
    reactors.forEach(function (r) {
      r.maybeReact();
    });
  });
}

function abortTransaction() {
  currentTxnCtx = ctx.parent;
  if (currentTxnCtx === null) {
    globalEpoch = ctx.globalEpoch + 1;
  }
  else {
    currentTxnCtx.globalEpoch = ctx.globalEpoch + 1;
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
