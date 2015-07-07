export let warnOnUndefined = true;

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

function removeFromArray (array, value) {
  let idx = array.indexOf(value);
  if (idx > -1) {
    array.splice(idx, 1);
  }
}

function addToArray (array, value) {
  if (array.indexOf(value) === -1) {
    array.push(value)
  }
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
    this._children = [];
  }
  _addChild (child) {
    addToArray(this._children, child);
  }
  _removeChild (child) {
    removeFromArray(this._children, child);
  }

  _markChildren (reactionQueue) {
    this._children.forEach(child => child._mark(reactionQueue));
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
    for (let i = this._children.length - 1; i >= 0; i--) {
      let child = this._children[i];
      if (child._color === BLACK) {
        this._children.splice(i, 1);
        // orphan the child
        child._color = GREEN;
      } else {
        child._sweep();
      }
    }
  }
  /**
   * Creates a derived value whose state will always be f applied to this
   * value
   */
  derive (f) {
    return derive(this, f);
  }
  react (f) {
    return react(this, f);
  }

  get () {
    if (parentsStack.length > 0) {
      parentsStack[parentsStack.length-1].push(this);
    }
    if (inTxn()) {
      addToArray(CURRENT_TXN.myDerefedValues, this);
    }
    return this._get(); // abstract method
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

/**
 * Returns but does not enter a new transaction
 * Transactions apply over all atoms created from this module changed during
 * the transaction.
 */
function transaction () {

  let parent = CURRENT_TXN,
      TXN = {
        changedAtoms: [],
        state: RUNNING
      };

  CURRENT_TXN = TXN;

  function assertState(state, failMsg) {
    if (TXN.state !== state) {
      throw new Error(failMsg);
    }
  }

  function commit () {
    assertState(RUNNING, "Must be in running state to commit transaction");

    CURRENT_TXN = parent;

    if (inTxn()) {
      for (let atom of TXN.changedAtoms) {
        let idx = atom._inTransactionValues.indexOf(TXN);
        let val = atom._inTransactionValues[idx + 1];
        atom._inTransactionValues.splice(idx, 2);
        atom.set(val);
      }
    } else {
      // change root state and run reactions.
      changedAtoms.forEach(atom => {
        let idx = atom._inTansactionValues.indexOf(TXN);
        atom._state = atom._inTansactionValues[idx + 1];
        atom._inTansactionValues = [];
      });
      reactionQueue.forEach(r => r._maybeReact());
      changedAtoms.forEach(atom => {
        atom._sweep();
        atom._color = WHITE;
      });
    }

    transaction.state = "complete";
  }

  function abort () {
    assertState(RUNNING, "Must be in running state to abort transaction");

    CURRENT_TXN = parent;

    if (inTxn()) {
      for (let atom of TXN.changedAtoms) {
        let idx = atom._inTransactionValues.indexOf(TXN);
        let val = atom._inTransactionValues[idx + 1];
        atom._inTransactionValues.splice(idx, 2);
      }
    } else {
      changedAtoms.forEach(atom => {
        atom._inTansactionValues = [];
        atom._sweep();
        atom._color = WHITE;
      });
    }
  }

  return {commit, abort};
};

/**
 * Runs f in a transaction. f should be synchronous
 */
export function transact (f) {
  let {commit, abort} = transaction();
  let error = false;
  try {
    f()
  } catch (e) {
    abort();
    error = true;
  } finally {
    !error && commit();
  }
};

class ReactiveAtom extends DerivableValue {
  constructor (value) {
    super();
    this._state = value;
    this._inTansactionValues = [];
    this._color = WHITE;
  }

  set (value) {
    if (typeof value === 'undefined' && warnOnUndefined) {
      console.warn("atomic root set as undefined. This probably is whack.");
    }
    if (!eq(value, this._state)) {
      this._color = RED;

      if (inTxn()) {
        let idx = this._inTansactionValues.indexOf(CURRENT_TXN);
        if (idx >= 0) {
          this._inTansactionValues[idx + 1] = value;
        } else {
          this._inTansactionValues.push(CURRENT_TXN, value);
          CURRENT_TXN.changedAtoms.push(this);
        }

        this._markChildren({push: (_) => null});
      } else {
        this._state = value;

        var reactionQueue = [];
        this._markChildren(reactionQueue);
        reactionQueue.forEach(r => r._maybeReact());
        this._sweep();

        this._color = WHITE;
      }
    }
  }

  swap (f, ...args) {
    // todo: switch(args.length) for efficiency
    let value = f.apply(null, [this._get()].concat(args));
    if (typeof value === 'undefined' && warnOnUndefined) {
      console.warn(`atomic root set as undefined by function `
                     + `'${f.name}'. This probably is whack.`);
    }
    this.set(value);
  }

  _get () {
    if (inTxn()) {
      let idx = this._inTansactionValues.indexOf(CURRENT_TXN);
      if (idx >= 0) {
        return this._inTansactionValues[idx + 1];
      }
    }
    return this._state;
  }
}

var parentsStack = [];

function capturingParents(ctx, f) {
  var newParents = [];
  parentsStack.push(newParents);

  f();

  if (newParents !== parentsStack.pop()) {
    throw new Error("parents stack mismanagement");
  }

  var extantParentCount = 0;

  for (let possiblyFormerParent of ctx._parents) {
    if (newParents.indexOf(possiblyFormerParent) === -1) {
      // definitely former parent
      possiblyFormerParent._removeChild(ctx);
    } else {
      // definitely extant parent
      extantParentCount++;
    }
  }

  newParents.forEach(p => p._addChild(ctx));

  return newParents;
}

class DerivativeValue extends DerivableValue {
  constructor (deriver) {
    super();
    this._deriver = deriver;
    this._state = Symbol("null");
    this._color = GREEN;
    this._parents = [];
  }
  _forceGet () {
    this._parents = capturingParents(this, () => {
      let newState = this._deriver();
      if (typeof newState === 'undefined' && warnOnUndefined) {
        console.warn(`atomic root set as undefined by function `
                     + `'${this._deriver.name}'. This probably is whack.`);
      }
      this._color = eq(newState, this._state) ? WHITE : RED;
      this._state = newState;
    });
  }
  _get () {
    switch (this._color) {
    case GREEN:
      this._forceGet();
      break;
    case BLACK:
      for (let parent of this._parents) {
        if (parent._color === BLACK || parent._color === GREEN) {
          // green shouldn't be possible, because then this node would be green
          // ... i think.
          parent._get();
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

// TODO: There is some code duplication between this and DerivativeValue. Find
// some way to share.
class Reaction {
  constructor (reactFn, quiet) {
    this._reactFn = reactFn;
    this._parents = [];
    this._enabed = true;
    this._color = GREEN;
    if (!quiet) {
      this.forceEvaluation();
    }
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
      for (let parent of this._parents) {
        if (parent._color === BLACK || parent._color === GREEN) {
          parent._get();
        }
        if (parent._color === RED) {
          this.forceEvaluation();
          break;
        }
      }
    }
  }

  forceEvaluation () {
    this._parents = capturingParents(this, () => {
      this._reactFn();
    });
    this._color = WHITE;
    if (!this._enabled) {
      this.stop();
    }
  }

  stop () {
    this._enabled = false;
    this._parents.forEach(p => p._removeChild(this));
  }

  start () {
    this._enabled = true;
    this.forceEvaluation();
  }

  _sweep () {
    // no-op
  }
}

export function atom (value) {
  return new ReactiveAtom(value);
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
      return new DerivativeValue(a)
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

export function react (a, b, c, d, e) {
  const n = arguments.length;
  switch (n) {
    case 0:
      throw new Error("Wrong arity for derive. Expecting 1+ args");
    case 1:
      return new Reaction(a)
    case 2:
      return react(() => b(a.get()));
    case 3:
      return react(() => c(a.get(), b.get()));
    case 4:
      return react(() => d(a.get(), b.get(), c.get()));
    case 5:
      return react(() => e(a.get(), b.get(), c.get(), d.get()));
    default:
      let args = Array.prototype.slice.call(arguments, 0, n-1);
      let f = arguments[n-1];
      return react(() => f.apply(null, args.map(a => a.get())));
  }
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
