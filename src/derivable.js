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

  orDefault(def) {
    if (!util.some(def)) {
      throw Error('orDefault requires non-null value');
    }
    return this.derive(value => util.some(value) ? value : def);
  },

  react(f, opts) {
    makeReactor(this, f, opts);
  },

  maybeReact(f, opts) {
    let maybeWhen = this.derive(Boolean);
    if (opts && 'when' in opts && opts.when !== true) {
      let when = opts.when;
      if (typeof when === 'function' || when === false) {
        when = derive(when);
      } else if (!types.isDerivable(when)) {
        throw new Error('when condition must be bool, function, or derivable');
      }
      maybeWhen = maybeWhen.derive(d => d && when.get());
    }
    makeReactor(this, f, util.assign({}, opts, { when: maybeWhen }));
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
