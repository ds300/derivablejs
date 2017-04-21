import * as util from './util';
import {makeReactor} from './reactors';
import * as types from './types';
import {derive as _derive} from './module';
import {unpack} from './unpack';

export var derivablePrototype = {
    /**
     * Creates a derived value whose state will always be f applied to this
     * value
     */
  derive: function (f, a, b, c, d) {
    var that = this;
    switch (arguments.length) {
    case 0:
      throw new Error('.derive takes at least one argument');
    case 1:
      switch (typeof f) {
        case 'function':
          return _derive(f, that);
        case 'string':
        case 'number':
          return _derive(function () {
            return that.get()[f];
          });
        default:
          if (f instanceof Array) {
            return f.map(function (x) {
              return that.derive(x);
            });
          } else if (f instanceof RegExp) {
            return _derive(function () {
              return that.get().match(f);
            });
          } else if (types.isDerivable(f)) {
            return _derive(function () {
              var deriver = f.get();
              var thing = that.get();
              switch (typeof deriver) {
                case 'function':
                  return deriver(thing);
                case 'string':
                case 'number':
                  return thing[deriver];
                default:
                  if (deriver instanceof RegExp) {
                    return thing.match(deriver);
                  } else {
                    throw Error('type error');
                  }
              }
            });
          } else {
            throw Error('type error');
          }
        }
    case 2:
      return _derive(f, that, a);
    case 3:
      return _derive(f, that, a, b);
    case 4:
      return _derive(f, that, a, b, c);
    case 5:
      return _derive(f, that, a, b, c, d);
    default:
      var args = ([f, that]).concat(util.slice(arguments, 1));
      return _derive.apply(null, args);
    }
  },

  react: function (f, opts) {
    makeReactor(this, f, opts);
  },

  mReact: function (f, opts) {
    var mWhen = this.mThen(true, false);
    if (opts && 'when' in opts && opts.when !== true) {
      var when = opts.when;
      if (typeof when === 'function' || when === false) {
        when = _derive(when);
      } else if (!types.isDerivable(when)) {
        throw new Error('when condition must be bool, function, or derivable');
      }
      mWhen = when.and(mWhen);
    }
    return this.react(f, util.assign({}, opts, {when: mWhen}));
  },

  is: function (other) {
    var that = this;
    return this.derive(function (x) {
      return that.__equals(x, unpack(other));
    });
  },

  and: function (other) {
    return this.derive(function (x) {return x && unpack(other);});
  },

  or: function (other) {
    return this.derive(function (x) {return x || unpack(other);});
  },

  then: function (thenClause, elseClause) {
    return this.derive(function (x) {
      return unpack(x ? thenClause : elseClause);
    });
  },

  mThen: function (thenClause, elseClause) {
    return this.derive(function (x) {
      return unpack(util.some(x) ? thenClause : elseClause);
    });
  },

  mOr: function (other) {
    return this.mThen(this, other);
  },

  mDerive: function (arg) {
    if (arguments.length === 1 && arg instanceof Array) {
      var that = this;
      return arg.map(function (a) { return that.mDerive(a); });
    } else {
      return this.mThen(this.derive.apply(this, arguments));
    }
  },

  mAnd: function (other) {
    return this.mThen(other, this);
  },

  not: function () {
    return this.derive(function (x) { return !x; });
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

derivablePrototype.switch = function () {
  var args = arguments;
  var that = this;
  return this.derive(function (x) {
    var i;
    for (i = 0; i < args.length-1; i+=2) {
      if (that.__equals(x, unpack(args[i]))) {
        return unpack(args[i+1]);
      }
    }
    if (i === args.length - 1) {
      return unpack(args[i]);
    }
  });
};
