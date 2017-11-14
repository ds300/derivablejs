import * as util from './util';
import {deriveFactory as derive} from './derivation';
import {unpack} from './unpack';

export const map = (f, derivable) => {
  if (typeof f !== 'function') {
    throw new Error('map requires function');
  }
  return derive(() => f(unpack(derivable)));
};

export const mMap = (f, derivable) => {
  if (typeof f !== 'function') {
    throw new Error('mMap requires function');
  }
  return derive(() => {
    const arg = unpack(derivable);
    return util.some(arg) ? f(arg) : null;
  });
};

export const alt = (fst, snd) =>
  derive(() => util.some(fst.get()) ? fst.get() : snd.get());

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
