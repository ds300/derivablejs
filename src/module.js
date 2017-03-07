import * as util from './util';
import * as transactions from './transactions';
import {atom as _atom} from './atom';
import * as reactors from './reactors';
import * as parents from './parents';
import * as types from './types';
import {derivation as _derivation} from './derivation';
import {lens as _lens} from './lens';

export var __Reactor = reactors.Reactor;
export var transact = transactions.transact;
export var setDebugMode = util.setDebugMode;
export var transaction = transactions.transaction;
export var ticker = transactions.ticker;
export var isDerivable = types.isDerivable;
export var isAtom = types.isAtom;
export var isLensed = types.isLensed;
export var isDerivation = types.isDerivation;
export var derivation = _derivation;
export var atom = _atom;
export var atomic = transactions.atomic;
export var atomically = transactions.atomically;
export var lens = _lens;

/**
 * Template string tag for derivable strings
 */
export function derive (parts) {
  var args = util.slice(arguments, 1);
  return derivation(function () {
    var s = "";
    for (var i=0; i < parts.length; i++) {
      s += parts[i];
      if (i < args.length) {
        s += unpack(args[i]);
      }
    }
    return s;
  });
};

/**
 * dereferences a thing if it is dereferencable, otherwise just returns it.
 */
export function unpack (thing) {
  if (isDerivable(thing)) {
    return thing.get();
  } else {
    return thing;
  }
};

/**
 * lifts a non-monadic function to work on derivables
 */
export function lift (f) {
  return function () {
    var args = arguments;
    var that = this;
    return derivation(function () {
      return f.apply(that, Array.prototype.map.call(args, unpack));
    });
  };
};

function deepUnpack (thing) {
  if (isDerivable(thing)) {
    return thing.get();
  } else if (thing instanceof Array) {
    return thing.map(deepUnpack);
  } else if (thing.constructor === Object) {
    var result = {};
    var keys = util.keys(thing);
    for (var i = keys.length; i--;) {
      var prop = keys[i];
      result[prop] = deepUnpack(thing[prop]);
    }
    return result;
  } else {
    return thing;
  }
}

export function struct (arg) {
  if (arg.constructor === Object || arg instanceof Array) {
    return derivation(function () {
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
    return derivation(function () {
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
