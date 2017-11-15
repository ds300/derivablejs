import * as util from './util';
import {makeReactor} from './reactors';
import * as types from './types';
import {derive as _derive} from './derivation.js';
import {unpack} from './unpack';
import {map, mMap} from './combinators.js';

export var derivablePrototype = {
    /**
     * Creates a derived value whose state will always be f applied to this
     * value
     */
  derive: function (f, ...args) {
    if (typeof f === 'function') {
      return _derive(f, this, ...args);
    } else {
      throw Error('type error');
    }
  },

  map(f) {
    return map(f, this);
  },

  mMap(f) {
    return mMap(f, this);
  },

  react: function (f, opts) {
    makeReactor(this, f, opts);
  },

  mReact: function (f, opts) {
    var mWhen = _derive(() => Boolean(this.get()));
    if (opts && 'when' in opts && opts.when !== true) {
      var when = opts.when;
      if (typeof when === 'function' || when === false) {
        when = _derive(when);
      } else if (!types.isDerivable(when)) {
        throw new Error('when condition must be bool, function, or derivable');
      }
      mWhen = mWhen.map(d => d && when.get());
    }
    return this.react(f, util.assign({}, opts, {when: mWhen}));
  },

  is: function (other) {
    var x = this;
    return _derive(function () {
      return x.__equals(x.get(), unpack(other));
    });
  },

  mDerive: function (...args) {
    return _derive(() => util.some(this.get()) ? this.derive(...args).get() : null);
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
