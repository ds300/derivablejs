import * as util from './util';
import * as transactions from './transactions';
import {atom as _atom} from './atom';
import * as reactors from './reactors';
import * as parents from './parents';
import * as types from './types';
import {proxy as _proxy} from './proxy';
import {derive as _derive} from './derivation';
import {deepUnpack, unpack as _unpack} from './unpack';

export var __Reactor = reactors.Reactor;
export var transact = transactions.transact;
export var setDebugMode = util.setDebugMode;
export var transaction = transactions.transaction;
export var ticker = transactions.ticker;
export var isDerivable = types.isDerivable;
export var isAtom = types.isAtom;
export var isProxy = types.isProxy;
export var isDerivation = types.isDerivation;
export var derive = _derive;
export var atom = _atom;
export var atomic = transactions.atomic;
export var atomically = transactions.atomically;
export var proxy = _proxy;
export var unpack = _unpack;

export function struct (arg) {
  if (arg.constructor === Object || arg instanceof Array) {
    return derive(function () {
      return deepUnpack(arg);
    });
  } else {
    throw new Error("`struct` expects plain Object or Array");
  }
};

export function wrapPreviousState (f, init) {
  var lastState = init;
  return function (newState) {
    var result = f.call(this, newState, lastState);
    lastState = newState;
    return result;
  };
}

export function captureDereferences (f) {
  var captured = [];
  parents.startCapturingParents(void 0, captured);
  try {
    f();
  } finally {
    parents.stopCapturingParents();
  }
  return captured;
}

function andOrFn (breakOn) {
  return function () {
    var args = arguments;
    return derive(function () {
      var val;
      for (var i = 0; i < args.length; i++) {
        val = unpack(args[i]);
        if (breakOn(val)) {
          break;
        }
      }
      return val;
    });
  };
}
function identity (x) { return x; }
function complement (f) { return function (x) { return !f(x); }; }
export var or = andOrFn(identity);
export var mOr = andOrFn(util.some);
export var and = andOrFn(complement(identity));
export var mAnd = andOrFn(complement(util.some));
