import * as util from './util';
import * as transactions from './transactions';
import * as atom from './atom';
import * as reactors from './reactors';
import * as types from './types';
import * as derivable from './derivable';
import * as derivation from './derivation';
import * as mutable from './mutable';
import * as lens from './lens';

var defaultConfig = { equals: util.equals };

function constructModule (config) {
  config = util.assign({}, defaultConfig, config || {});

  var D = {
    transact: transactions.transact,
    defaultEquals: util.equals,
    setDebugMode: util.setDebugMode,
    transaction: transactions.transaction,
    ticker: transactions.ticker,
    Reactor: reactors.Reactor,
    isAtom: function (x) {
      return x && (x._type === types.ATOM || x._type === types.LENS);
    },
    isDerivable: function (x) {
      return x && (x._type === types.ATOM ||
                   x._type === types.LENS ||
                   x._type === types.DERIVATION);
    },
    isDerivation: function (x) {
      return x && (x._type === types.DERIVATION || x._type === types.LENS);
    },
    isLensed: function (x) {
      return x && x._type === types.LENS;
    },
    isReactor: function (x) {
      return x && x._type === types.REACTION;
    },
  };

  var Derivable  = derivable.createPrototype(D, config);
  var Mutable    = mutable.createPrototype(D, config);

  var Atom       = util.assign({}, Mutable, Derivable,
                               atom.createPrototype(D, config));

  var Derivation = util.assign({}, Derivable,
                               derivation.createPrototype(D, config));

  var Lens       = util.assign({}, Mutable, Derivation,
                              lens.createPrototype(D, config));


  /**
   * Constructs a new atom whose state is the given value
   */
  D.atom = function (val) {
    return atom.construct(Object.create(Atom), val);
  };

  /**
   * Returns a copy of f which runs atomically
   */
  D.atomic = function (f) {
    return function () {
      var result;
      var that = this;
      var args = arguments;
      D.atomically(function () {
        result = f.apply(that, args);
      });
      return result;
    };
  };

  D.atomically = function (f) {
    if (transactions.inTransaction()) {
      f();
    } else {
      D.transact(f);
    }
  };

  D.derivation = function (f) {
    return derivation.construct(Object.create(Derivation), f);
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
   * creates a new lens
   */
  D.lens = function (descriptor) {
    return lens.construct(
      derivation.construct(Object.create(Lens), descriptor.get),
      descriptor
    );
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

  return D;
}

util.assign(exports, constructModule());
exports.withEquality = function (equals) {
  return constructModule({equals: equals});
};
exports['default'] = exports;
