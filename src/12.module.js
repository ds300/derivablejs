var defaultConfig = { equals: util_equals };

function havelock (config) {
  config = util_extend({}, defaultConfig, config || {});

  var Havelock = {
    transact: atom_transact,
    defaultEquals: util_equals,
    transaction: atom_transaction,
    Reaction: reactions_Reaction,
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
    isReaction: function (x) {
      return x && x._type === types_REACTION;
    },
  };

  var Derivable  = derivable_createPrototype(Havelock, config);
  var Mutable    = mutable_createPrototype(Havelock, config);

  var Atom       = util_extend({}, Mutable, Derivable,
                               atom_createPrototype(Havelock, config));

  var Derivation = util_extend({}, Derivable,
                               derivation_createPrototype(Havelock, config));

  var Lens       = util_extend({}, Mutable, Derivation,
                              lens_createPrototype(Havelock, config));


  /**
   * Constructs a new atom whose state is the given value
   */
  Havelock.atom = function (val) {
    return atom_construct(Object.create(Atom), val);
  };

  /**
   * Sets the e's state to be f applied to e's current state and args
   */
  Havelock.swap = function (atom, f) {
    var args = util_slice(arguments, 1);
    args[0] = atom.get();
    return atom.set(f.apply(null, args));
  };

  Havelock.derivation = function (f) {
    return derivation_construct(Object.create(Derivation), f);
  };

  /**
   * Creates a new derivation. Can also be used as a template string tag.
   */
  Havelock.derive = function (a) {
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
    return Havelock.derivation(function () {
      var s = "";
      for (var i=0; i<parts.length; i++) {
        s += parts[i];
        if (i < args.length) {
          s += Havelock.unpack(args[i]);
        }
      }
      return s;
    });
  }

  /**
   * creates a new lens
   */
  Havelock.lens = function (parent, descriptor) {
    var lens = Object.create(Lens);
    return lens_construct(
      derivation_construct(
        lens,
        function () { return descriptor.get(parent.get()); }
      ),
      parent,
      descriptor
    );
  };

  /**
   * dereferences a thing if it is dereferencable, otherwise just returns it.
   */
  Havelock.unpack = function (thing) {
    if (Havelock.isDerivable(thing)) {
      return thing.get();
    } else {
      return thing;
    }
  };

  /**
   * lifts a non-monadic function to work on derivables
   */
  Havelock.lift = function (f) {
    return function () {
      var args = arguments;
      var that = this;
      return Havelock.derivation(function () {
        return f.apply(that, Array.prototype.map.call(args, Havelock.unpack));
      });
    }
  };

  /**
   * sets a to v, returning v
   */
  Havelock.set = function (a, v) {
    return a.set(v);
  };

  Havelock.get = function (d) {
    return d.get();
  };

  function deepUnpack (thing) {
    if (Havelock.isDerivable(thing)) {
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

  Havelock.struct = function (arg) {
    if (arg.constructor === Object || arg instanceof Array) {
      return Havelock.derivation(function () {
        return deepUnpack(arg);
      });
    } else {
      throw new Error("`struct` expects plain Object or Array");
    }
  };

  Havelock.ifThenElse = function (a, b, c) { return a.then(b, c) };

  Havelock.or = function () {
    var args = arguments;
    return Havelock.derivation(function () {
      var val;
      for (var i = 0; i < args.length; i++) {
        val = Havelock.unpack(args[i]);
        if (val) {
          break;
        }
      }
      return val;
    });
  };

  Havelock.and = function () {
    var args = arguments;
    return Havelock.derivation(function () {
      var val;
      for (var i = 0; i < args.length; i++) {
        val = Havelock.unpack(args[i]);
        if (!val) {
          break;
        }
      }
      return val;
    });
  };

  Havelock.not = function (x) { return x.derive(function (x) { return !x; }); };

  Havelock.switchCase = function (x) {
    return Derivable.switch.apply(x, util_slice(arguments, 1));
  };

  return Havelock;
}

util_extend(exports, havelock());
exports.withEquality = function (equals) {
  return havelock({equals: equals});
};
exports['default'] = exports;
