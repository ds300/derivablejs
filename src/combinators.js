import * as util from './util';
import {derive} from './derivation';
import {unpack} from './unpack';

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
