import epoch from './epoch';
import * as util from './util';

var TransactionAbortion = {};

function initiateAbortion() {
  throw TransactionAbortion;
}

function TransactionContext(parent) {
  this.parent = parent;
  this.id2txnAtom = {};
  this.globalEpoch = epoch.globalEpoch;
  this.modifiedAtoms = [];
}

export var currentCtx = null;

export function inTransaction () {
  return currentCtx !== null;
};

export function transact (f) {
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
};

export function transaction (f) {
  return function () {
    var args = util.slice(arguments, 0);
    var that = this;
    var result;
    transact(function () {
      result = f.apply(that, args);
    });
    return result;
  };
};

function beginTransaction() {
  currentCtx = new TransactionContext(currentCtx);
}

function commitTransaction() {
  var ctx = currentCtx;
  currentCtx = ctx.parent;
  var reactorss = [];
  ctx.modifiedAtoms.forEach(function (a) {
    if (currentCtx !== null) {
      a.set(ctx.id2txnAtom[a._id]._value);
    }
    else {
      a._set(ctx.id2txnAtom[a._id]._value);
      reactorss.push(a._reactors);
    }
  });
  if (currentCtx === null) {
    epoch.globalEpoch = ctx.globalEpoch;
  } else {
    currentCtx.globalEpoch = ctx.globalEpoch;
  }
  reactorss.forEach(function (reactors) {
    reactors.forEach(function (r) {
      r._maybeReact();
    });
  });
}

function abortTransaction() {
  var ctx = currentCtx;
  currentCtx = ctx.parent;
  if (currentCtx === null) {
    epoch.globalEpoch = ctx.globalEpoch + 1;
  }
  else {
    currentCtx.globalEpoch = ctx.globalEpoch + 1;
  }
}

var _tickerRefCount = 0;

export function ticker () {
  if (_tickerRefCount === 0) {
    beginTransaction();
  }
  _tickerRefCount++;
  var done = false;
  return {
    tick: function () {
      if (done) throw new Error('tyring to use ticker after release');
      commitTransaction();
      beginTransaction();
    },
    reset: function () {
      if (done) throw new Error('tyring to use ticker after release');
      abortTransaction();
      beginTransaction();
    },
    release: function () {
      if (done) throw new Error('ticker already released');
      _tickerRefCount--;
      done = true;
      if (_tickerRefCount === 0) {
        commitTransaction();
      }
    },
  };
};
