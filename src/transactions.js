import * as util from './util';
import {DERIVATION, PROXY, REACTOR} from './types';
import {UNKNOWN, UNCHANGED, CHANGED} from './states';

export function mark (node, reactors) {
  for (var i = 0, len = node._activeChildren.length; i < len; i++) {
    var child = node._activeChildren[i];
    switch (child._type) {
      case DERIVATION:
      case PROXY:
        if (child._state !== UNKNOWN) {
          child._state = UNKNOWN;
          mark(child, reactors);
        }
        break;
      case REACTOR:
        reactors.push(child);
        break;
    }
  }
}

export function processReactors (reactors) {
  for (var i = 0, len = reactors.length; i < len; i++) {
    var r = reactors[i];
    if (r._reacting) {
      throw new Error("Synchronous cyclical reactions disallowed. " +
                      "Use setImmediate.");
    }
    r._maybeReact();
  }
}

var TransactionAbortion = {};

function initiateAbortion() {
  throw TransactionAbortion;
}

function TransactionContext(parent) {
  this.parent = parent;
  this.id2originalValue = {};
  this.modifiedAtoms = [];
}

export function maybeTrack (atom) {
  if (currentCtx !== null) {
    if (!(atom._id in currentCtx.id2originalValue)) {
      currentCtx.modifiedAtoms.push(atom);
      currentCtx.id2originalValue[atom._id] = atom._value;
    }
  }
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

export function atomically (f) {
  if (!inTransaction()) {
    transact(f);
  } else {
    f();
  }
}

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

export function atomic (f) {
  return function () {
    var args = util.slice(arguments, 0);
    var that = this;
    var result;
    atomically(function () {
      result = f.apply(that, args);
    });
    return result;
  };
}

function beginTransaction() {
  currentCtx = new TransactionContext(currentCtx);
}

function commitTransaction() {
  var ctx = currentCtx;
  currentCtx = ctx.parent;

  if (currentCtx === null) {
    var reactors = [];
    ctx.modifiedAtoms.forEach(function (a) {
      if (a.__equals(a._value, ctx.id2originalValue[a._id])) {
        a._state = UNCHANGED;
      } else {
        a._state = CHANGED;
        mark(a, reactors);
      }
    });
    processReactors(reactors);
    ctx.modifiedAtoms.forEach(function (a) {
      a._state = UNCHANGED;
    });
  }
}

function abortTransaction() {
  var ctx = currentCtx;
  currentCtx = ctx.parent;
  ctx.modifiedAtoms.forEach(function (atom) {
    atom._value = ctx.id2originalValue[atom._id];
    atom._state = UNCHANGED;
    mark(atom, []);
  });
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
