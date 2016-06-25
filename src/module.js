import * as util from './util';
import * as transactions from './transactions';
import {atom} from './atom';
import * as reactors from './reactors';
import * as types from './types';
import {derivation} from './derivation';
import {lens} from './lens';

var D = {
  transact: transactions.transact,
  defaultEquals: util.equals,
  setDebugMode: util.setDebugMode,
  transaction: transactions.transaction,
  ticker: transactions.ticker,
  Reactor: reactors.Reactor,
  isDerivable: types.isDerivable,
  isAtom: types.isAtom,
  isLens: types.isLens,
  isDerivation: types.isDerivation,
  isReactor: types.isReactor,
  derivation: derivation,
  atom: atom,
  atomic: transactions.atomic,
  atomically: transactions.atomically,
  lens: lens,
};

/**
 * Template string tag for derivable strings
 */
D.derive = function (parts) {
  var args = util.slice(arguments, 1);
  return D.derivation(function () {
    var s = "";
    for (var i=0; i < parts.length; i++) {
      s += parts[i];
      if (i < args.length) {
        s += D.unpack(args[i]);
      }
    }
    return s;
  });
};

/**
 * dereferences a thing if it is dereferencable, otherwise just returns it.
 */
D.unpack = function (thing) {
  if (D.isDerivable(thing)) {
    return thing.get();
  } else {
    return thing;
  }
};

/**
 * lifts a non-monadic function to work on derivables
 */
D.lift = function (f) {
  return function () {
    var args = arguments;
    var that = this;
    return D.derivation(function () {
      return f.apply(that, Array.prototype.map.call(args, D.unpack));
    });
  };
};

function deepUnpack (thing) {
  if (D.isDerivable(thing)) {
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

D.struct = function (arg) {
  if (arg.constructor === Object || arg instanceof Array) {
    return D.derivation(function () {
      return deepUnpack(arg);
    });
  } else {
    throw new Error("`struct` expects plain Object or Array");
  }
};

function andOrFn (breakOn) {
  return function () {
    var args = arguments;
    return D.derivation(function () {
      var val;
      for (var i = 0; i < args.length; i++) {
        val = D.unpack(args[i]);
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
D.or = andOrFn(identity);
D.mOr = andOrFn(util.some);
D.and = andOrFn(complement(identity));
D.mAnd = andOrFn(complement(util.some));

exports = D;

exports['default'] = exports;
