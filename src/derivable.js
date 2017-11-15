import * as util from './util';
import {makeReactor} from './reactors';
import * as types from './types';
import {derive} from './derivation.js';
import {unpack} from './unpack';

export var derivablePrototype = {
  derive(f) {
    if (typeof f !== 'function') {
      throw Error('derive requires function');
    }
    return derive(() => f(this.get()));
  },

  maybeDerive(f) {
    if (typeof f !== 'function') {
      throw Error('maybeDerive requires function');
    }
    return derive(() => {
      const arg = this.get();
      return util.some(arg) ? f(arg) : null;
    });
  },

  maybeDefault(def) {
    if (!util.some(def)) {
      throw Error('maybeDefault requires non-null value');
    }
    return this.derive(value => util.some(value) ? value : def);
  },

  react: function (f, opts) {
    makeReactor(this, f, opts);
  },

  mReact: function (f, opts) {
    var mWhen = this.derive(Boolean);
    if (opts && 'when' in opts && opts.when !== true) {
      var when = opts.when;
      if (typeof when === 'function' || when === false) {
        when = derive(when);
      } else if (!types.isDerivable(when)) {
        throw new Error('when condition must be bool, function, or derivable');
      }
      mWhen = mWhen.derive(d => d && when.get());
    }
    makeReactor(this, f, util.assign({}, opts, {when: mWhen}));
  },

  is: function (other) {
    var x = this;
    return derive(function () {
      return x.__equals(x.get(), unpack(other));
    });
  },

  withEquality: function (equals) {
    if (equals) {
      if (typeof equals !== 'function') {
        throw new Error('equals must be function');
      }
    } else {
      equals = null;
    }

    return util.setEquals(this._clone(), equals);
  },

  __equals: function (a, b) {
    return (this._equals || util.equals)(a, b);
  },
};
