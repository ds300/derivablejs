// colors for garbage collection / change detection

const RED = Symbol("red"),
      BLACK = Symbol("black"),
      WHITE = Symbol("white"),
      GREEN = Symbol("green");

// helpers

function eq(a, b) {
  return a === b
         || Object.is && Object.is(a, b)
         || (a && a.equals && a.equals(b));
}

function extend(obj, ...others) {
  for (let other of others) {
    for (let prop of Object.keys(other)) {
      obj[prop] = other[prop];
    }
  }
  return obj;
}

function symbolValues (obj) {
  return Object.getOwnPropertySymbols(obj).map(s => obj[s]);
}

/*

GC/change algorithm

Root nodes start white, all derived nodes start green.
When a root node is altered, it is turned red. Then the tree is traversed, with
all nodes being marked black, and all leaf reactions placed in the reaction queue.
The reactions are executed. When a leaf derived value is dereferenced, if it is green it is evaluated, marked white, and its state returned, otherwise we
checks whether it is white (unchanged) or red (changed), and, if it is either simply returns its current state.
Otherwise, it iterates over it's parent nodes, skipping those that are white and calling .get on those that are black.
If any parent node is red or becomes red after having .get called, we immediately stop iterating over the parents and re-evaluate ourself.
if it is changed, it marks itself as red, otherwise it marks itself as white.
If not red parents are encountered, we set ourself to white and return our current state.

*/


class DerivableValue {
  constructor () {
    this._uid = Symbol("my uid");
    this._children = {};
    this._validator = null;
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

  _addChild (child) {
    this._children[child._uid] = child;
  }

  _removeChild (child) {
    delete this._children[child._uid];
  }

  _getChildren () {
    return symbolValues(this._children);
  }

  _markChildren (reactionQueue) {
    this._getChildren().forEach(child => child._mark(reactionQueue));
  }

  _mark (reactionQueue) {
    // stop marking if we were already here
    if (this._color !== BLACK) {
      this._color = BLACK;
      this._markChildren(reactionQueue);
    }
  }

  _sweep () {
    this._color = WHITE;
    this._getChildren().forEach(child => {
      if (child._color === BLACK) {
        // white parents disowning black children? What have I done!
        this._removeChild(child);
        child._color = GREEN;
      } else {
        child._sweep();
      }
    });
  }

  /**
   * Creates a derived value whose state will always be f applied to this
   * value
   */
  derive (f) {
    return derive(this, f);
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
      parentsStack[parentsStack.length-1][this._uid] = this;
    }
    return this._get(); // abstract protected method, in Java parlance
  }
}

const ROOT_CTX = {
  childTxns: []
};

let CURRENT_TXN = ROOT_CTX;

function inTxn () {
  return CURRENT_TXN !== ROOT_CTX;
}

const RUNNING = Symbol("running"),
      COMPLETED = Symbol("completed"),
      ABORTED = Symbol("aborted");

class Transaction {
  constructor () {
    this.parent = CURRENT_TXN;
    CURRENT_TXN = this;
    this.reactionQueue = [];
    this.state = RUNNING;
    this.inTxnValues = {};
  }

  assertState (state, failMsg) {
    if (this.state !== state) {
      throw new Error(failMsg);
    }
  }

  commit () {
    this.assertState(RUNNING, "Must be in running state to commit transaction");

    CURRENT_TXN = this.parent;

    if (inTxn()) {
      // push in-txn vals up to current txn
      for (let {atom, value} of symbolValues(this.inTxnValues)) {
        atom.set(value);
      }
    } else {
      // change root state and run reactions.
      for (let {atom, value} of symbolValues(this.inTxnValues)) {
        atom._state = value;
      }

      this.reactionQueue.forEach(r => r._maybeReact());

      // then sweep for a clean finish
      for (let {atom} of symbolValues(this.inTxnValues)) {
        atom._color = WHITE;
        atom._sweep();
      }
    }

    this.state = COMPLETED;
  }

  abort () {
    this.assertState(RUNNING, "Must be in running state to abort transaction");

    CURRENT_TXN = this.parent;

    if (!inTxn()) {
      for (let {atom} of symbolValues(this.inTxnValues)) {
        atom._color = WHITE;
        atom._sweep();
      }
    }

    delete this.inTxnValues;
    delete this.reactionQueue;

    this.state = ABORTED;
  }
}

class TransactionFailedException {}

export function abortTransaction() {
  throw new TransactionFailedException();
}

/**
 * Runs f in a transaction. f should be synchronous
 */
export function transact (f) {
  let txn = new Transaction();
  let abortion = false;
  try {
    f()
  } catch (e) {
    txn.abort();
    abortion = true;
    if (!(e instanceof TransactionFailedException)) {
      throw e;
    }
  } finally {
    !abortion && txn.commit();
  }
};




class Atom extends DerivableValue {
  constructor (value) {
    super();
    this._state = value;
    this._color = WHITE;
    this._active = false;
  }

  _clone () {
    return new Atom(this._state);
  }

  set (value) {
    if (this._active) {
      throw new Error("Trying to set atom state during reaction phase. This is"
                      + " an error. Use middleware for cascading changes.");
    }
    this._validate(value);
    if (!eq(value, this._state)) {
      this._color = RED;

      if (inTxn()) {
        let record = CURRENT_TXN.inTxnValues[this._uid];
        if (record) {
          record.value = value;
        } else {
          CURRENT_TXN.inTxnValues[this._uid] = {value, atom: this};
        }

        this._markChildren(CURRENT_TXN.reactionQueue);
      } else {
        this._state = value;

        var reactionQueue = [];
        this._markChildren(reactionQueue);
        this._active = true;
        reactionQueue.forEach(r => r._maybeReact());
        this._active = false;
        this._sweep();

        this._color = WHITE;
      }
    }
    return this;
  }

  swap (f, ...args) {
    if (this._active) {
      throw new Error("Trying to swap atom state during reaction phase. This is"
                      + " an error. Use middleware for cascading changes.");
    }
    // todo: switch(args.length) for efficiency
    let value = f.apply(null, [this._get()].concat(args));
    this.set(value);
    return value;
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

var parentsStack = [];

function capturingParents(child, f) {
  var newParents = {};
  parentsStack.push(newParents);

  f();

  if (newParents !== parentsStack.pop()) {
    throw new Error("parents stack mismanagement");
  }

  return newParents;
}

export class Derivation extends DerivableValue {
  constructor (deriver) {
    super();
    this._deriver = deriver;
    this._state = Symbol("null");
    this._color = GREEN;
    this._parents = {};
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
      this._color = eq(newState, this._state) ? WHITE : RED;
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
  constructor () {
    this._parent = null;
    this._enabled = true;
    this._color = GREEN;
    this._uid = Symbol("reaction_uid");
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

  setReactor (react) {
    this.react = react;
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

export function atom (value) {
  return new Atom(value);
};

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

export function _if (test, then, otherwise) {
  return derive(() => test.get() ? maybeDeref(then) : maybeDeref(otherwise))
}

DerivableValue.prototype.then = function (then, otherwise) {
  return _if(this, then, otherwise);
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

DerivableValue.prototype.or = function (...others) {
  return or.apply(null, [this].concat(others));
}

export function not (x) {
  return x.derive(x => !x);
}

DerivableValue.prototype.not = function () {
  return not(this);
}

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

DerivableValue.prototype.and = function (...others) {
  return and.apply(null, [this].concat(others));
}

export function _switch (arg, ...clauses) {
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
}


DerivableValue.prototype.switch = function (...clauses) {
  return _switch.apply(null, [this].concat(clauses));
}

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
