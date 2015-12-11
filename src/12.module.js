var defaultConfig = { equals: util_equals };

function constructModule (config) {
  config = util_extend({}, defaultConfig, config || {});

  var D = {
    transact: atom_transact,
    defaultEquals: util_equals,
    setDebugMode: util_setDebugMode,
    transaction: atom_transaction,
    ticker: atom_ticker,
    Reactor: reactors_Reactor,
    isAtom: function (x) {
      return x && (x._type === types_ATOM || x._type === types_LENS);
    },
    isDerivable: function (x) {
      return x && (x._type === types_ATOM ||
                   x._type === types_LENS ||
                   x._type === types_DERIVATION);
    },
    isDerivation: function (x) {
      return x && (x._type === types_DERIVATION || x._type === types_LENS)
    },
    isLensed: function (x) {
      return x && x._type === types_LENS;
    },
    isReactor: function (x) {
      return x && x._type === types_REACTION;
    },
  };

  var Derivable  = derivable_createPrototype(D, config);
  var Mutable    = mutable_createPrototype(D, config);

  var Atom       = util_extend({}, Mutable, Derivable,
                               atom_createPrototype(D, config));

  var Derivation = util_extend({}, Derivable,
                               derivation_createPrototype(D, config));

  var Lens       = util_extend({}, Mutable, Derivation,
                              lens_createPrototype(D, config));


  /**
   * Constructs a new atom whose state is the given value
   */
  D.atom = function (val) {
    return atom_construct(Object.create(Atom), val);
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
    }
  };

  D.atomically = function (f) {
    if (atom_inTxn()) {
      f();
    } else {
      D.transact(f);
    }
  };

  /**
   * Sets the e's state to be f applied to e's current state and args
   */
  D.swap = function (atom, f) {
    var args = util_slice(arguments, 1);
    args[0] = atom.get();
    return atom.set(f.apply(null, args));
  };

  D.derivation = function (f) {
    return derivation_construct(Object.create(Derivation), f);
  };

  /**
   * Creates a new derivation. Can also be used as a template string tag.
   */
  D.derive = function (a) {
    if (a instanceof Array) {
      return deriveString.apply(null, arguments);
    } else if (arguments.length > 0) {
      return Derivable.derive.apply(a, util_slice(arguments, 1));
    } else {
      throw new Error("Wrong arity for derive. Expecting 1+ args");
    }
  };

  function deriveString (parts) {
    var args = util_slice(arguments, 1);
    return D.derivation(function () {
      var s = "";
      for (var i=0; i<parts.length; i++) {
        s += parts[i];
        if (i < args.length) {
          s += D.unpack(args[i]);
        }
      }
      return s;
    });
  }

  D.mDerive = function (a) {
    return Derivable.mDerive.apply(a, util_slice(arguments, 1));
  };

  /**
   * creates a new lens
   */
  D.lens = function (parent, descriptor) {
    var lens = Object.create(Lens);
    if (arguments.length === 1) {
      descriptor = parent;
      return lens_construct(
        derivation_construct(lens, descriptor.get),
        descriptor
      );
    } else {
      return parent.lens(descriptor);
    }
  }

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
    }
  };

  /**
   * sets a to v, returning v
   */
  D.set = function (a, v) {
    return a.set(v);
  };

  D.get = function (d) {
    return d.get();
  };

  function deepUnpack (thing) {
    if (D.isDerivable(thing)) {
      return thing.get();
    } else if (thing instanceof Array) {
      return thing.map(deepUnpack);
    } else if (thing.constructor === Object) {
      var result = {};
      var keys = util_keys(thing);
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

  D.destruct = function (arg) {
    var args = arguments;
    var result = [];
    for (var i = 1; i < args.length; i++) {
      result.push(D.lookup(arg, args[i]));
    }
    return result;
  };

  D.lookup = function (arg, prop) {
    return D.derivation(function () {
      return D.unpack(arg)[D.unpack(prop)];
    })
  };

  D.ifThenElse = function (a, b, c) { return a.then(b, c) };

  D.ifThenElse = function (testValue, thenClause, elseClause) {
    return D.derivation(function () {
      return D.unpack(
        D.unpack(testValue) ? thenClause : elseClause
      );
    });
  }

  D.mIfThenElse = function (testValue, thenClause, elseClause) {
    return D.derivation(function () {
      var x = D.unpack(testValue);
      return D.unpack(
        util_some(x) ? thenClause : elseClause
      );
    });
  };

  D.or = function () {
    var args = arguments;
    return D.derivation(function () {
      var val;
      for (var i = 0; i < args.length; i++) {
        val = D.unpack(args[i]);
        if (val) {
          break;
        }
      }
      return val;
    });
  };

  D.mOr = function () {
    var args = arguments;
    return D.derivation(function () {
      var val;
      for (var i = 0; i < args.length; i++) {
        val = D.unpack(args[i]);
        if (util_some(val)) {
          break;
        }
      }
      return val;
    });
  };

  D.and = function () {
    var args = arguments;
    return D.derivation(function () {
      var val;
      for (var i = 0; i < args.length; i++) {
        val = D.unpack(args[i]);
        if (!val) {
          break;
        }
      }
      return val;
    });
  };

  D.mAnd = function () {
    var args = arguments;
    return D.derivation(function () {
      var val;
      for (var i = 0; i < args.length; i++) {
        val = D.unpack(args[i]);
        if (!util_some(val)) {
          break;
        }
      }
      return val;
    });
  };

  D.not = function (x) { return x.derive(function (x) { return !x; }); };

  D.switchCase = function (x) {
    return Derivable.switch.apply(x, util_slice(arguments, 1));
  };

  return D;
}

util_extend(exports, constructModule());
exports.withEquality = function (equals) {
  return constructModule({equals: equals});
};
exports['default'] = exports;
