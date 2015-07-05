const Ratom = {};

Ratom.warnOnUndefined = true;

const RED = 0;
const BLACK = 1;
const WHITE = 2;
const GREEN = 3;

function eq(a, b) {
  return a === b || (a && a.is && a.is(b));
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
    this._color = BLACK;
    this._markChildren(reactionQueue);
  }

  _sweep () {
    this._color = WHITE;
    for (let i = this._children.length - 1; i >= 0; i--) {
      let child = this._children[i];
      if (child instanceof DerivableValue) {
        if (child._color === BLACK) {
          this._children.splice(i, 1);
          child._orphaned = true;
        } else {
          child._sweep();
        }
      }
    }
  }
  /**
   * Creates a derived value whose state will always be f applied to this
   * value
   */
  derive (f) {
    return Ratom.derive(this, f);
  }
  react (f) {
    return Ratom.react(this, f);
  }
}

class AtomicValue extends DerivableValue {
  constructor (value) {
    super();
    this._state = value;
    this._color = WHITE;
  }

  reset (value) {
    if (typeof value === 'undefined' && Ratom.warnOnUndefined) {
      console.warn("atomic root set as undefined. This probably is whack.");
    }
    if (this._color !== WHITE) {
      this._nextState = value;
    } else if (!eq(value, this._state)) {
      this._state = value;
      this._color = RED;

      var reactionQueue = [];
      this._markChildren(reactionQueue);
      reactionQueue.forEach(r => r._maybeReact());
      this._sweep();

      this._color = WHITE;
      if (Object.hasOwnProperty(this, "_nextState")) {
        let nextState = this._nextState;
        delete this._nextState;
        this.reset(nextState);
      }
    }
  }

  compareAndSet(expected, value) {
    if (eq(expected, this._value)) {
      this.reset(value);
      return true;
    } else {
      return false;
    }
  }
  swap (f, ...args) {
    // todo: switch(args.length) for efficiency
    let value = f.apply(null, [this._state].concat(args));
    if (typeof value === 'undefined' && Ratom.warnOnUndefined) {
      console.warn(`atomic root set as undefined by function `
                     + `'${f.name}'. This probably is whack.`);
    }
    this.reset(value);
    return this;
  }

  get () {
    if (parentsStack.length > 0) {
      parentsStack[parentsStack.length-1].push(this);
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

  // only need to tell parents about children if they are actually new parents
  if (extantParentCount !== ctx._parents.length
    || ctx._parents.length !== newParents.length) {
    newParents.forEach(p => p._addChild(ctx));
  }

  return newParents;
}

class DerivativeValue extends DerivableValue {
  constructor (deriver) {
    super();
    this._deriver = deriver;
    this._state = Symbol("null");
    this._color = GREEN;
    this._orphaned = true;
    this._parents = [];
  }
  _forceGet () {
    this._parents = capturingParents(this, () => {
      let newState = this._deriver();
      if (typeof newState === 'undefined' && Ratom.warnOnUndefined) {
        console.warn(`atomic root set as undefined by function `
                     + `'${this._deriver.name}'. This probably is whack.`);
      }
      this._color = eq(newState, this._state) ? WHITE : RED;
      this._state = newState;
    });
  }
  get () {
    if (parentsStack.length > 0) {
      parentsStack[parentsStack.length-1].push(this);
    }
    switch (this._color) {
    case GREEN:
      this._forceGet();
      break;
    case WHITE:
    case RED:
      break;
    case BLACK:
      for (let parent of this._parents) {
        if (parent._color === BLACK || parent._color === GREEN) {
          // green shouldn't be possible, because then this node would be green
          // ... i think.
          parent.get();
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

class Reaction {
  constructor (reactFn) {
    this._reactFn = reactFn;
    this._parents = [];
    this._active = false;
    this._release = false;
    this.forceEvaluation();
  }
  _mark (reactionQueue) {
    reactionQueue.push(this);
  }
  _maybeReact () {
    for (let parent of this._parents) {
      if (parent._color === BLACK || parent._color === GREEN) {
        parent.get();
      }
      if (parent._color === RED) {
        this.forceEvaluation();
        break;
      }
    }
  }
  forceEvaluation () {
    this._parents = capturingParents(this, () => {
      this._active = true;
      this._reactFn();
      this._active = false;
      if (this._release) {
        this.release();
        this._release = false;
      }
    });
  }
  release () {
    if (!this._active) {
      this._parents.forEach(p => p._removeChild(this));
    } else {
      this._release = true;
    }
  }
}

Ratom.atom = function (value) {
  return new AtomicValue(value);
};

Ratom.derive = function (a, b, c, d, e) {
  const n = arguments.length;
  switch (n) {
    case 0:
      throw new Error("Wrong arity for Ratom.derive. Expecting 1+ args");
    case 1:
      return new DerivativeValue(a)
    case 2:
      return Ratom.derive(() => b(a.get()));
    case 3:
      return Ratom.derive(() => c(a.get(), b.get()));
    case 4:
      return Ratom.derive(() => d(a.get(), b.get(), c.get()));
    case 5:
      return Ratom.derive(() => e(a.get(), b.get(), c.get(), d.get()));
    default:
      let args = Array.prototype.slice.call(arguments, 0, n-1);
      let f = arguments[n-1];
      return Ratom.derive(() => f.apply(null, args.map(a => a.get())));
  }
};

Ratom.react = function (a, b, c, d, e) {
  const n = arguments.length;
  switch (n) {
    case 0:
      throw new Error("Wrong arity for Ratom.derive. Expecting 1+ args");
    case 1:
      return new Reaction(a)
    case 2:
      return Ratom.react(() => b(a.get()));
    case 3:
      return Ratom.react(() => c(a.get(), b.get()));
    case 4:
      return Ratom.react(() => d(a.get(), b.get(), c.get()));
    case 5:
      return Ratom.react(() => e(a.get(), b.get(), c.get(), d.get()));
    default:
      let args = Array.prototype.slice.call(arguments, 0, n-1);
      let f = arguments[n-1];
      return Ratom.react(() => f.apply(null, args.map(a => a.get())));
  }
};

Ratom.wrapOldState = function (f, init) {
  let state = init;
  let ret = function (newState) {
    let oldState = state;
    state = newState;
    f.call(this, newState, oldState);
  };
  ret.name = f.name;
  return ret;
};

class App {
  constructor (rootAtom) {
    this._root = rootAtom;
    this._eventQueue = [];
    this._active = false;
    this._flush = false;
  }

  dispatch (handler, ...args) {
    return new Promise((resolve, _) => {
      this._eventQueue.push([handler, args, resolve]);
      this._tick();
    });
  }

  _tick () {
    if (!this._active) {
      this._tock();
    }
  }

  _tock () {
    if (this._eventQueue.length > 0) {
      this._active = true;
      let [handler, args, resolve] = this._eventQueue.unshift();
      let update = state => handler.apply(this, [state].concat(args));
      update.name = handler.name;
      this._root.swap(update);
      this._active = false;
      let timeout = this._flush ? 20 : 0;
      this._flush = false;
      setTimeout(() => resolve() && this._tick(), timeout);
    }
  }

  wrapDomFlush (handler) {
    let h = (...args) => {
      handler.apply(this, args);
      this._flush = true;
    };
    h.name = handler.name;
    return h;
  }
}

Ratom.app = function (root) {
  return new App(root);
};

module.exports = Ratom;
