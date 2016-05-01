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
'use strict';

const keys = Object.keys;

const assign = Object.assign || function (obj) {
  for (var i = 1; i < arguments.length; i++) {
    var other = arguments[i];
    var keys = keys(other);
    for (var j = keys.length; j--;) {
      var prop = keys[j];
      obj[prop] = other[prop];
    }
  }
};

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

function equals (a, b) {
  return _is(a, b) || (a && typeof a.equals === 'function' && a.equals(b));
};

function addToArray (a, b) {
  var i = a.indexOf(b);
  if (i < 0) {
    a.push(b);
  }
};

function removeFromArray (a, b) {
  var i = a.indexOf(b);
  if (i >= 0) {
    a.splice(i, 1);
  }
};

var _nextId = 0;
function nextId () {
  return _nextId++;
};

function slice (a, i) {
  return Array.prototype.slice.call(a, i);
};

const unique = Object.freeze({equals: function () { return false; }});

function some (x) {
  return (x !== null) && (x !== void 0);
};

var DEBUG_MODE = false;
function setDebugMode (val) {
  DEBUG_MODE = !!val;
};

function setEquals (derivable, equals) {
  derivable._equals = equals;
  return derivable;
};

var epoch = {globalEpoch: 0};

var TransactionAbortion = {};

function initiateAbortion() {
  throw TransactionAbortion;
}

function TransactionContext(parent) {
  this.parent = parent;
  this.id2txnAtom = {};
  this.globalEpoch = epoch.globalEpoch;
  this.modifiedAtoms = [];
}

var currentCtx = null;

function inTransaction () {
  return currentCtx !== null;
};

function transact (f) {
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
};

function beginTransaction() {
  currentCtx = new TransactionContext(currentCtx);
}

function commitTransaction() {
  var ctx = currentCtx;
  currentCtx = ctx.parent;
  var reactorss = [];
  ctx.modifiedAtoms.forEach(function (a) {
    if (currentCtx !== null) {
      a.set(ctx.id2txnAtom[a._id]._value);
    }
    else {
      a._set(ctx.id2txnAtom[a._id]._value);
      reactorss.push(a._reactors);
    }
  });
  if (currentCtx === null) {
    epoch.globalEpoch = ctx.globalEpoch;
  } else {
    currentCtx.globalEpoch = ctx.globalEpoch;
  }
  reactorss.forEach(function (reactors) {
    reactors.forEach(function (r) {
      r._maybeReact();
    });
  });
}

function abortTransaction() {
  var ctx = currentCtx;
  currentCtx = ctx.parent;
  if (currentCtx === null) {
    epoch.globalEpoch = ctx.globalEpoch + 1;
  }
  else {
    currentCtx.globalEpoch = ctx.globalEpoch + 1;
  }
}

function ticker () {
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
  };
};

var parentsStack = [];

function capturingParentsEpochs (f) {
  var i = parentsStack.length;
  parentsStack.push([]);
  try {
    f();
    return parentsStack[i];
  } finally {
    parentsStack.pop();
  }
};

function captureParent (p) {
  if (parentsStack.length > 0) {
    var top = parentsStack[parentsStack.length - 1];
    top.push(p, 0);
    return top.length-1;
  } else {
    return -1;
  }
};

function captureEpoch (idx, epoch) {
  if (parentsStack.length > 0) {
    parentsStack[parentsStack.length - 1][idx] = epoch;
  }
};

const ATOM = "ATOM";
const DERIVATION = "DERIVATION";
const LENS = "LENS";
const REACTION = "REACTION";

function createPrototype (D, opts) {
  return {
    _clone: function () {
      return setEquals(D.atom(this._value), this._equals);
    },

    set: function (value) {
      if (currentCtx !== null) {
        var inTxnThis = void 0;
        if ((inTxnThis = currentCtx.id2txnAtom[this._id]) !== void 0 &&
            value !== inTxnThis._value) {
          currentCtx.globalEpoch++;
          inTxnThis._epoch++;
          inTxnThis._value = value;
        } else if (!this.__equals(value, this._value)) {
          currentCtx.globalEpoch++;
          inTxnThis = this._clone();
          inTxnThis._value = value;
          inTxnThis._id = this._id;
          inTxnThis._epoch = this._epoch + 1;
          currentCtx.id2txnAtom[this._id] = inTxnThis;
          addToArray(currentCtx.modifiedAtoms, this);
        }
      } else {
        if (!this.__equals(value, this._value)) {
          this._set(value);
          this._reactors.forEach(function (r) { return r._maybeReact(); });
        }
      }
    },

    _set: function (value) {
      epoch.globalEpoch++;
      this._epoch++;
      this._value = value;
    },

    get: function () {
      var inTxnThis;
      var txnCtx = currentCtx;
      while (txnCtx !== null) {
        inTxnThis = txnCtx.id2txnAtom[this._id];
        if (inTxnThis !== void 0) {
          captureEpoch(captureParent(this), inTxnThis._epoch);
          return inTxnThis._value;
        }
        else {
          txnCtx = txnCtx.parent;
        }
      }
      captureEpoch(captureParent(this), this._epoch);
      return this._value;
    },

    _getEpoch: function () {
      var inTxnThis;
      var txnCtx = currentCtx;
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
};

function construct (atom, value) {
  atom._id = nextId();
  atom._reactors = [];
  atom._epoch = 0;
  atom._value = value;
  atom._type = ATOM;
  atom._equals = null;
  return atom;
};

function transaction (f) {
  return function () {
    var args = slice(arguments, 0);
    var that = this;
    var result;
    transact(function () {
      result = f.apply(that, args);
    });
    return result;
  };
};

var _ticker = null;

function ticker$1 () {
  if (_ticker) {
    _ticker.refCount++;
  } else {
    _ticker = ticker();
    _ticker.refCount = 1;
  }
  var done = false;
  return {
    tick: function () {
      if (done) throw new Error('tyring to use ticker after release');
      _ticker.tick();
    },
    release: function () {
      if (done) throw new Error('ticker already released');
      if (--_ticker.refCount === 0) {
        _ticker.stop();
        _ticker = null;
      }
      done = true;
    },
  };
};

var reactorParentStack = [];

function Reactor(react, derivable) {
  this._derivable = derivable;
  if (react) {
    this.react = react;
  }
  this._atoms = [];
  this._parent = null;
  this._active = false;
  this._yielding = false;
  this._reacting = false;
  this._type = REACTION;
  if (DEBUG_MODE) {
    this.stack = Error().stack;
  }
}

function captureAtoms(derivable, atoms) {
  if (derivable._type === ATOM) {
    addToArray(atoms, derivable);
  }
  else {
    for (var i = 0, len = derivable._lastParentsEpochs.length; i < len; i += 2) {
      captureAtoms(derivable._lastParentsEpochs[i], atoms);
    }
  }
}

assign(Reactor.prototype, {
  start: function () {
    this._lastValue = this._derivable.get();
    this._lastEpoch = this._derivable._epoch;
    this._atoms = [];
    captureAtoms(this._derivable, this._atoms);
    var that = this;
    this._atoms.forEach(function (atom) {
      addToArray(atom._reactors, that);
    });

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
      if (DEBUG_MODE) {
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

    return this;
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
      // maybe the reactor was stopped by the parent
      if (this._active) {
        var nextValue = this._derivable.get();
        if (this._derivable._epoch !== this._lastEpoch &&
            !this._derivable.__equals(nextValue, this._lastValue)) {
          this._force(nextValue);
        }

        // need to check atoms regardless of whether reactions happens
        // TODO: incorporate atom capturing into .get somehow
        this._lastEpoch = this._derivable._epoch;
        this._lastValue = nextValue;
        var oldAtoms = this._atoms;
        var newAtoms = [];
        this._atoms = newAtoms;
        captureAtoms(this._derivable, newAtoms);

        var that = this;

        newAtoms.forEach(function (atom) {
          var idx = oldAtoms.indexOf(atom);
          if (idx === -1) {
            addToArray(atom._reactors, that);
          } else {
            oldAtoms[idx] = null;
          }
        });

        oldAtoms.forEach(function (atom) {
          if (atom !== null) {
            removeFromArray(atom._reactors, that);
          }
        });
      }
    }
  },
  stop: function () {
    var _this = this;
    this._atoms.forEach(function (atom) {
      return removeFromArray(atom._reactors, _this);
    });
    this._atoms = [];
    this._parent = null;
    this._active = false;
    this.onStop && this.onStop();
    return this;
  },
  orphan: function () {
    this._parent = null;
    return this;
  },
  adopt: function (child) {
    child._parent = this;
    return this;
  },
  isActive: function () {
    return this._active;
  },
});

function createPrototype$1 (D, opts) {
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
        var args = ([that]).concat(slice(arguments, 1));
        return D.derivation(function () {
          return f.apply(null, args.map(D.unpack));
        });
      }
    },



    reactor: function (f) {
      if (typeof f === 'function') {
        return new Reactor(f, this);
      } else if (f instanceof Reactor) {
        if (typeof f.react !== 'function') {
          throw new Error('reactor missing .react method');
        }
        f._derivable = this;
        return f;
      } else if (f && f.react) {
        return assign(new Reactor(null, this), f);
      } else {
        throw new Error("Unrecognized type for reactor " + f);
      }
    },

    react: function (f, opts) {
      if (typeof f !== 'function') {
        throw Error('the first argument to .react must be a function');
      }

      opts = assign({
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
        return D.unpack(some(x) ? thenClause : elseClause);
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

      return setEquals(this._clone(), equals);
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
};

function createPrototype$2 (D, opts) {
  return {
    _clone: function () {
      return setEquals(D.derivation(this._deriver), this._equals);
    },

    _forceEval: function () {
      var that = this;
      var newVal = null;
      var capturedParentsEpochs = capturingParentsEpochs(function () {
        if (!DEBUG_MODE) {
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


      this._lastParentsEpochs = capturedParentsEpochs;
      this._value = newVal;
    },

    _update: function () {
      var globalEpoch = currentCtx === null ?
                         epoch.globalEpoch :
                         currentCtx.globalEpoch;
      if (this._lastGlobalEpoch !== globalEpoch) {
        if (this._value === unique) {
          // brand spanking new, so force eval
          this._forceEval();
        } else {
          for (var i = 0, len = this._lastParentsEpochs.length; i < len; i += 2) {
            var parent_1 = this._lastParentsEpochs[i];
            var lastParentEpoch = this._lastParentsEpochs[i + 1];
            var currentParentEpoch;
            if (parent_1._type === ATOM) {
              currentParentEpoch = parent_1._getEpoch();
            } else {
              parent_1._update();
              currentParentEpoch = parent_1._epoch;
            }
            if (currentParentEpoch !== lastParentEpoch) {
              this._forceEval();
              return;
            }
          }
        }
        this._lastGlobalEpoch = globalEpoch;
      }
    },

    get: function () {
      var idx = captureParent(this);
      this._update();
      captureEpoch(idx, this._epoch);
      return this._value;
    },
  };
};

function construct$1 (obj, deriver) {
  obj._deriver = deriver;
  obj._lastParentsEpochs = [];
  obj._lastGlobalEpoch = epoch.globalEpoch - 1;
  obj._epoch = 0;
  obj._type = DERIVATION;
  obj._value = unique;
  obj._equals = null;

  if (DEBUG_MODE) {
    obj.stack = Error().stack;
  }

  return obj;
};

function createPrototype$3 (D, _) {
  return {
    swap: function (f) {
      var args = slice(arguments, 0);
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
};

function createPrototype$4 (D, _) {
  return {
    _clone: function () {
      return setEquals(D.lens(this._lensDescriptor), this._equals);
    },

    set: function (value) {
      var that = this;
      D.atomically(function () {
        that._lensDescriptor.set(value);
      });
      return this;
    },
  };
};

function construct$2 (derivation, descriptor) {
  derivation._lensDescriptor = descriptor;
  derivation._type = LENS;

  return derivation;
};

var defaultConfig = { equals: equals };

function constructModule (config) {
  config = assign({}, defaultConfig, config || {});

  var D = {
    transact: transact,
    defaultEquals: equals,
    setDebugMode: setDebugMode,
    transaction: transaction,
    ticker: ticker$1,
    Reactor: Reactor,
    isAtom: function (x) {
      return x && (x._type === ATOM || x._type === LENS);
    },
    isDerivable: function (x) {
      return x && (x._type === ATOM ||
                   x._type === LENS ||
                   x._type === DERIVATION);
    },
    isDerivation: function (x) {
      return x && (x._type === DERIVATION || x._type === LENS);
    },
    isLensed: function (x) {
      return x && x._type === LENS;
    },
    isReactor: function (x) {
      return x && x._type === REACTION;
    },
  };

  var Derivable  = createPrototype$1(D, config);
  var Mutable    = createPrototype$3(D, config);

  var Atom       = assign({}, Mutable, Derivable,
                               createPrototype(D, config));

  var Derivation = assign({}, Derivable,
                               createPrototype$2(D, config));

  var Lens       = assign({}, Mutable, Derivation,
                              createPrototype$4(D, config));


  /**
   * Constructs a new atom whose state is the given value
   */
  D.atom = function (val) {
    return construct(Object.create(Atom), val);
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
    if (inTransaction()) {
      f();
    } else {
      D.transact(f);
    }
  };

  D.derivation = function (f) {
    return construct$1(Object.create(Derivation), f);
  };

  /**
   * Template string tag for derivable strings
   */
  D.derive = function (parts) {
    var args = slice(arguments, 1);
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
    return construct$2(
      construct$1(Object.create(Lens), descriptor.get),
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
      var keys$$ = keys(thing);
      for (var i = keys$$.length; i--;) {
        var prop = keys$$[i];
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
  D.mOr = andOrFn(some);
  D.and = andOrFn(complement(identity));
  D.mAnd = andOrFn(complement(some));

  return D;
}

assign(exports, constructModule());
exports.withEquality = function (equals) {
  return constructModule({equals: equals});
};
exports['default'] = exports;});
