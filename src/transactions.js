import * as util from "./util.js";
import { DERIVATION, LENS, REACTOR } from "./types";
import { UNKNOWN, UNCHANGED, CHANGED } from "./states";

export function mark(node, reactors) {
  for (let i = 0, len = node._activeChildren.length; i < len; i++) {
    const child = node._activeChildren[i];
    switch (child._type) {
      case DERIVATION:
      case LENS:
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

export function processReactors(reactors) {
  for (let i = 0, len = reactors.length; i < len; i++) {
    const r = reactors[i];
    if (r._reacting) {
      throw Error(
        "Synchronous cyclical reactions disallowed. " + "Use setImmediate."
      );
    }
    r._maybeReact();
  }
}

const TransactionAbortion = {};

function initiateAbortion() {
  throw TransactionAbortion;
}

function TransactionContext(parent) {
  this.parent = parent;
  this.id2originalValue = {};
  this.modifiedAtoms = [];
}

export function maybeTrack(atom) {
  if (currentCtx !== null) {
    if (!(atom._id in currentCtx.id2originalValue)) {
      currentCtx.modifiedAtoms.push(atom);
      currentCtx.id2originalValue[atom._id] = atom._value;
    }
  }
}

export let currentCtx = null;

export function inTransaction() {
  return currentCtx !== null;
}

export function transact(f) {
  beginTransaction();
  try {
    f(initiateAbortion);
  } catch (e) {
    abortTransaction();
    if (e !== TransactionAbortion) {
      throw e;
    }
    return;
  }
  commitTransaction();
}

export function atomically(f) {
  if (!inTransaction()) {
    transact(f);
  } else {
    f();
  }
}

export function transaction(f) {
  return (...args) => {
    let result;
    transact(() => {
      result = f(...args);
    });
    return result;
  };
}

export function atomic(f) {
  return (...args) => {
    let result;
    atomically(() => {
      result = f(...args);
    });
    return result;
  };
}

function beginTransaction() {
  currentCtx = new TransactionContext(currentCtx);
}

function commitTransaction() {
  const ctx = currentCtx;
  currentCtx = ctx.parent;

  if (currentCtx === null) {
    const reactors = [];
    ctx.modifiedAtoms.forEach(a => {
      if (util.equals(a, a._value, ctx.id2originalValue[a._id])) {
        a._state = UNCHANGED;
      } else {
        a._state = CHANGED;
        mark(a, reactors);
      }
    });
    processReactors(reactors);
    ctx.modifiedAtoms.forEach(a => {
      a._state = UNCHANGED;
    });
  }
}

function abortTransaction() {
  const ctx = currentCtx;
  currentCtx = ctx.parent;
  ctx.modifiedAtoms.forEach(atom => {
    atom._value = ctx.id2originalValue[atom._id];
    atom._state = UNCHANGED;
    mark(atom, []);
  });
}

let _tickerRefCount = 0;

export function ticker() {
  if (_tickerRefCount === 0) {
    beginTransaction();
  }
  _tickerRefCount++;
  let done = false;
  return {
    tick() {
      if (done) throw new Error("trying to use ticker after release");
      commitTransaction();
      beginTransaction();
    },
    reset() {
      if (done) throw new Error("trying to use ticker after release");
      abortTransaction();
      beginTransaction();
    },
    release() {
      if (done) throw new Error("ticker already released");
      _tickerRefCount--;
      done = true;
      if (_tickerRefCount === 0) {
        commitTransaction();
      }
    }
  };
}
