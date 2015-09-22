// UMD loader
(function (global, factory) {
  "use strict";
  if (global && typeof global.define === "function" && global.define.amd) {
    global.define(["exports"], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports);
  } else {
    factory(global.Havelock = {});
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

function _type(obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
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

function _has(p,o) {
  return Object.hasOwnProperty.call(o, p);
}

function _equals(a, b, stackA, stackB) {
  var typeA = _type(a);
  if (typeA !== _type(b)) {
    return false;
  }

  if (typeA === 'Boolean' || typeA === 'Number' || typeA === 'String') {
    return typeof a === 'object' ?
      typeof b === 'object' && _is(a.valueOf(), b.valueOf()) :
      _is(a, b);
  }

  if (_is(a, b)) {
    return true;
  }

  if (typeA === 'RegExp') {
    // RegExp equality algorithm: http://stackoverflow.com/a/10776635
    return (a.source === b.source) &&
           (a.global === b.global) &&
           (a.ignoreCase === b.ignoreCase) &&
           (a.multiline === b.multiline) &&
           (a.sticky === b.sticky) &&
           (a.unicode === b.unicode);
  }

  if (Object(a) === a) {
    if (typeA === 'Date' && a.getTime() !== b.getTime()) {
      return false;
    }

    var keysA = util_keys(a);
    if (keysA.length !== util_keys(b).length) {
      return false;
    }

    var idx = stackA.length - 1;
    while (idx >= 0) {
      if (stackA[idx] === a) {
        return stackB[idx] === b;
      }
      idx -= 1;
    }

    stackA[stackA.length] = a;
    stackB[stackB.length] = b;
    idx = keysA.length - 1;
    while (idx >= 0) {
      var key = keysA[idx];
      if (!_has(key, b) || !_equals(b[key], a[key], stackA, stackB)) {
        return false;
      }
      idx -= 1;
    }
    stackA.pop();
    stackB.pop();
    return true;
  }
  return false;
}

function util_equals (a, b) {
  return a && typeof a.equals === 'function' ?
            a.equals(b) : _equals(a, b, [], []);
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

// node modes
var gc_NEW = 0,
    gc_CHANGED = 1,
    gc_UNCHANGED = 2,
    gc_ORPHANED = 3,
    gc_UNSTABLE = 4,
    gc_STABLE = 5,
    gc_DISOWNED = 6;

function gc_mark(node, reactions) {
  // make everything unstable
  if (node._type === types_REACTION) {
    if (node.reacting) {
      throw new Error("Cycle detected! Don't do this!");
    }
    reactions.push(node);
  } else {
    for (var i = node._children.length; i--;) {
      var child = node._children[i];
      if (child._state !== gc_UNSTABLE) {
        child._state = gc_UNSTABLE;
        gc_mark(child, reactions);
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
  parentsStack.push([]);
  f();
  return parentsStack.pop();
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

function reactionBase (parent, control) {
  return {
    control: control,
    parent: parent,
    _state: gc_STABLE,
    active: false,
    _type: types_REACTION,
    uid: util_nextId(),
    reacting: false
  }
}

function stop (base) {
  util_removeFromArray(base.parent._children, base);
  base.active = false;
  base.control.onStop && base.control.onStop();
}

function start (base) {
  util_addToArray(base.parent._children, base);
  base.active = true;
  base.control.onStart && base.control.onStart();
  base.parent._get();
}

function reactions_maybeReact (base) {
  if (base._state === gc_UNSTABLE) {
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

function force (base) {
  // base.reacting check now in gc_mark; total solution there as opposed to here
  if (base.control.react) {
    base._state = gc_STABLE;
    try {
      base.reacting = true;
      base.control.react(base.parent._get());
    } finally {
      base.reacting = false;
    }
  } else {
      throw new Error("No reaction function available.");
  }
}

function reactions_Reaction () {
  /*jshint validthis:true */
  this._type = types_REACTION;
}

function reactions_createBase (control, parent) {
  if (control._base) {
    throw new Error("This reaction has already been initialized");
  }
  control._base = reactionBase(parent, control);
  return control;
}

util_extend(reactions_Reaction.prototype, {
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
  isRunning: function () {
    return this._base.active;
  }
})

function reactions_StandardReaction (f) {
  /*jshint validthis:true */
  this._type = types_REACTION;
  this.react = f;
}

util_extend(reactions_StandardReaction.prototype, reactions_Reaction.prototype);

function reactions_anonymousReaction (descriptor) {
  return util_extend(new reactions_Reaction(), descriptor);
}

function derivable_createPrototype (havelock, opts) {
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
        return havelock.derivation(function () {
          return f(that.get());
        });
      case 2:
        return havelock.derivation(function () {
          return f(that.get(), havelock.unpack(a));
        });
      case 3:
        return havelock.derivation(function () {
          return f(that.get(), havelock.unpack(a), havelock.unpack(b));
        });
      case 4:
        return havelock.derivation(function () {
          return f(that.get(),
                   havelock.unpack(a),
                   havelock.unpack(b),
                   havelock.unpack(c));
        });
      case 5:
        return havelock.derivation(function () {
          return f(that.get(),
                   havelock.unpack(a),
                   havelock.unpack(b),
                   havelock.unpack(c),
                   havelock.unpack(d));
        });
      default:
        var args = ([that]).concat(util_slice(arguments, 1));
        return havelock.derivation(function () {
          return f.apply(null, args.map(havelock.unpack));
        });
      }
    },

    reaction: function (f) {
      if (typeof f === 'function') {
        return reactions_createBase(new reactions_StandardReaction(f), this);
      } else if (f instanceof reactions_Reaction) {
        return reactions_createBase(f, this);
      } else if (f && f.react) {
        return reactions_createBase(reactions_anonymousReaction(f), this);
      } else {
        throw new Error("Unrecognized type for reaction " + f);
      }
    },

    react: function (f) {
      return this.reaction(f).start().force();
    },

    get: function () {
      parents_maybeCaptureParent(this);
      return this._get(); // abstract protected method, in Java parlance
    },

    is: function (other) {
      return havelock.lift(opts.equals)(this, other);
    },

    and: function (other) {
      return this.derive(function (x) {return x && havelock.unpack(other);});
    },

    or: function (other) {
      return this.derive(function (x) {return x || havelock.unpack(other);});
    },

    then: function (thenClause, elseClause) {
      return this.derive(function (x) {
        return havelock.unpack(x ? thenClause : elseClause);
      });
    },

    some: function (thenClause, elseClause) {
      return this.derive(function (x) {
        return havelock.unpack(x === null || x === (void 0) ? elseClause : thenClause);
      });
    },

    not: function () {
      return this.derive(function (x) { return !x; });
    },
  };
  x.switch = function () {
    var args = arguments;
    return this.derive(function (x) {
      var i;
      for (i = 0; i < args.length-1; i+=2) {
        if (opts.equals(x, havelock.unpack(args[i]))) {
          return havelock.unpack(args[i+1]);
        }
      }
      if (i === args.length - 1) {
        return havelock.unpack(args[i]);
      }
    });
  };
  return x;
}

function derivation_createPrototype (havelock, opts) {
  return {
    _clone: function () {
      return havelock.derivation(this._deriver);
    },

    _forceGet: function () {
      var that = this,
          i;
      var newParents = parents_capturingParents(function () {
        var newState = that._deriver();
        that._state = opts.equals(newState, that._value) ? gc_UNCHANGED : gc_CHANGED;
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
        for (i = this._parents.length; i--;) {
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
        for (i = this._parents.length; i--;) {
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
  return obj;
}

function mutable_createPrototype (havelock, _) {
  return {
    swap: function (f) {
      var args = util_slice(arguments, 0);
      args[0] = this.get();
      return this.set(f.apply(null, args));
    },
    lens: function (lensDescriptor) {
      return havelock.lens(this, lensDescriptor);
    }
  }
}

function lens_createPrototype(havelock, _) {
  return {
    _clone: function () {
      return havelock.lens(this._parent, {
        get: this._getter,
        set: this._setter
      });
    },

    set: function (value) {
      this._parent.set(this._setter(this._parent._get(), value));
      return this;
    }
  }
}

function lens_construct(derivation, parent, descriptor) {
  derivation._getter = descriptor.get;
  derivation._setter = descriptor.set;
  derivation._parent = parent;
  derivation._type = types_LENS;

  return derivation;
}

function processReactionQueue (rq) {
  for (var i = rq.length; i--;) {
    reactions_maybeReact(rq[i]);
  }
}

var TXN_CTX = transactions_newContext();

var NOOP_ARRAY = {push: function () {}};

function TransactionState () {
  this.inTxnValues = {};
  this.reactionQueue = [];
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
  gc_mark(atom, txnState.reactionQueue);
}

util_extend(TransactionState.prototype, {
  onCommit: function () {
    var i, atomValueTuple;
    var keys = util_keys(this.inTxnValues);
    if (transactions_inTransaction(TXN_CTX)) {
      // push in-txn vals up to current txn
      for (i = keys.length; i--;) {
        atomValueTuple = this.inTxnValues[keys[i]];
        atomValueTuple[0].set(atomValueTuple[1]);
      }
    } else {
      // change root state and run reactions.
      for (i = keys.length; i--;) {
        atomValueTuple = this.inTxnValues[keys[i]];
        atomValueTuple[0]._value = atomValueTuple[1];
        gc_mark(atomValueTuple[0], NOOP_ARRAY);
      }

      processReactionQueue(this.reactionQueue);

      // then sweep for a clean finish
      for (i = keys.length; i--;) {
        gc_sweep(this.inTxnValues[keys[i]][0]);
      }
    }
  },

  onAbort: function () {
    if (!transactions_inTransaction(TXN_CTX)) {
      var keys = util_keys(this.inTxnValues);
      for (var i = keys.length; i--;) {
        gc_abort_sweep(this.inTxnValues[keys[i]][0]);
      }
    }
  }
})


function atom_createPrototype (havelock, opts) {
  return {
    _clone: function () {
      return havelock.atom(this._value);
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
      if (!opts.equals(value, this._value)) {
        this._state = gc_CHANGED;

        if (transactions_inTransaction(TXN_CTX)) {
          setState(transactions_currentTransaction(TXN_CTX), this, value);
        } else {
          this._value = value;

          var reactionQueue = [];
          gc_mark(this, reactionQueue);
          processReactionQueue(reactionQueue);
          gc_sweep(this);
        }
      }
      return this;
    },

    _get: function () {
      if (transactions_inTransaction(TXN_CTX)) {
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

function havelock (config) {
  config = util_extend({}, defaultConfig, config || {});

  var Havelock = {
    transact: atom_transact,
    defaultEquals: util_equals,
    transaction: atom_transaction,
    ticker: atom_ticker,
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

  Havelock.ifThenElse = function (testValue, thenClause, elseClause) {
    return Havelock.derivation(function () {
      return Havelock.unpack(
        Havelock.unpack(testValue) ? thenClause : elseClause
      );
    });
  }

  Havelock.some = function (testValue, thenClause, elseClause) {
    return Havelock.derivation(function () {
      var x = Havelock.unpack(testValue);
      return Havelock.unpack(
        x === null || x === (void 0) ? elseClause : thenClause
      );
    });
  };

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

});

//# sourceMappingURL=havelock.js.map