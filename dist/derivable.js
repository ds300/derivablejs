// UMD loader
(function (global, factory) {
  "use strict";
  if (global && typeof global.define === "function" && global.define.amd) {
    global.define(["exports"], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports);
  } else {
    factory(global.Derivable = {});
  }
})(this, function (exports) {
"use strict";

var util_keys = Object.keys;

function util_extend(obj) {
  for (var i = 1; i < arguments.length; i++) {
    var other = arguments[i];
    var keys = util_keys(other);
    for (var j = keys.length; j--;) {
      var prop = keys[j];
      obj[prop] = other[prop];
    }
  }
  return obj;
}

function _is(a, b) {
  // SameValue algorithm
  if (a === b) { // Steps 1-5, 7-10
    // Steps 6.b-6.e: +0 != -0
    return a !== 0 || 1 / a === 1 / b;
  } else {
    // Step 6.a: NaN == NaN
    return a !== a && b !== b;
  }
}

function util_equals (a, b) {
  return _is(a, b) || (a && typeof a.equals === 'function' && a.equals(b));
}

function util_addToArray (a, b) {
  var i = a.indexOf(b);
  if (i < 0) {
    a.push(b);
  }
}

function util_removeFromArray (a, b) {
  var i = a.indexOf(b);
  if (i >= 0) {
    a.splice(i, 1);
  }
}

var nextId = 0;
function util_nextId () {
  return nextId++;
}

function util_slice (a, i) {
  return Array.prototype.slice.call(a, i);
}

var util_unique = Object.freeze({equals: function () { return false; }});

function util_some (x) {
  return (x !== null) && (x !== void 0);
}

var util_DEBUG_MODE = false;
function util_setDebugMode(val) {
  util_DEBUG_MODE = !!val;
}

function util_setEquals(derivable, equals) {
  derivable._equals = equals;
  return derivable;
}

var epoch_globalEpoch = 0;

var parentsStack = [];

function parents_capturingParentsEpochs(f) {
  var i = parentsStack.length;
  parentsStack.push([]);
  try {
    f();
    return parentsStack[i];
  } finally {
    parentsStack.pop();
  }
}

function parents_captureParent(p) {
  if (parentsStack.length > 0) {
    var top = parentsStack[parentsStack.length - 1];
    top.push(p, 0);
    return top.length-1;
  } else {
    return -1;
  }
}

function parents_captureEpoch(idx, epoch) {
  if (parentsStack.length > 0) {
    parentsStack[parentsStack.length - 1][idx] = epoch;
  }
}

var types_ATOM = "ATOM",
    types_DERIVATION = "DERIVATION",
    types_LENS = "LENS",
    types_REACTION = "REACTION";

var TransactionAbortion = {};

function initiateAbortion() {
  throw TransactionAbortion;
}

function TransactionContext(parent) {
  this.parent = parent;
  this.id2txnAtom = {};
  this.globalEpoch = epoch_globalEpoch;
  this.modifiedAtoms = [];
}

var transactions_currentCtx = null;

function transactions_inTransaction () {
  return transactions_currentCtx !== null;
}

function transactions_transact (f) {
  beginTransaction();
  try {
    f.call(null, initiateAbortion);
  }
  catch (e) {
    abortTransaction();
    if (e !== TransactionAbortion) {
      throw e;
    }
    return;
  }
  commitTransaction();
}

function beginTransaction() {
  transactions_currentCtx = new TransactionContext(transactions_currentCtx);
}

function commitTransaction() {
  var ctx = transactions_currentCtx;
  transactions_currentCtx = ctx.parent;
  var reactorss = [];
  ctx.modifiedAtoms.forEach(function (a) {
    if (transactions_currentCtx !== null) {
      a.set(ctx.id2txnAtom[a._id]._value);
    }
    else {
      a._set(ctx.id2txnAtom[a._id]._value);
      reactorss.push(a._reactors);
    }
  });
  if (transactions_currentCtx === null) {
    epoch_globalEpoch = ctx.globalEpoch;
  } else {
    transactions_currentCtx.globalEpoch = ctx.globalEpoch;
  }
  reactorss.forEach(function (reactors) {
    reactors.forEach(function (r) {
      r._maybeReact();
    });
  });
}

function abortTransaction() {
  var ctx = transactions_currentCtx;
  transactions_currentCtx = ctx.parent;
  if (transactions_currentCtx === null) {
    epoch_globalEpoch = ctx.globalEpoch + 1;
  }
  else {
    transactions_currentCtx.globalEpoch = ctx.globalEpoch + 1;
  }
}

function transactions_ticker () {
  beginTransaction();
  var disposed = false;
  return {
    tick: function () {
      if (disposed) throw new Error("can't tick disposed ticker");
      commitTransaction();
      beginTransaction();
    },
    stop: function () {
      if (disposed) throw new Error("ticker already disposed");
      disposed = true;
      commitTransaction();
    },
    resetState: function () {
      if (disposed) throw new Error("ticker already disposed");
      abortTransaction();
      beginTransaction();
    }
  }
}

var reactorParentStack = [];

function Reactor(react, derivable) {
  this._derivable = derivable;
  this.react = react;
  this._atoms = [];
  this._parent = null;
  this._active = false;
  this._yielding = false;
  this._reacting = false;
  this._type = types_REACTION;
  if (util_DEBUG_MODE) {
    this.stack = Error().stack;
  }
}

var reactors_Reactor = Reactor;

function bindAtomsToReactors(derivable, reactor) {
  if (derivable._type === types_ATOM) {
    util_addToArray(derivable._reactors, reactor);
    util_addToArray(reactor._atoms, derivable);
  }
  else {
    for (var i = 0, len = derivable._lastParentsEpochs.length; i < len; i += 2) {
      bindAtomsToReactors(derivable._lastParentsEpochs[i], reactor);
    }
  }
}

Object.assign(reactors_Reactor.prototype, {
  start: function () {
    this._lastValue = this._derivable.get();
    this._lastEpoch = this._derivable._epoch;
    this._atoms = [];
    bindAtomsToReactors(this._derivable, this);
    var len = reactorParentStack.length;
    if (len > 0) {
      this._parent = reactorParentStack[len - 1];
    }
    this._active = true;
    this.onStart && this.onStart();
    return this;
  },
  _force: function (nextValue) {
    try {
      reactorParentStack.push(this);
      this._reacting = true;
      this.react(nextValue);
    } catch (e) {
      if (util_DEBUG_MODE) {
        console.error(this.stack);
      }
      throw e;
    } finally {
      this._reacting = false;
      reactorParentStack.pop();
    }
  },
  force: function () {
    this._force(this._derivable.get());
  },
  _maybeReact: function () {
    if (this._reacting) {
      throw Error('cyclical update detected!!');
    } else if (this._active) {
      if (this._yielding) {
        throw Error('reactor dependency cycle detected');
      }
      if (this._parent !== null) {
        this._yielding = true;
        this._parent._maybeReact();
        this._yielding = false;
      }
      var nextValue = this._derivable.get();
      if (this._derivable._epoch !== this._lastEpoch &&
          !this._derivable.__equals(nextValue, this._lastValue)) {
        this._force(nextValue);
      }
      this._lastEpoch = this._derivable._epoch;
      this._lastValue = nextValue;
    }
  },
  stop: function () {
    var _this = this;
    this._atoms.forEach(function (atom) {
      return util_removeFromArray(atom._reactors, _this);
    });
    this._atoms = [];
    this._parent = null;
    this._active = false;
    this.onStop && this.onStop();
    return this;
  },
  orphan: function () {
    this._parent = null;
  },
  adopt: function (child) {
    child._parent = this;
  },
  isActive: function () {
    return this._active;
  },
});

function derivable_createPrototype (D, opts) {
  var x = {
    /**
     * Creates a derived value whose state will always be f applied to this
     * value
     */
    derive: function (f, a, b, c, d) {
      var that = this;
      switch (arguments.length) {
      case 0:
        return that;
      case 1:
        switch (typeof f) {
          case 'function':
            return D.derivation(function () {
              return f(that.get());
            });
          case 'string':
          case 'number':
            return D.derivation(function () {
              return that.get()[D.unpack(f)];
            });
          default:
            if (f instanceof Array) {
              return f.map(function (x) {
                return that.derive(x);
              });
            } else if (f instanceof RegExp) {
              return D.derivation(function () {
                return that.get().match(f);
              });
            } else if (D.isDerivable(f)) {
              return D.derivation(function () {
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
                return that.get()[D.unpack(f)];
              });
            } else {
              throw Error('type error');
            }
        }
        break;
      case 2:
        return D.derivation(function () {
          return f(that.get(), D.unpack(a));
        });
      case 3:
        return D.derivation(function () {
          return f(that.get(), D.unpack(a), D.unpack(b));
        });
      case 4:
        return D.derivation(function () {
          return f(that.get(),
                   D.unpack(a),
                   D.unpack(b),
                   D.unpack(c));
        });
      case 5:
        return D.derivation(function () {
          return f(that.get(),
                   D.unpack(a),
                   D.unpack(b),
                   D.unpack(c),
                   D.unpack(d));
        });
      default:
        var args = ([that]).concat(util_slice(arguments, 1));
        return D.derivation(function () {
          return f.apply(null, args.map(D.unpack));
        });
      }
    },



    reactor: function (f) {
      if (typeof f === 'function') {
        return new reactors_Reactor(f, this);
      } else if (f instanceof reactors_Reactor) {
        f._derivable = this;
        return f;
      } else if (f && f.react) {
        return Object.assign(new reactors_Reactor(null, this), f);
      } else {
        throw new Error("Unrecognized type for reactor " + f);
      }
    },

    react: function (f, opts) {
      if (typeof f !== 'function') {
        throw Error('the first argument to .react must be a function');
      }

      opts = Object.assign({
        once: false,
        from: true,
        until: false,
        when: true,
        skipFirst: false,
      }, opts);

      // coerce fn or bool to derivable<bool>
      function condDerivable(fOrD, name) {
        if (!D.isDerivable(fOrD)) {
          if (typeof fOrD === 'function') {
            fOrD = D.derivation(fOrD);
          } else if (typeof fOrD === 'boolean') {
            fOrD = D.atom(fOrD);
          } else {
            throw Error('react ' + name + ' condition must be derivable');
          }
        }
        return fOrD.derive(function (x) { return !!x; });
      }

      // wrap reactor so f doesn't get a .this context, and to allow
      // stopping after one reaction if desired.
      var reactor = this.reactor({
        react: function (val) {
          if (opts.skipFirst) {
            opts.skipFirst = false;
          } else {
            f(val);
            if (opts.once) {
              this.stop();
              controller.stop();
            }
          }
        },
        onStart: opts.onStart,
        onStop: opts.onStop
      });

      // listen to when and until conditions, starting and stopping the
      // reactor as appropriate, and stopping this controller when until
      // condition becomes true
      var controller = D.struct({
        until: condDerivable(opts.until, 'until'),
        when: condDerivable(opts.when, 'when')
      }).reactor(function (conds) {
        if (conds.until) {
          reactor.stop();
          this.stop();
        } else if (conds.when) {
          if (!reactor.isActive()) {
            reactor.start().force();
          }
        } else if (reactor.isActive()) {
          reactor.stop();
        }
      });

      // listen to from condition, starting the reactor controller
      // when appropriate
      condDerivable(opts.from, 'from').reactor(function (from) {
        if (from) {
          controller.start().force();
          this.stop();
        }
      }).start().force();
    },

    is: function (other) {
      return D.lift(this._equals || opts.equals)(this, other);
    },

    and: function (other) {
      return this.derive(function (x) {return x && D.unpack(other);});
    },

    or: function (other) {
      return this.derive(function (x) {return x || D.unpack(other);});
    },

    then: function (thenClause, elseClause) {
      return this.derive(function (x) {
        return D.unpack(x ? thenClause : elseClause);
      });
    },

    mThen: function (thenClause, elseClause) {
      return this.derive(function (x) {
        return D.unpack(util_some(x) ? thenClause : elseClause);
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

      return util_setEquals(this._clone(), equals);
    },

    __equals: function (a, b) {
      return (this._equals || opts.equals)(a, b);
    },
  };

  x.switch = function () {
    var args = arguments;
    return this.derive(function (x) {
      var i;
      for (i = 0; i < args.length-1; i+=2) {
        if (opts.equals(x, D.unpack(args[i]))) {
          return D.unpack(args[i+1]);
        }
      }
      if (i === args.length - 1) {
        return D.unpack(args[i]);
      }
    });
  };

  return x;
}

function derivation_createPrototype (D, opts) {
  return {
    _clone: function () {
      return util_setEquals(D.derivation(this._deriver), this._equals);
    },

    _forceEval: function () {
      var that = this;
      var newVal = null;
      var parents = parents_capturingParentsEpochs(function () {
        if (!util_DEBUG_MODE) {
          newVal = that._deriver();
        } else {
          try {
            newVal = that._deriver();
          } catch (e) {
            console.error(that.stack);
            throw e;
          }
        }
      });

      if (!this.__equals(newVal, this._value)) {
        this._epoch++;
      }


      this._lastParentsEpochs = parents;
      this._value = newVal;
    },

    _update: function () {
      var globalEpoch = transactions_currentCtx === null ?
                         epoch_globalEpoch :
                         transactions_currentCtx.globalEpoch;
      if (this._lastGlobalEpoch !== globalEpoch) {
        console.log('trace a');
        if (this._value === util_unique) {
          console.log('trace b');
          // brand spanking new, so force eval
          this._forceEval();
        } else {
          console.log('trace c');
          for (var i = 0, len = this._lastParentsEpochs.length; i < len; i += 2) {
            console.log('trace d');
            var parent_1 = this._lastParentsEpochs[i];
            var lastParentEpoch = this._lastParentsEpochs[i + 1];
            var currentParentEpoch;
            if (parent_1._type === types_ATOM) {
              currentParentEpoch = parent_1._getEpoch();
            } else {
              parent_1._update();
              currentParentEpoch = parent_1._epoch;
            }
            if (currentParentEpoch !== lastParentEpoch) {
              console.log('trace e');
              this._forceEval();
              return;
            }
          }
        }
        this._lastGlobalEpoch = globalEpoch;
      }
    },

    get: function () {
      var idx = parents_captureParent(this);
      this._update();
      parents_captureEpoch(idx, this._epoch);
      return this._value;
    },
  };
}

function derivation_construct(obj, deriver) {
  obj._deriver = deriver;
  obj._lastParentsEpochs = [];
  obj._lastGlobalEpoch = epoch_globalEpoch - 1;
  obj._epoch = 0;
  obj._type = types_DERIVATION;
  obj._value = util_unique;
  obj._equals = null;

  if (util_DEBUG_MODE) {
    obj.stack = Error().stack;
  }

  return obj;
}

function mutable_createPrototype (D, _) {
  return {
    swap: function (f) {
      var args = util_slice(arguments, 0);
      args[0] = this.get();
      return this.set(f.apply(null, args));
    },
    lens: function (monoLensDescriptor) {
      var that = this;
      return D.lens({
        get: function () {
          return monoLensDescriptor.get(that.get());
        },
        set: function (val) {
          that.set(monoLensDescriptor.set(that.get(), val));
        }
      });
    },
  };
}

function lens_createPrototype(D, _) {
  return {
    _clone: function () {
      return util_setEquals(D.lens(this._lensDescriptor), this._equals);
    },

    set: function (value) {
      var that = this;
      D.atomically(function () {
        that._lensDescriptor.set(value);
      });
      return this;
    },
  };
}

function lens_construct(derivation, descriptor) {
  derivation._lensDescriptor = descriptor;
  derivation._type = types_LENS;

  return derivation;
}

function atom_createPrototype (D, opts) {
  return {
    _clone: function () {
      return util_setEquals(D.atom(this._value), this._equals);
    },

    set: function (value) {
      if (transactions_currentCtx !== null) {
        var inTxnThis = void 0;
        if ((inTxnThis = transactions_currentCtx.id2txnAtom[this._id]) !== void 0 &&
            value !== inTxnThis._value) {
          transactions_currentCtx.globalEpoch++;
          inTxnThis._epoch++;
          inTxnThis._value = value;
        } else if (!this.__equals(value, this._value)) {
          transactions_currentCtx.globalEpoch++;
          inTxnThis = this._clone();
          inTxnThis._value = value;
          inTxnThis._id = this._id;
          inTxnThis._epoch = this._epoch + 1;
          transactions_currentCtx.id2txnAtom[this._id] = inTxnThis;
          util_addToArray(transactions_currentCtx.modifiedAtoms, this);
        }
      } else {
        if (!this.__equals(value, this._value)) {
          this._set(value);
          this._reactors.forEach(function (r) { return r._maybeReact(); });
        }
      }
    },

    _set: function (value) {
      epoch_globalEpoch++;
      this._epoch++;
      this._value = value;
    },

    get: function () {
      var inTxnThis;
      var txnCtx = transactions_currentCtx;
      while (txnCtx !== null) {
        inTxnThis = txnCtx.id2txnAtom[this._id];
        if (inTxnThis !== void 0) {
          parents_captureEpoch(parents_captureParent(this), inTxnThis._epoch);
          return inTxnThis._value;
        }
        else {
          txnCtx = txnCtx.parent;
        }
      }
      parents_captureEpoch(parents_captureParent(this), this._epoch);
      return this._value;
    },

    _getEpoch: function () {
      var inTxnThis;
      var txnCtx = transactions_currentCtx;
      while (txnCtx !== null) {
        inTxnThis = txnCtx.id2txnAtom[this._id];
        if (inTxnThis !== void 0) {
          return inTxnThis._epoch;
        }
        else {
          txnCtx = txnCtx.parent;
        }
      }
      return this._epoch;
    },
  };
}

function atom_construct (atom, value) {
  atom._id = util_nextId();
  atom._reactors = [];
  atom._epoch = 0;
  atom._value = value;
  atom._type = types_ATOM;
  atom._equals = null;
  return atom;
}

function atom_transaction (f) {
  return function () {
    var args = util_slice(arguments, 0);
    var that = this;
    var result;
    transactions_transact(function () {
      result = f.apply(that, args);
    });
    return result;
  }
}

var ticker = null;

function atom_ticker () {
  if (ticker) {
    ticker.refCount++;
  } else {
    ticker = transactions_ticker();
    ticker.refCount = 1;
  }
  var done = false;
  return {
    tick: function () {
      if (done) throw new Error('tyring to use ticker after release');
      ticker.tick();
    },
    release: function () {
      if (done) throw new Error('ticker already released');
      if (--ticker.refCount === 0) {
        ticker.stop();
        ticker = null;
      }
      done = true;
    },
  };
}

var defaultConfig = { equals: util_equals };

function constructModule (config) {
  config = util_extend({}, defaultConfig, config || {});

  var D = {
    transact: transactions_transact,
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
    if (transactions_inTransaction()) {
      f();
    } else {
      D.transact(f);
    }
  };

  D.derivation = function (f) {
    return derivation_construct(Object.create(Derivation), f);
  };

  /**
   * Template string tag for derivable strings
   */
  D.derive = function (parts) {
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
  };

  /**
   * creates a new lens
   */
  D.lens = function (descriptor) {
    return lens_construct(
      derivation_construct(Object.create(Lens), descriptor.get),
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
    }
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
    }
  }
  function identity (x) { return x; }
  function complement (f) { return function (x) { return !f(x); }}
  D.or = andOrFn(identity);
  D.mOr = andOrFn(util_some);
  D.and = andOrFn(complement(identity));
  D.mAnd = andOrFn(complement(util_some));

  return D;
}

util_extend(exports, constructModule());
exports.withEquality = function (equals) {
  return constructModule({equals: equals});
};
exports['default'] = exports;

});

//# sourceMappingURL=derivable.js.map