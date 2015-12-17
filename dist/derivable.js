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

function util_arrayContains (a, b) {
  return a.indexOf(b) >= 0;
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

// node modes
var gc_NEW = 0,
    gc_CHANGED = 1,
    gc_UNCHANGED = 2,
    gc_ORPHANED = 3,
    gc_UNSTABLE = 4,
    gc_STABLE = 5,
    gc_DISOWNED = 6;

function gc_mark(node, reactors) {
  // make everything unstable
  if (node._type === types_REACTION) {
    if (node.reacting) {
      throw new Error("Cycle detected! Don't do this!");
    }
    reactors.push(node);
  } else {
    for (var i = node._children.length; i--;) {
      var child = node._children[i];
      if (child._state !== gc_UNSTABLE) {
        child._state = gc_UNSTABLE;
        gc_mark(child, reactors);
      }
    }
  }
}

function gc_sweep(node) {
  var i;
  switch (node._state) {
  case gc_CHANGED:
  case gc_UNCHANGED:
    // changed or unchanged means the node was visited
    // during the react phase, which means we keep it in
    // the graph for the next go round
    for (i = node._children.length; i--;) {
      var child = node._children[i];
      gc_sweep(child);
      if (child._state !== gc_STABLE) {
        node._children.splice(i, 1);
      }
    }
    node._state = gc_STABLE;
    break;
  case gc_UNSTABLE:
    if (node._type === types_REACTION) {
      // only happens when reaction created in transaction. see issue #14
      node._state = gc_STABLE;
    } else {
      // unstable means the node was not visited during
      // the react phase, which means we kick it out of the
      // graph.

      // but first we check if all of its parents were unchanged
      // if so, we can avoid recalculating it in future by
      // caching its parents' current values.
      var stashedParentStates = [];
      for (i = node._parents.length; i--;) {
        var parent = node._parents[i];
        if (parent._state !== gc_UNCHANGED) {
          // nope, its parents either have changed or weren't visited,
          // so we have to orphan this node
          node._state = gc_ORPHANED;
          break;
        }
        stashedParentStates.push([parent, parent._value]);
      }
      if (node._state !== gc_ORPHANED) {
        node._state = gc_DISOWNED;
        node._parents = stashedParentStates;
      }
    }
    break;
  case gc_STABLE:
  case gc_ORPHANED:
  case gc_DISOWNED:
    break;
  default:
    throw new Error("can't sweep state " + node._state);
  }
}

function gc_abort_sweep(node) {
  // set everything to unstable, kill all derivation caches and disconnect
  // the graph
  var doChildren = false;
  switch (node._type) {
  case types_ATOM:
    node._state = gc_STABLE;
    doChildren = true;
    break;
  case types_DERIVATION:
  case types_LENS:
    node._state = gc_NEW;
    node._value = util_unique;
    doChildren = true;
    break;
  case types_REACTION:
    node._state = gc_STABLE;
    doChildren = false;
    break;
  }
  if (doChildren) {
    for (var i = node._children.length; i--;) {
      gc_abort_sweep(node._children[i]);
    }
    node._children = [];
  }
}

var parentsStack = [];

function parents_capturingParents(f) {
  var i = parentsStack.length;
  parentsStack.push([]);
  try {
    f();
    return parentsStack[i];
  } finally {
    parentsStack.pop();
  }
}

function parents_maybeCaptureParent(p) {
  if (parentsStack.length > 0) {
    util_addToArray(parentsStack[parentsStack.length - 1], p);
  }
}

var types_ATOM = "ATOM",
    types_DERIVATION = "DERIVATION",
    types_LENS = "LENS",
    types_REACTION = "REACTION";

var RUNNING = 0,
    COMPLETED = 1,
    ABORTED = 3;

var TransactionAbortion = {};

function abortTransaction() {
  throw TransactionAbortion;
}

function transactions_newContext () {
  return {currentTxn: null};
}

function transactions_inTransaction (ctx) {
  return ctx.currentTxn !== null;
}

function transactions_currentTransaction (ctx) {
  return ctx.currentTxn;
}

function begin (ctx, txn) {
  txn._parent = ctx.currentTxn;
  txn._state = RUNNING;
  ctx.currentTxn = txn;
}

function popTransaction (ctx, cb) {
  var txn = ctx.currentTxn;
  ctx.currentTxn = txn._parent;
  if (txn._state !== RUNNING) {
    throw new Error("unexpected state: " + txn._state);
  }
  cb(txn);
}

function commit (ctx) {
  popTransaction(ctx, function (txn) {
    txn._state = COMPLETED;
    txn.onCommit && txn.onCommit();
  });
}

function abort (ctx) {
  popTransaction(ctx, function (txn) {
    txn._state = ABORTED;
    txn.onAbort && txn.onAbort();
  });
}

function transactions_transact (ctx, txn, f) {
  begin(ctx, txn);
  try {
    f(abortTransaction);
  } catch (e) {
    abort(ctx);
    if (e !== TransactionAbortion) {
      throw e;
    } else {
      return;
    }
  }
  commit(ctx);
}

function transactions_ticker (ctx, txnConstructor) {
  begin(ctx, txnConstructor());
  var disposed = false;
  return {
    tick: function () {
      if (disposed) throw new Error("can't tick disposed ticker");
      commit(ctx);
      begin(ctx, txnConstructor());
    },
    stop: function () {
      if (disposed) throw new Error("ticker already disposed");
      commit(ctx);
    }
  }
}

function reactorBase (parent, control) {
  var base = {
    control: control,      // the actual object the user gets
    parent: parent,        // the parent derivable
    parentReactor: null,
    dependentReactors: [],
    _state: gc_STABLE,
    active: false,         // whether or not listening for changes in parent
    _type: types_REACTION,
    uid: util_nextId(),
    reacting: false,       // whether or not reaction function being invoked
    yielding: false,       // whether or not letting parentReactor react first
  };
  if (util_DEBUG_MODE) {
    base.stack = Error().stack;
  }
  return base;
}
var cycleMsg = "Cyclical Reactor Dependency! Not allowed!";

function stop (base) {
  if (base.active) {
    util_removeFromArray(base.parent._children, base);
    if (base.parentReactor) {
      orphan(base);
    }
    base.active = false;
    base.control.onStop && base.control.onStop();
  }
}

var parentReactorStack = [];

function start (base) {
  if (!base.active) {
    util_addToArray(base.parent._children, base);
    base.active = true;
    base.parent._get();
    // capture reactor dependency relationships
    var len = parentReactorStack.length;
    if (len > 0) {
      base.parentReactor = parentReactorStack[len - 1];
    }

    base.control.onStart && base.control.onStart();
  }
}

function orphan (base) {
  if (base.parentReactor) {
    base.parentReactor = null;
  }
}

function adopt (parentBase, childBase) {
  childBase.parentReactor = parentBase;
}

function reactors_maybeReact (base) {
  if (base.yielding) {
    throw Error(cycleMsg);
  }
  if (base.active && base._state === gc_UNSTABLE) {
    if (base.parentReactor !== null) {
      try {
        base.yielding = true;
        reactors_maybeReact(base.parentReactor);
      } finally {
        base.yielding = false;
      }
    }
    // parent might have deactivated this one
    if (base.active) {
      var parent = base.parent, parentState = parent._state;
      if (parentState === gc_UNSTABLE ||
          parentState === gc_ORPHANED ||
          parentState === gc_DISOWNED ||
          parentState === gc_NEW) {
        parent._get();
      }
      parentState = parent._state;

      if (parentState === gc_UNCHANGED) {
        base._state = gc_STABLE;
      } else if (parentState === gc_CHANGED) {
        force(base);
      } else {
          throw new Error("invalid parent state: " + parentState);
      }
    }
  }
}

function force (base) {
  // base.reacting check now in gc_mark; total solution there as opposed to here
  if (base.control.react) {
    base._state = gc_STABLE;
    try {
      base.reacting = true;
      parentReactorStack.push(base);
      if (!util_DEBUG_MODE) {
        base.control.react(base.parent._get());
      } else {
        try {
          base.control.react(base.parent._get());
        } catch (e) {
          console.error(base.stack);
          throw e;
        }
      }
    } finally {
      parentReactorStack.pop();
      base.reacting = false;
    }
  } else {
      throw new Error("No reactor function available.");
  }
}

function reactors_Reactor () {
  /*jshint validthis:true */
  this._type = types_REACTION;
}

function reactors_createBase (control, parent) {
  if (control._base) {
    throw new Error("This reactor has already been initialized");
  }
  control._base = reactorBase(parent, control);
  return control;
}

util_extend(reactors_Reactor.prototype, {
  start: function () {
    start(this._base);
    return this;
  },
  stop: function () {
    stop(this._base);
    return this;
  },
  force: function () {
    force(this._base);
    return this;
  },
  isActive: function () {
    return this._base.active;
  },
  orphan: function () {
    orphan(this._base);
    return this;
  },
  adopt: function (child) {
    if (child._type !== types_REACTION) {
      throw Error("reactors can only adopt reactors");
    }
    adopt(this._base, child._base);
    return this;
  }
});

function reactors_StandardReactor (f) {
  /*jshint validthis:true */
  this._type = types_REACTION;
  this.react = f;
}

util_extend(reactors_StandardReactor.prototype, reactors_Reactor.prototype);

function reactors_anonymousReactor (descriptor) {
  return util_extend(new reactors_Reactor(), descriptor);
}

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
        return reactors_createBase(new reactors_StandardReactor(f), this);
      } else if (f instanceof reactors_Reactor) {
        return reactors_createBase(f, this);
      } else if (f && f.react) {
        return reactors_createBase(reactors_anonymousReactor(f), this);
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

    get: function () {
      parents_maybeCaptureParent(this);
      return this._get(); // abstract protected method, in Java parlance
    },

    is: function (other) {
      return D.lift(opts.equals)(this, other);
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

    _forceGet: function () {
      var that = this,
          i;
      var newParents = parents_capturingParents(function () {
        var newState;
        if (!util_DEBUG_MODE) {
          newState = that._deriver();
        } else {
          try {
            newState = that._deriver();
          } catch (e) {
            console.error(that._stack);
            throw e;
          }
        }
        var equals = that._equals || opts.equals;
        that._state = equals(newState, that._value) ? gc_UNCHANGED : gc_CHANGED;
        that._value = newState;
      });

      // organise parents
      for (i = this._parents.length; i--;) {
        var possiblyFormerParent = this._parents[i];
        if (!util_arrayContains(newParents, possiblyFormerParent)) {
          util_removeFromArray(possiblyFormerParent._children, this);
        }
      }

      this._parents = newParents;

      // add this as child to new parents
      for (i = newParents.length; i--;) {
        util_addToArray(newParents[i]._children, this);
      }
    },

    _get: function () {
      var i, parent;
      outer: switch (this._state) {
      case gc_NEW:
      case gc_ORPHANED:
        this._forceGet();
        break;
      case gc_UNSTABLE:
        for (i = 0; i < this._parents.length; i++) {
          parent = this._parents[i];
          var parentState = parent._state;
          if (parentState === gc_UNSTABLE ||
              parentState === gc_ORPHANED ||
              parentState === gc_DISOWNED) {
            parent._get();
          }
          parentState = parent._state;
          if (parentState === gc_CHANGED) {
            this._forceGet();
            break outer;
          } else if (!(parentState === gc_STABLE ||
                       parentState === gc_UNCHANGED)) {
            throw new Error("invalid parent mode: " + parentState);
          }
        }
        this._state = gc_UNCHANGED;
        break;
      case gc_DISOWNED:
        var parents = [];
        for (i = 0; i < this._parents.length; i++) {
          var parentStateTuple = this._parents[i],
              state = parentStateTuple[1];
          parent = parentStateTuple[0];
          if (!opts.equals(parent._get(), state)) {
            this._parents = [];
            this._forceGet();
            break outer;
          } else {
            parents.push(parent);
          }
        }
        for (i = parents.length; i--;) {
          util_addToArray(parents[i]._children, this);
        }
        this._parents = parents;
        this._state = gc_UNCHANGED;
        break;
      default:
        // noop
      }

      return this._value;
    }
  }
}

function derivation_construct(obj, deriver) {
  obj._children = [];
  obj._parents = [];
  obj._deriver = deriver;
  obj._state = gc_NEW;
  obj._type = types_DERIVATION;
  obj._value = util_unique;
  obj._equals = null;

  if (util_DEBUG_MODE) {
    obj._stack = Error().stack;
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
    }
  }
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
    }
  }
}

function lens_construct(derivation, descriptor) {
  derivation._lensDescriptor = descriptor;
  derivation._type = types_LENS;

  return derivation;
}

function processReactorQueue (rq) {
  for (var i = rq.length; i--;) {
    reactors_maybeReact(rq[i]);
  }
}

var TXN_CTX = transactions_newContext();

function atom_inTxn () {
  return transactions_inTransaction(TXN_CTX)
}

var NOOP_ARRAY = {push: function () {}};

function TransactionState () {
  this.inTxnValues = {};
  this.reactorQueue = [];
}

function getState (txnState, atom) {
  var inTxnValue = txnState.inTxnValues[atom._uid];
  if (inTxnValue) {
    return inTxnValue[1];
  } else {
    return atom._value;
  }
}

function setState (txnState, atom, state) {
  txnState.inTxnValues[atom._uid] = [atom, state];
  gc_mark(atom, txnState.reactorQueue);
}

util_extend(TransactionState.prototype, {
  onCommit: function () {
    var i, atomValueTuple;
    var keys = util_keys(this.inTxnValues);
    if (atom_inTxn()) {
      // push in-txn vals up to current txn
      for (i = keys.length; i--;) {
        atomValueTuple = this.inTxnValues[keys[i]];
        atomValueTuple[0].set(atomValueTuple[1]);
      }
    } else {
      // change root state and run reactors.
      for (i = keys.length; i--;) {
        atomValueTuple = this.inTxnValues[keys[i]];
        atomValueTuple[0]._value = atomValueTuple[1];
        gc_mark(atomValueTuple[0], NOOP_ARRAY);
      }

      processReactorQueue(this.reactorQueue);

      // then sweep for a clean finish
      for (i = keys.length; i--;) {
        gc_sweep(this.inTxnValues[keys[i]][0]);
      }
    }
  },

  onAbort: function () {
    if (!atom_inTxn()) {
      var keys = util_keys(this.inTxnValues);
      for (var i = keys.length; i--;) {
        gc_abort_sweep(this.inTxnValues[keys[i]][0]);
      }
    }
  }
})


function atom_createPrototype (D, opts) {
  return {
    _clone: function () {
      return util_setEquals(D.atom(this._value), this._equals);
    },

    withValidator: function (f) {
      if (f === null) {
        return this._clone();
      } if (typeof f === 'function') {
        var result = this._clone();
        var existing = this._validator;
        if (existing) {
          result._validator = function (x) { return f(x) && existing(x); }
        } else {
          result._validator = f;
        }
        return result;
      } else {
        throw new Error(".withValidator expects function or null");
      }
    },

    validate: function () {
      this._validate(this.get());
    },

    _validate: function (value) {
      var validationResult = this._validator && this._validator(value);
      if (this._validator && validationResult !== true) {
        throw new Error("Failed validation with value: '" + value + "'." +
                        " Validator returned '" + validationResult + "' ");
      }
    },

    set: function (value) {

      this._validate(value);
      var equals = this._equals || opts.equals;
      if (!equals(value, this._value)) {
        this._state = gc_CHANGED;

        if (atom_inTxn()) {
          setState(transactions_currentTransaction(TXN_CTX), this, value);
        } else {
          this._value = value;

          var reactorQueue = [];
          gc_mark(this, reactorQueue);
          processReactorQueue(reactorQueue);
          gc_sweep(this);
        }
      }
      return this;
    },

    _get: function () {
      if (atom_inTxn()) {
        return getState(transactions_currentTransaction(TXN_CTX), this);
      }
      return this._value;
    }
  };
}

function atom_construct (atom, value) {
  atom._uid = util_nextId();
  atom._children = [];
  atom._state = gc_STABLE;
  atom._value = value;
  atom._type = types_ATOM;
  atom._equals = null;
  return atom;
}

function atom_transact (f) {
  transactions_transact(TXN_CTX, new TransactionState(), f);
}

function atom_transaction (f) {
  return function () {
    var args = util_slice(arguments, 0);
    var that = this;
    var result;
    atom_transact(function () {
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
    ticker = transactions_ticker(TXN_CTX, function () {
      return new TransactionState();
    });
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
    }
  };
}

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