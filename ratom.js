const Havelock = {};

/********************************/
/*** GENERAL HELPER FUNCTIONS ***/
/********************************/






/**************************/
/*** EXECUTION CONTEXTS ***/
/**************************/

/*== Parents Capturing ==*/
const parentsStack = [];

function capturingParents(f) {
  parentsStack.push(new ArraySet());
  f();
  return parentsStack.pop();
}

/*== Transactions ==*/

/*** CORE NODE DATA STRUCTURES ***/

// core types
const ATOM = 0,
      DERIVATION = 1,
      LENS = 2,
      REACTION = 3;

Havelock.isAtom       = x => x._type === ATOM;
Havelock.isDerivation = x => x._type === DERIVATION;
Havelock.isLens       = x => x._type === LENS;

// node modes
const NEW = 0,
      CHANGED = 1,
      UNCHANGED = 2,
      ORPHANED = 3,
      INSTABLE = 4,
      STABLE = 5,
      FROZEN = 6,
      ERROR = 7;

const Atom = value => ({
  _type: ATOM,
  _uid: Symbol("my_uid"),
  _children: new ArraySet(),
  _mode: STABLE,
  _state: value
});

const Derivation = fn => ({
  _type: DERIVATION,
  _uid: Symbol("my_uid"),
  _children: new ArraySet(),
  _mode: NEW,
  _state: Symbol("null"),
  _deriver: fn
});

const Lens = fn => ({
  _type: LENS,
  _uid: Symbol("my_uid"),
  _children: new ArraySet(),
  _mode: NEW,
  _state: Symbol("null"),
  _deriver: fn
});

function assignPrototype(object, proto) {
  object.prototype = proto;
  return object;
}




class DerivableValue {
  constructor () {
    this._uid = Symbol("my uid");
    this._children = new ArraySet();
    this._validator = null;
    this._mode = NEW;
  }

  withValidator (f) {
    if (f == null || (typeof f === funtion)) {
      let result = this._clone();
      result._validator = f;
      return result;
    } else {
      throw new Error(".withValidator expects function or null");
    }
  }

  _validate (value) {
    let validationResult = this._validator && this._validator(value);
    if (this._validator && validationResult !== true) {
      throw new Error(`Failed validation with value: '${value}'.`
                      +` Validator returned '${validationResult}' `);
    }
  }

  /**
   * Creates a derived value whose state will always be f applied to this
   * value
   */
  derive (f) {
    return Havelock.derive(this, f);
  }

  reaction (f) {
    if (typeof f === 'function') {
      return new Reaction().setReactor(f).setInput(this);
    } else if (f instanceof Reaction) {
      return f.setInput(this);
    } else if (f.react) {
      return extend(new Reaction().setInput(this), f);
    }
  }

  react (f) {
    return this.reaction(f).start().force();
  }

  get () {
    if (parentsStack.length > 0) {
      parentsStack.push(parentsStack.pop().add(this));
    }
    return this._get(); // abstract protected method, in Java parlance
  }
}

function mark(node, reactions) {
  if (node instanceof Reaction) {
    reactions.push(node);
  } else if (node._mode !== INSTABLE) {
    node._mode = INSTABLE;
    for (let child of node._children) {
      mark(child, reactions);
    }
  }
}

function sweep(node) {
  switch (node._mode) {
  case CHANGED:
  case UNCHANGED:
    node._mode = STABLE;
    for (let child of node._children) {
      sweep(child);
    }
    break;
  case INSTABLE:
    node._mode = ORPHANED;
    let stashedParentStates = [];
    for (let parent of node._parents) {
      parent._children = parent._children.remove(node);
      stashedParentStates.push([parent, parent._state]);
    }
    node._parents = stashedParentStates;
    break;
  case STABLE:
    break;
  default:
    throw new Error(`It should be impossible to sweep nodes with mode: ${node._mode}`);
  }
}

class Atom extends DerivableValue {
  constructor (value, equals) {
    super();
    this._state = value;
    this._mode = STABLE;
  }

  _clone () {
    return new Atom(this._state);
  }

  set (value) {
    if (inReactCycle) {
      throw new Error("Trying to set atom state during reaction phase. This is"
                      + " an error. Use middleware for cascading changes.");
    }
    this._validate(value);
    if (!this._eq(value, this._state)) {
      this._mode = CHANGED;

      if (inTxn()) {
        let record = CURRENT_TXN.inTxnValues[this._uid];
        if (record) {
          record.value = value;
        } else {
          CURRENT_TXN.inTxnValues[this._uid] = {value, atom: this};
        }

        mark(this, CURRENT_TXN.reactionQueue);
      } else {
        this._state = value;

        var reactionQueue = [];
        mark(this, reactionQueue);
        processReactionQueue(reactionQueue);
        sweep(this);

        this._color = WHITE;
      }
    }
    return this;
  }

  swap (f, ...args) {
    // todo: switch(args.length) for efficiency
    let value = f.apply(null, [this._get()].concat(args));
    this.set(value);
    return value;
  }

  lens (lens) {
    return new Lens(this, lens);
  }

  _get () {
    if (inTxn()) {
      let record = CURRENT_TXN.inTxnValues[this._uid];
      if (record) {
        return record.value;
      }
    }
    return this._state;
  }
}




let inReactCycle = false;

function processReactionQueue (rq) {
  inReactCycle = true;
  rq.forEach(r => r._maybeReact());
  inReactCycle = false;
}




export class Derivation extends DerivableValue {
  constructor (deriver, equals) {
    super();
    this._deriver = deriver;
    this._state = Symbol("null");
    this._color = GREEN;
    this._parents = new ArraySet();
    this._eq = equals;
  }

  _clone () {
    return new Derivation(this._deriver);
  }

  _getParents () {
    return symbolValues(this._parents);
  }

  _forceGet () {
    let newParents = capturingParents(this, () => {
      let newState = this._deriver();
      this._validate(newState);
      this._color = this._eq(newState, this._state) ? WHITE : RED;
      this._state = newState;
    });

    // organise parents
    this._getParents().forEach(possiblyFormerParent => {
      if (!newParents[possiblyFormerParent._uid]) {
        // definitely former parent
        possiblyFormerParent._removeChild(this);
      }
    });

    this._parents = newParents;

    this._getParents().forEach(p => p._addChild(this));
  }

  _get () {
    switch (this._color) {
    case GREEN:
      this._forceGet();
      break;
    case BLACK:
      for (let parent of this._getParents()) {
        if (parent._color === BLACK || parent._color === GREEN) {
          parent._get();
        }
        // die on undefined
        if (parent._state === void 0) {
          this._state = void 0;
          break;
        }
        if (parent._color === RED) {
          this._forceGet();
          break;
        }
      }
      break;
    }

    return this._state;
  }
}
Ratom.Derivation = Derivation;

export class Lens extends Derivation {
  constructor (parent, {get, set}) {
    super(() => get(parent.get()));
    this._setter = set;
    this._parent = parent;
    this._getter = get;
  }

  _clone () {
    return new Lens(this._parent, {get: this._getter, set: this._setter});
  }

  set (value) {
    return this._parent.set(this._setter(this._parent._get(), value));
  }

  lens (lens) {
    return new Lens(this, lens);
  }

  swap (f, ...args) {
    // todo: switch(args.length) for efficiency
    let value = f.apply(null, [this._get()].concat(args));
    this.set(value);
    return value;
  }
}

// reactions start out GREEN. if it is evaluated once to begin with then it
// is turned WHITE.
// When an upstream atom changes, the reaction is marked black and placed in a
// reaction queue. Once all nodes affected by the change have been marked black
// the reaction is evaluated and turned white again.
// if a reaction is disabled via .stop(), it will be marked black but not placed
// in a reaction queue. During the next sweep phase it will be orphaned.

// TODO: There is some code duplication between this and Derivation. Find
// some way to share.
export class Reaction {
  constructor (reactor) {
    this._parent = null;
    this._enabled = true;
    this._color = GREEN;
    this._uid = Symbol("reaction_uid");
    this.react = reactor;
  }

  setInput (parent) {
    if (this._parent) {
      this._parent._removeChild(this);
    }
    this._parent = parent;
    if (this._parent) {
      this._parent._addChild(this);
    } else if (this._enabled) {
      this._enabled = false;
      this.onStop && this.onStop();
    }
    return this;
  }

  _mark (reactionQueue) {
    // if this reaction has been placed on any queue anywhere, it doesn't need
    // to add itself to this one.
    if (this._color !== BLACK) {
      this._color = BLACK;
      if (this._enabled) {
        reactionQueue.push(this);
      }
    }
  }

  _maybeReact () {
    if (this._color === BLACK) {
      if (this._parent._color === BLACK || this._parent._color === GREEN) {
        this._parent._get();
      }
      if (this._parent._get() === void 0) {
        // simply don't react if one of our parents is undefined. Wait until
        // the become defined again.
        this._color = WHITE;
        return;
      } else if (this._parent._color === RED) {
        this.force();
      }
    }
  }

  _react () {
    if (this.react) {
      this.react(this._parent._get());
    } else {
      throw new Error("No reaction function available.");
    }
  }

  force () {
    this._react();
    this._color = WHITE;
    if (!this._enabled) {
      this.stop();
    }
    return this;
  }

  stop () {
    this._parent._removeChild(this);
    this._enabled = false;
    this.onStop && this.onStop();
    return this;
  }

  start () {
    this._parent._addChild(this);
    this._enabled = true;
    this.onStart && this.onStart();
    this._parent.get();
    return this;
  }

  _sweep () {
    // no-op
  }
}

Ratom.Atom = Atom;

export function atom (value) {
  return new Atom(value);
};

Ratom.atom = atom;

export function derive (a, b, c, d, e) {
  if (a instanceof Array) {
    return deriveString.apply(null, arguments);
  }
  var n = arguments.length;
  switch (n) {
    case 0:
      throw new Error("Wrong arity for derive. Expecting 1+ args");
    case 1:
      return new Derivation(a)
    case 2:
      return derive(() => b(a.get()));
    case 3:
      return derive(() => c(a.get(), b.get()));
    case 4:
      return derive(() => d(a.get(), b.get(), c.get()));
    case 5:
      return derive(() => e(a.get(), b.get(), c.get(), d.get()));
    default:
      var args = Array.prototype.slice.call(arguments, 0, n-1);
      var f = arguments[n-1];
      return derive(() => f.apply(null, args.map(a => a.get())));
  }
};

Ratom.derive = derive;

function maybeDeref (thing) {
  if (thing instanceof DerivableValue) {
    return thing.get();
  } else {
    return thing;
  }
}

function deepDeref (thing) {
  if (thing instanceof Array) {
    return thing.map(deepDeref);
  } else if (thing.constructor === Object || thing.constructor === void 0) {
    let result = {};
    for (let prop of Object.keys(thing)) {
      result[prop] = deepDeref(thing[prop]);
    }
    return result;
  } else {
    return maybeDeref(thing);
  }
}

export function struct (arg) {
  return derive(() => deepDeref(arg));
}
Ratom.struct = struct;

Ratom.if = function (test, then, otherwise) {
  return derive(() => test.get() ? maybeDeref(then) : maybeDeref(otherwise))
};

export function or (...args) {
  return derive(() => {
    let val;
    for (let arg of args) {
      val = maybeDeref(arg);
      if (val) {
        break;
      }
    }
    return val;
  });
}

Ratom.or = or;

export function not (x) {
  return x.derive(x => !x);
}

Ratom.not = not;

export function and (...args) {
  return derive(() => {
    let val;
    for (let arg of args) {
      val = maybeDeref(arg);
      if (!val) {
        break;
      }
    }
    return val;
  });
}

Ratom.and = and;

Ratom.switch = function (arg, ...clauses) {
  return derive(() => {
    let a = maybeDeref(arg);
    let i = 0;
    for (; i<clauses.length-1; i+=2) {
      let _case = maybeDeref(clauses[i]);
      if (eq(a, _case)) {
        return maybeDeref(clauses[i+1]);
      }
    }
    if (i < clauses.length) {
      return maybeDeref(clauses[clauses.length - 1]);
    }
  });
};

function deriveString (parts, ...args) {
  return derive(() => {
    let s = "";
    for (let i=0; i<parts.length; i++) {
      s += parts[i];
      if (args[i] instanceof DerivableValue) {
        s += args[i].get();
      } else if (i < args.length) {
        s += args[i];
      }
    }
    return s;
  });
}

export function wrapOldState (f, init) {
  let state = init;
  let ret = function (newState) {
    let oldState = state;
    state = newState;
    f.call(this, newState, oldState);
  };
  ret.name = f.name;
  return ret;
};

Ratom.wrapOldState = wrapOldState;

export function get (a) {
  return a.get();
};

Ratom.get = get;

export function set (a, v) {
  return a.set(v);
}

Ratom.set = set;

export function swap (a, ...args) {
  Atom.prototype.swap.apply(a, args);
}

Ratom.swap = swap;

export function lift (f) {
  return function () {
    let args = arguments;
    return derive(function () {
      return f.apply(this, Array.prototype.map.call(args, maybeDeref));
    });
  }
}

Ratom.lift = lift;
