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
  reactorss.forEach(processReactors);
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
      if (done) throw new Error('trying to use ticker after release');
      commitTransaction();
      beginTransaction();
    },
    reset: function () {
      if (done) throw new Error('trying to use ticker after release');
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

export function processReactors(reactors, throwing) {
  for (var i = 0; i < reactors.length;) {
    var r = reactors[i];
    if (r._reacting && throwing === true) {
      throw new Error('cyclical update detected!');
    } else {
      r._maybeReact();
    }
    // maybe this reactor or another one to the left was sliced away
    if (r === reactors[i]) {
      i++;
    }
  }
}
