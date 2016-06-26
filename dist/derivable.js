'use strict';

var keys = Object.keys;

function assign (obj) {
  for (var i = 1; i < arguments.length; i++) {
    var other = arguments[i];
    var ks = keys(other || {});
    for (var j = ks.length; j--;) {
      var prop = ks[j];
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

var unique = Object.freeze({equals: function () { return false; }});

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

var ATOM = "ATOM";
var DERIVATION = "DERIVATION";
var LENS = "LENS";
var REACTOR = "REACTOR";

function isDerivable(x) {
  return x &&
         (x._type === DERIVATION ||
          x._type === ATOM ||
          x._type === LENS);
}

function isAtom (x) {
  return x && (x._type === ATOM || x._type === LENS);
}

function isDerivation (x) {
  return x && (x._type === DERIVATION || x._type === LENS);
}

function isLensed (x) {
  return x && x._type === LENS;
}

var UNKNOWN = 0;
var CHANGED = 1;
var UNCHANGED = 2;
var DISCONNECTED = 3;

var parentsStack = [];
var child = null;

function startCapturingParents (_child, parents) {
  parentsStack.push({parents: parents, offset: 0});
  child = _child;
}
function retrieveParentsFrame () {
  return parentsStack[parentsStack.length - 1];
}
function stopCapturingParents () {
  parentsStack.pop();
  child = null;
}

function maybeCaptureParent (p) {
  if (child !== null) {
    var frame = parentsStack[parentsStack.length - 1];
    if (frame.parents[frame.offset] === p) {
      // nothing to do, just skip over
      frame.offset++;
    } else {
      // look for this parent elsewhere
      var idx = frame.parents.indexOf(p);
      if (idx === -1) {
        // not seen this parent yet, add it in the correct place
        // and push the one currently there to the end (likely that we'll be
        // getting rid of it)
        addToArray(p._activeChildren, child);
        frame.parents.push(frame.parents[frame.offset]);
        frame.parents[frame.offset] = p;
        frame.offset++;
      } else {
        if (idx > frame.offset) {
          // seen this parent after current point in array, so swap positions
          // with current point's parent
          var tmp = frame.parents[idx];
          frame.parents[idx] = frame.parents[frame.offset];
          frame.parents[frame.offset] = tmp;
          frame.offset++;
        }
        // else seen this parent at previous point and so don't increment offset
      }
    }
  }
};

function mark (node, reactors) {
  for (var i = 0, len = node._activeChildren.length; i < len; i++) {
    var child = node._activeChildren[i];
    switch (child._type) {
      case DERIVATION:
      case LENS:
        if (child._state !== UNKNOWN) {
          child._state = UNKNOWN;
          mark(child, reactors);
        }
        break;
      case REACTOR:
        reactors.push(child);
        break;
    }
  }
}

function processReactors (reactors) {
  for (var i = 0, len = reactors.length; i < len; i++) {
    var r = reactors[i];
    if (r._reacting) {
      throw new Error("Synchronous cyclical reactions disallowed. " +
                      "Use setImmediate.");
    }
    r._maybeReact();
  }
}

var TransactionAbortion = {};

function initiateAbortion() {
  throw TransactionAbortion;
}

function TransactionContext(parent) {
  this.parent = parent;
  this.id2originalValue = {};
  this.modifiedAtoms = [];
}

function maybeTrack (atom) {
  if (currentCtx !== null) {
    if (!(atom._id in currentCtx.id2originalValue)) {
      currentCtx.modifiedAtoms.push(atom);
      currentCtx.id2originalValue[atom._id] = atom._value;
    }
  }
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

function atomically (f) {
  if (!inTransaction()) {
    transact(f);
  } else {
    f();
  }
}

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

function atomic (f) {
  return function () {
    var args = slice(arguments, 0);
    var that = this;
    var result;
    atomically(function () {
      result = f.apply(that, args);
    });
    return result;
  };
}

function beginTransaction() {
  currentCtx = new TransactionContext(currentCtx);
}

function commitTransaction() {
  var ctx = currentCtx;
  currentCtx = ctx.parent;

  if (currentCtx === null) {
    var reactors = [];
    ctx.modifiedAtoms.forEach(function (a) {
      if (a.__equals(a._value, ctx.id2originalValue[a._id])) {
        a._state = UNCHANGED;
      } else {
        a._state = CHANGED;
        mark(a, reactors);
      }
    });
    processReactors(reactors);
    ctx.modifiedAtoms.forEach(function (a) {
      a._state = UNCHANGED;
    });
  }
}

function abortTransaction() {
  var ctx = currentCtx;
  currentCtx = ctx.parent;
  ctx.modifiedAtoms.forEach(function (atom) {
    atom._value = ctx.id2originalValue[atom._id];
    atom._state = UNCHANGED;
    mark(atom, []);
  });
}

var _tickerRefCount = 0;

function ticker () {
  if (_tickerRefCount === 0) {
    beginTransaction();
  }
  _tickerRefCount++;
  var done = false;
  return {
    tick: function () {
      if (done) throw new Error('trying to use ticker after release');
      commitTransaction();
      beginTransaction();
    },
    reset: function () {
      if (done) throw new Error('trying to use ticker after release');
      abortTransaction();
      beginTransaction();
    },
    release: function () {
      if (done) throw new Error('ticker already released');
      _tickerRefCount--;
      done = true;
      if (_tickerRefCount === 0) {
        commitTransaction();
      }
    },
  };
};

function Derivation (deriver) {
  this._deriver = deriver;
  this._parents = null;
  this._type = DERIVATION;
  this._value = unique;
  this._equals = null;
  this._activeChildren = [];
  this._state = DISCONNECTED;

  if (DEBUG_MODE) {
    this.stack = Error().stack;
  }
};

assign(Derivation.prototype, {
  _clone: function () {
    return setEquals(_derivation(this._deriver), this._equals);
  },

  _forceEval: function () {
    var that = this;
    var newVal = null;
    var newNumParents;

    try {
      if (this._parents === null) {
        this._parents = [];
      }
      startCapturingParents(this, this._parents);
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
      newNumParents = retrieveParentsFrame().offset;
    } finally {
      stopCapturingParents();
    }

    if (!this.__equals(newVal, this._value)) {
      this._state = CHANGED;
    } else {
      this._state = UNCHANGED;
    }

    while (newNumParents < this._parents.length) {
      var oldParent = this._parents[newNumParents++];
      detach(oldParent, this);
    }

    this._value = newVal;
  },

  _update: function () {
    if (this._parents === null) {
      this._forceEval();
    } else if (this._state === UNKNOWN) {
      var len = this._parents.length;
      for (var i = 0; i < len; i++) {
        if (this._parents[i]._state !== UNCHANGED) {
          this._forceEval();
          break;
        }
      }
    }
  },

  get: function () {
    if (this._activeChildren.length > 0) {
      maybeCaptureParent(this);
      this._update();
      return this._value;
    } else {
      return this._deriver();
    }
  },
});

function detach (parent, child) {
  removeFromArray(parent._activeChildren, child);
  if (parent._activeChildren.length === 0 && parent._parents != null) {
    var len = parent._parents.length;
    for (var i = 0; i < len; i++) {
      detach(parent._parents[i], parent);
    }
    parent._parents = null;
    parent._state = DISCONNECTED;
  }
}

function _derivation (deriver) {
  return new Derivation(deriver);
}

function Reactor(parent, react, governor) {
  this._parent = parent;
  this.react = react;
  this._governor = governor || null;
  this._active = false;
  this._reacting = false;
  this._type = REACTOR;

  if (DEBUG_MODE) {
    this.stack = Error().stack;
  }
}

assign(Reactor.prototype, {
  start: function () {
    this._active = true;

    addToArray(this._parent._activeChildren, this);

    if (this._parent._state === DISCONNECTED) {
      this._parent._state = UNKNOWN;
    }

    this._parent.get();
    return this;
  },

  _force: function (nextValue) {
    try {
      this._reacting = true;
      this.react(nextValue);
    } catch (e) {
      if (DEBUG_MODE) {
        console.error(this.stack);
      }
      throw e;
    } finally {
      this._reacting = false;
    }
  },

  force: function () {
    this._force(this._parent.get());

    return this;
  },

  _maybeReact: function () {
    if (!this._reacting && this._active) {
      if (this._governor !== null) {
        this._governor._maybeReact();
      }
      // maybe the reactor was stopped by the parent
      if (this._active) {
        var nextValue = this._parent.get();
        if (this._parent._state === CHANGED) {
          this._force(nextValue);
        }
      }
    }
  },
  stop: function () {
    detach(this._parent, this);
    this._active = false;
    return this;
  },
});

function makeReactor (derivable, f, opts) {
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
    if (!isDerivable(fOrD)) {
      if (typeof fOrD === 'function') {
        return _derivation(fOrD);
      } else if (typeof fOrD === 'boolean') {
        return _derivation(function () { return fOrD; });
      } else {
        throw Error('react ' + name + ' condition must be derivable, got: ' + JSON.stringify(fOrD));
      }
    }
    return fOrD;
  }

  // wrap reactor so f doesn't get a .this context, and to allow
  // stopping after one reaction if desired.
  var reactor = new Reactor(derivable, function (val) {
    if (opts.skipFirst) {
      opts.skipFirst = false;
    } else {
      f(val);
      if (opts.once) {
        this.stop();
        controller.stop();
      }
    }
  });

  // listen to when and until conditions, starting and stopping the
  // reactor as appropriate, and stopping this controller when until
  // condition becomes true
  var $until = condDerivable(opts.until, 'until');
  var $when = condDerivable(opts.when, 'when');

  var $whenUntil = _derivation(function () {
    return {
      until: $until.get(),
      when: $when.get(),
    };
  });

  var controller = new Reactor($whenUntil, function (conds) {
    if (conds.until) {
      reactor.stop();
      this.stop();
    } else if (conds.when) {
      if (!reactor._active) {
        reactor.start().force();
      }
    } else if (reactor._active) {
      reactor.stop();
    }
  });

  reactor._governor = controller;

  // listen to from condition, starting the reactor controller
  // when appropriate
  var $from = condDerivable(opts.from, 'from');
  var initiator = new Reactor($from, function (from) {
    if (from) {
      controller.start().force();
      this.stop();
    }
  });

  initiator.start().force();
}

function Atom (value) {
  this._id = nextId();
  this._activeChildren = [];
  this._value = value;
  this._state = UNCHANGED;
  this._type = ATOM;
  this._equals = null;
  return this;
};

assign(Atom.prototype, {
  _clone: function () {
    return setEquals(atom$1(this._value), this._equals);
  },

  set: function (value) {
    maybeTrack(this);

    var oldValue = this._value;
    this._value = value;

    if (!inTransaction()) {
      if (!this.__equals(value, oldValue)) {
        try {
          this._state = CHANGED;
          var reactors = [];
          mark(this, reactors);
          processReactors(reactors);
        } finally {
          this._state = UNCHANGED;
        }
      }
    }
  },

  get: function () {
    maybeCaptureParent(this);
    return this._value;
  },
});

function atom$1 (value) {
  return new Atom(value);
}

function Lens (descriptor) {
  Derivation.call(this, descriptor.get);
  this._lensDescriptor = descriptor;
  this._type = LENS;
}

assign(Lens.prototype, Derivation.prototype, {
  _clone: function () {
    return setEquals(new Lens(this._lensDescriptor), this._equals);
  },

  set: function (value) {
    var that = this;
    atomically(function () {
      that._lensDescriptor.set(value);
    });
    return this;
  },
});

function lens$1 (descriptor) {
  return new Lens(descriptor);
}

var transact$1 = transact;
var setDebugMode$1 = setDebugMode;
var transaction$1 = transaction;
var ticker$1 = ticker;
var isDerivable$1 = isDerivable;
var isAtom$1 = isAtom;
var isLensed$1 = isLensed;
var isDerivation$1 = isDerivation;
var derivation = _derivation;
var atom = atom$1;
var atomic$1 = atomic;
var atomically$1 = atomically;
var lens = lens$1;

/**
 * Template string tag for derivable strings
 */
function derive (parts) {
  var args = slice(arguments, 1);
  return derivation(function () {
    var s = "";
    for (var i=0; i < parts.length; i++) {
      s += parts[i];
      if (i < args.length) {
        s += unpack(args[i]);
      }
    }
    return s;
  });
};

/**
 * dereferences a thing if it is dereferencable, otherwise just returns it.
 */
function unpack (thing) {
  if (isDerivable$1(thing)) {
    return thing.get();
  } else {
    return thing;
  }
};

/**
 * lifts a non-monadic function to work on derivables
 */
function lift (f) {
  return function () {
    var args = arguments;
    var that = this;
    return derivation(function () {
      return f.apply(that, Array.prototype.map.call(args, unpack));
    });
  };
};

function deepUnpack (thing) {
  if (isDerivable$1(thing)) {
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

function struct (arg) {
  if (arg.constructor === Object || arg instanceof Array) {
    return derivation(function () {
      return deepUnpack(arg);
    });
  } else {
    throw new Error("`struct` expects plain Object or Array");
  }
};

function andOrFn (breakOn) {
  return function () {
    var args = arguments;
    return derivation(function () {
      var val;
      for (var i = 0; i < args.length; i++) {
        val = unpack(args[i]);
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
var or = andOrFn(identity);
var mOr = andOrFn(some);
var and = andOrFn(complement(identity));
var mAnd = andOrFn(complement(some));


var derivable = Object.freeze({
  transact: transact$1,
  setDebugMode: setDebugMode$1,
  transaction: transaction$1,
  ticker: ticker$1,
  isDerivable: isDerivable$1,
  isAtom: isAtom$1,
  isLensed: isLensed$1,
  isDerivation: isDerivation$1,
  derivation: derivation,
  atom: atom,
  atomic: atomic$1,
  atomically: atomically$1,
  lens: lens,
  derive: derive,
  unpack: unpack,
  lift: lift,
  struct: struct,
  or: or,
  mOr: mOr,
  and: and,
  mAnd: mAnd
});

var derivablePrototype = {
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
          return derivation(function () {
            return f(that.get());
          });
        case 'string':
        case 'number':
          return derivation(function () {
            return that.get()[unpack(f)];
          });
        default:
          if (f instanceof Array) {
            return f.map(function (x) {
              return that.derive(x);
            });
          } else if (f instanceof RegExp) {
            return derivation(function () {
              return that.get().match(f);
            });
          } else if (isDerivable(f)) {
            return derivation(function () {
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
      return derivation(function () {
        return f(that.get(), unpack(a));
      });
    case 3:
      return derivation(function () {
        return f(that.get(), unpack(a), unpack(b));
      });
    case 4:
      return derivation(function () {
        return f(that.get(),
                 unpack(a),
                 unpack(b),
                 unpack(c));
      });
    case 5:
      return derivation(function () {
        return f(that.get(),
                 unpack(a),
                 unpack(b),
                 unpack(c),
                 unpack(d));
      });
    default:
      var args = ([that]).concat(slice(arguments, 1));
      return derivation(function () {
        return f.apply(null, args.map(unpack));
      });
    }
  },

  react: function (f, opts) {
    makeReactor(this, f, opts);
  },

  is: function (other) {
    return lift(this._equals || equals)(this, other);
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
      return unpack(some(x) ? thenClause : elseClause);
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
    return (this._equals || equals)(a, b);
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

var mutablePrototype = {
  swap: function (f) {
    var args = slice(arguments, 0);
    args[0] = this.get();
    return this.set(f.apply(null, args));
  },
  lens: function (monoLensDescriptor) {
    var that = this;
    return new Lens({
      get: function () {
        return monoLensDescriptor.get(that.get());
      },
      set: function (val) {
        that.set(monoLensDescriptor.set(that.get(), val));
      }
    });
  },
};

assign(Derivation.prototype, derivablePrototype);
assign(Lens.prototype, derivablePrototype, mutablePrototype);
assign(Atom.prototype, derivablePrototype, mutablePrototype);

module.exports = derivable;

module.exports = derivable;
//# sourceMappingURL=derivable.js.map