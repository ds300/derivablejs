/**
 * Copyright 2015 David Sheldrick
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

// UMD loader
((global, factory) => {
  "use strict";
  if (global && typeof global.define === "function" && global.define.amd) {
    global.define(["exports"], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports);
  } else {
    factory(global.Havelock = {});
  }
})(this, (exports) => {
"use strict";
/*

     $$\   $$\ $$$$$$$$\ $$$$$$\ $$\
     $$ |  $$ |\__$$  __|\_$$  _|$$ |
     $$ |  $$ |   $$ |     $$ |  $$ |
     $$ |  $$ |   $$ |     $$ |  $$ |
     $$ |  $$ |   $$ |     $$ |  $$ |
     $$ |  $$ |   $$ |     $$ |  $$ |
     \$$$$$$  |   $$ |   $$$$$$\ $$$$$$$$\
      \______/    \__|   \______|\________|

*/

function extend(obj, ...others) {
  for (let other of others) {
    for (let prop of Object.keys(other)) {
      obj[prop] = other[prop];
    }
  }
  return obj;
}

function util_symbolValues (obj) {
  return Object.getOwnPropertySymbols(obj).map(s => obj[s]);
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

function _equals(a, b, stackA, stackB) {
  var typeA = _type(a);
  if (typeA !== _type(b)) {
    return false;
  }

  if (typeA === 'Boolean' || typeA === 'Number' || typeA === 'String') {
    return typeof a === 'object' ?
      typeof b === 'object' && util_equals(a.valueOf(), b.valueOf()) :
      false;
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

    var keysA = Object.keys(a);
    if (keysA.length !== Object.keys(b).length) {
      return false;
    }

    if (!stackA) {
      stackA = [];
      stackB = [];
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
      if (!Object.hasOwnProperty(key, b) ||
          !util_equals(b[key], a[key], stackA, stackB)) {
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

function util_equals (a, b, stackA, stackB) {
  if ((Object.is && Object.is(a, b)) || _is(a, b)) {
    return true;
  }
  if (!(a && b)) return false;

  return (typeof a.equals === 'function' && a.equals(b)) ||
         (typeof b.equals === 'function' && b.equals(a)) ||
         _equals(a, b, stackA, stackB) ||
         false;
}



/*

     $$$$$$\   $$$$$$\
    $$  __$$\ $$  __$$\
    $$ /  \__|$$ /  \__|
    $$ |$$$$\ $$ |
    $$ |\_$$ |$$ |
    $$ |  $$ |$$ |  $$\
    \$$$$$$  |\$$$$$$  |
     \______/  \______/

*/

// node modes
const NEW = 0,
      CHANGED = 1,
      UNCHANGED = 2,
      ORPHANED = 3,
      UNSTABLE = 4,
      STABLE = 5,
      DISOWNED = 6,

// core types
      ATOM = Symbol("ATOM"),
      DERIVATION = Symbol("DERIVATION"),
      LENS = Symbol("LENS"),
      REACTION = Symbol("REACTION");


function gc_mark(node, reactions) {
  if (node._type === REACTION) {
    reactions.push(node);
  } else {
    for (let child of node._children) {
      if (child._state !== UNSTABLE) {
        child._state = UNSTABLE;
        gc_mark(child, reactions);
      }
    }
  }
}

function gc_sweep(node) {
  switch (node._state) {
  case CHANGED:
  case UNCHANGED:
    for (let child of node._children) {
      gc_sweep(child);
    }
    node._state = STABLE;
    break;
  case UNSTABLE:
    let stashedParentStates = [];
    for (let parent of node._parents) {
      if (parent._state === CHANGED) {
        node._state = ORPHANED;
      }
      parent._children.remove(node);
      stashedParentStates.push([parent, parent._value]);
    }
    if (node._state !== ORPHANED) {
      node._state = DISOWNED;
      node._parents = stashedParentStates;
    }
    break;
  case STABLE:
    break;
  default:
    throw new Error(`It should be impossible to sweep` +
                    ` nodes with mode: ${node._state}`);
  }
}

/*

     $$$$$$\  $$$$$$$$\ $$$$$$$$\
    $$  __$$\ $$  _____|\__$$  __|
    $$ /  \__|$$ |         $$ |
    \$$$$$$\  $$$$$\       $$ |
     \____$$\ $$  __|      $$ |
    $$\   $$ |$$ |         $$ |
    \$$$$$$  |$$$$$$$$\    $$ |
     \______/ \________|   \__|

*/


/**
 *  === CUSTOM SET IMPLEMENTATION ===
 *
 * for child/parent relationships. only need to support add, remove and
 * iterate. Using identity for equality and ._id properties for map keys.

 * use an array-based set to begin with, when it gets size > 16, switch to map.
 * switch back down at size 8

 * 16/8 are educated guesses based on other implementations I've seen.
 * An empirical study on the best numbers to choose may be forthcoming if
 * perfomance turns out to be an issue. Or maybe something altogether different.
 */
const useMapAtSize = 16;
const goBackToArrayAtSize = 8;

class MapSet {
  constructor (items) {
    this._map = {};
    this._size = 0;
    for (let item of items) {
      this.add(item);
    }
  }
  add (elem) {
    this._map[elem._id] = elem;
    this._size++;
    return this;
  }
  remove (elem) {
    delete this._map[elem._id];
    if (--this._size <= goBackToArrayAtSize) {
      return new ArraySet(util_symbolValues(this._map));
    }
    return this;
  }
  [Symbol.iterator] () {
    const keys = Object.keys(this._map);
    const vals = new Array(keys.length);
    for (let k of keys) {
      vals.push(this._map[k]);
    }
    return vals[Symbol.iterator]();
  }
}

class ArraySet {
  constructor (items) {
    this._array = items || [];
  }
  add (elem) {
    if (this._array.indexOf(elem) < 0) {
      this._array.push(elem);
      if (this.length === useMapAtSize) {
        return new MapSet(this._array);
      } else {
        return this;
      }
    }
    return this;
  }
  remove (elem) {
    let idx = this._array.indexOf(elem);
    if (idx >= 0) {
      if (idx === this._array.length - 1) {
        this._array.pop();
      } else {
        this._array[idx] = this._array.pop();
      }
    }
    return this;
  }
  [Symbol.iterator] () {
    return this._array.slice(0)[Symbol.iterator]();
  }
}

class Set {
  constructor () {
    this._set = new ArraySet();
  }
  add (elem) {
    this._set = this._set.add(elem);
  }
  remove (elem) {
    this._set = this._set.remove(elem);
  }
  [Symbol.iterator] () {
    return this._set[Symbol.iterator]();
  }
}

/*

    $$$$$$$\   $$$$$$\  $$$$$$$\  $$$$$$$$\ $$\   $$\ $$$$$$$$\  $$$$$$\
    $$  __$$\ $$  __$$\ $$  __$$\ $$  _____|$$$\  $$ |\__$$  __|$$  __$$\
    $$ |  $$ |$$ /  $$ |$$ |  $$ |$$ |      $$$$\ $$ |   $$ |   $$ /  \__|
    $$$$$$$  |$$$$$$$$ |$$$$$$$  |$$$$$\    $$ $$\$$ |   $$ |   \$$$$$$\
    $$  ____/ $$  __$$ |$$  __$$< $$  __|   $$ \$$$$ |   $$ |    \____$$\
    $$ |      $$ |  $$ |$$ |  $$ |$$ |      $$ |\$$$ |   $$ |   $$\   $$ |
    $$ |      $$ |  $$ |$$ |  $$ |$$$$$$$$\ $$ | \$$ |   $$ |   \$$$$$$  |
    \__|      \__|  \__|\__|  \__|\________|\__|  \__|   \__|    \______/

*/


/*== Parents Capturing ==*/
const parentsStack = [];

function capturingParents(f) {
  parentsStack.push(new Set());
  f();
  return parentsStack.pop();
}

function maybeCaptureParent(p) {
  if (parentsStack.length > 0) {
    parentsStack[parentsStack.length - 1].add(p);
  }
}


/*

$$$$$$$$\ $$\   $$\ $$\   $$\  $$$$$$\
\__$$  __|$$ |  $$ |$$$\  $$ |$$  __$$\
   $$ |   \$$\ $$  |$$$$\ $$ |$$ /  \__|
   $$ |    \$$$$  / $$ $$\$$ |\$$$$$$\
   $$ |    $$  $$<  $$ \$$$$ | \____$$\
   $$ |   $$  /\$$\ $$ |\$$$ |$$\   $$ |
   $$ |   $$ /  $$ |$$ | \$$ |\$$$$$$  |
   \__|   \__|  \__|\__|  \__| \______/

*/


const RUNNING = Symbol("running"),
      COMPLETED = Symbol("completed"),
      ABORTED = Symbol("aborted");

const $parent = Symbol("parent_txn");
const $state = Symbol("txn_value");

const TransactionAbortion = Symbol("abort that junk yo");

function abortTransaction() {
  throw TransactionAbortion;
}

class TransactionContext {
  constructor () {
    this.currentTxn = null;
  }
  inTransaction () {
    return this.currentTxn !== null;
  }
  currentTransaction () {
    return this.currentTxn;
  }
  _begin (txn) {
    txn[$parent] = this.currentTxn;
    txn[$state] = RUNNING;
    this.currentTxn = txn;
  }
  _popTransaction (name, cb) {
    let txn = this.currentTxn;
    this.currentTxn = txn[$parent];
    if (txn[$state] !== RUNNING) {
      throw new Error(`Must be in state 'RUNNING' to ${name} transaction.` +
                      ` Was in state ${txn[$state]}.`);
    }
    cb(txn);
  }
  _commit () {
    this._popTransaction("commit", txn => {
      txn[$state] = COMPLETED;
      txn.onCommit && txn.onCommit();
    });
  }
  _abort () {
    this._popTransaction("abort", txn => {
      txn[$state] = ABORTED;
      txn.onAbort && txn.onAbort();
    });
  }

  transact (txn, f) {
    this._begin(txn);
    try {
      f(abortTransaction);
      this._commit();
    } catch (e) {
      this._abort();
      if (e !== TransactionAbortion) {
        throw e;
      }
    }
  }
}

/*

    $$$$$$$\  $$$$$$$$\  $$$$$$\   $$$$$$\ $$$$$$$$\ $$\   $$\
    $$  __$$\ $$  _____|$$  __$$\ $$  __$$\\__$$  __|$$$\  $$ |
    $$ |  $$ |$$ |      $$ /  $$ |$$ /  \__|  $$ |   $$$$\ $$ |
    $$$$$$$  |$$$$$\    $$$$$$$$ |$$ |        $$ |   $$ $$\$$ |
    $$  __$$< $$  __|   $$  __$$ |$$ |        $$ |   $$ \$$$$ |
    $$ |  $$ |$$ |      $$ |  $$ |$$ |  $$\   $$ |   $$ |\$$$ |
    $$ |  $$ |$$$$$$$$\ $$ |  $$ |\$$$$$$  |  $$ |   $$ | \$$ |
    \__|  \__|\________|\__|  \__| \______/   \__|   \__|  \__|

*/

class ReactionBase {
  constructor (parent, control) {
    this.control = control;
    this.parent = parent;
    this._state = STABLE;
    this._uid = Symbol("my_uid");
    this.active = false;
    this._type = REACTION;
  }

  stop () {
   this.parent._children.remove(this);
   this.active = false;
   this.control.onStop && this.control.onStop();
  }

  start () {
   this.parent._children.add(this);
   this.active = true;
   this.control.onStart && this.control.onStart();
   this.parent._get(); // set up bi-directional link
  }

  maybeReact () {
    if (this._state === UNSTABLE) {
      if (this.parent._state === UNSTABLE ||
          this.parent._state === ORPHANED ||
          this.parent._state === DISOWNED ||
          this.parent._state === NEW) {
        this.parent._get();
      }

      switch (this.parent._state) {
      case UNCHANGED:
        this._state = STABLE;
        break;
      case CHANGED:
        this.force();
        break;
      // should never be STABLE, as this only gets called during react phase
      default:
        throw new Error(`invalid mode for parent: ${this.parent._state}`);
      }
    }
  }

  force () {
    if (this.control.react) {
      this._state = STABLE;
      this.control.react(this.parent._get());
    } else {
      throw new Error("No reaction function available.");
    }
  }
}

class Reaction {
  constructor () {
    this._type = REACTION;
  }
  _createBase (parent) {
    if (this._base) {
      throw new Error("This reaction has already been initialized");
    }
    this._base = new ReactionBase(parent, this);
    return this;
  }
  start () {
    this._base.start();
    return this;
  }
  stop () {
    this._base.stop();
    return this;
  }
  force () {
    this._base.force();
    return this;
  }
  isRunning () {
    return this._base.active;
  }
  // lifecycle methods go here
  // onStart, onStop
}

class StandardReaction extends Reaction {
  constructor (f) {
    super();
    this.react = f;
  }
}

function anonymousReaction (descriptor) {
  return extend(new Reaction(), descriptor);
}


/*

    $$$$$$$\  $$$$$$$\  $$\    $$\  $$$$$$\  $$$$$$$\  $$\       $$$$$$$$\
    $$  __$$\ $$  __$$\ $$ |   $$ |$$  __$$\ $$  __$$\ $$ |      $$  _____|
    $$ |  $$ |$$ |  $$ |$$ |   $$ |$$ /  $$ |$$ |  $$ |$$ |      $$ |
    $$ |  $$ |$$$$$$$  |\$$\  $$  |$$$$$$$$ |$$$$$$$\ |$$ |      $$$$$\
    $$ |  $$ |$$  __$$<  \$$\$$  / $$  __$$ |$$  __$$\ $$ |      $$  __|
    $$ |  $$ |$$ |  $$ |  \$$$  /  $$ |  $$ |$$ |  $$ |$$ |      $$ |
    $$$$$$$  |$$ |  $$ |   \$  /   $$ |  $$ |$$$$$$$  |$$$$$$$$\ $$$$$$$$\
    \_______/ \__|  \__|    \_/    \__|  \__|\_______/ \________|\________|

*/

function createDerivablePrototype (havelock, { equals }) {
  return {
    /**
     * Creates a derived value whose state will always be f applied to this
     * value
     */
    derive (f, a, b, c, d) {
      switch (arguments.length) {
      case 0:
        return this;
      case 1:
        return havelock.derivation(() => {
          return f(this.get());
        });
      case 2:
        return havelock.derivation(() => {
          return f(this.get(), havelock.unpack(a));
        });
      case 3:
        return havelock.derivation(() => {
          return f(this.get(), havelock.unpack(a), havelock.unpack(b));
        });
      case 4:
        return havelock.derivation(() => {
          return f(this.get(),
                   havelock.unpack(a),
                   havelock.unpack(b),
                   havelock.unpack(c));
        });
      case 5:
        return havelock.derivation(() => {
          return f(this.get(),
                   havelock.unpack(a),
                   havelock.unpack(b),
                   havelock.unpack(c),
                   havelock.unpack(d));
        });
      default:
        const args = [this].concat(Array.prototype.slice.call(arguments, 1));
        return havelock.derivation(() => {
          return f.apply(null, args.map(havelock.unpack));
        });
      }
    },

    reaction (f) {
      if (typeof f === 'function') {
        return new StandardReaction(f)._createBase(this);
      } else if (f instanceof Reaction) {
        return f._createBase(this);
      } else if (f && f.react) {
        return anonymousReaction(f)._createBase(this);
      } else {
        throw new Error("Unrecognized type for reaction " + f);
      }
    },

    react (f) {
      return this.reaction(f).start().force();
    },

    get () {
      maybeCaptureParent(this);
      return this._get(); // abstract protected method, in Java parlance
    },

    is (other) {
      return havelock.lift(equals)(this, other);
    },

    and (other) {
      return this.derive(x => x && havelock.unpack(other));
    },

    or (other) {
      return this.derive(x => x || havelock.unpack(other));
    },

    then (thenClause, elseClause) {
      return this.derive(x => havelock.unpack(x ? thenClause : elseClause));
    },

    not () {
      return this.derive(x => !x);
    },

    ["switch"] (...args) {
      return this.derive(x => {
        let i;
        for (i = 0; i < args.length-1; i+=2) {
          if (equals(x, havelock.unpack(args[i]))) {
            return havelock.unpack(args[i+1]);
          }
        }
        if (i === args.length - 1) {
          return havelock.unpack(args[i]);
        }
      });
    },
  };
}

/*

  $$$$$$$\  $$$$$$$\  $$\    $$\ $$$$$$$$\ $$$$$$\  $$$$$$\  $$\   $$\
  $$  __$$\ $$  __$$\ $$ |   $$ |\__$$  __|\_$$  _|$$  __$$\ $$$\  $$ |
  $$ |  $$ |$$ |  $$ |$$ |   $$ |   $$ |     $$ |  $$ /  $$ |$$$$\ $$ |
  $$ |  $$ |$$$$$$$  |\$$\  $$  |   $$ |     $$ |  $$ |  $$ |$$ $$\$$ |
  $$ |  $$ |$$  __$$<  \$$\$$  /    $$ |     $$ |  $$ |  $$ |$$ \$$$$ |
  $$ |  $$ |$$ |  $$ |  \$$$  /     $$ |     $$ |  $$ |  $$ |$$ |\$$$ |
  $$$$$$$  |$$ |  $$ |   \$  /      $$ |   $$$$$$\  $$$$$$  |$$ | \$$ |
  \_______/ \__|  \__|    \_/       \__|   \______| \______/ \__|  \__|

*/

function createDerivationPrototype (havelock, { equals }) {
  return {
    _clone () {
      return havelock.derivation(this._deriver);
    },

    _forceGet () {
      let newParents = capturingParents(() => {
        let newState = this._deriver();
        this._state = equals(newState, this._value) ? UNCHANGED : CHANGED;
        this._value = newState;
      });

      // organise parents
      for (let possiblyFormerParent of this._parents) {
        if (!newParents[possiblyFormerParent._uid]) {
          // definitely former parent
          possiblyFormerParent._children.remove(this);
        }
      }

      this._parents = newParents;

      for (let p of newParents) {
        p._children.add(this);
      }
    },

    _get () {
      outer: switch (this._state) {
      case NEW:
      case ORPHANED:
        this._forceGet();
        break;
      case UNSTABLE:
        for (let parent of this._parents) {
          if (parent._state === UNSTABLE ||
              parent._state === ORPHANED ||
              parent._state === DISOWNED) {
            parent._get();
          }
          switch (parent._state) {
          case STABLE:
          case UNCHANGED:
            // noop
            break;
          case CHANGED:
            this._forceGet();
            break outer;
          default:
            throw new Error(`invalid parent mode: ${parent._state}`);
          }
        }
        this._state = UNCHANGED;
        break;
      case DISOWNED:
        let parents = new Set();
        let didForce = false;
        for (let [parent, state] of this._parents) {
          if (!equals(parent._get(), state)) {
            this._parents = new Set();
            this._forceGet();
            didForce = true;
            break outer;
          } else {
            parents.add(parent);
          }
        }
        if (!didForce) {
          for (let parent of parents) {
            parent._children.add(this);
          }
        }
        this._parents = parents;
        this._state = UNCHANGED;
        break;
      default:
        // noop
      }

      return this._value;
    }
  }
}

function createDerivation(obj, deriver) {
  obj._uid = Symbol("my_uid");
  obj._children = new Set();
  obj._parents = new Set();
  obj._deriver = deriver;
  obj._state = NEW;
  obj._type = DERIVATION;
  obj._value = Symbol("null");
  return obj;
}

/*

    $$\      $$\ $$\   $$\ $$$$$$$$\  $$$$$$\  $$$$$$$\  $$\       $$$$$$$$\
    $$$\    $$$ |$$ |  $$ |\__$$  __|$$  __$$\ $$  __$$\ $$ |      $$  _____|
    $$$$\  $$$$ |$$ |  $$ |   $$ |   $$ /  $$ |$$ |  $$ |$$ |      $$ |
    $$\$$\$$ $$ |$$ |  $$ |   $$ |   $$$$$$$$ |$$$$$$$\ |$$ |      $$$$$\
    $$ \$$$  $$ |$$ |  $$ |   $$ |   $$  __$$ |$$  __$$\ $$ |      $$  __|
    $$ |\$  /$$ |$$ |  $$ |   $$ |   $$ |  $$ |$$ |  $$ |$$ |      $$ |
    $$ | \_/ $$ |\$$$$$$  |   $$ |   $$ |  $$ |$$$$$$$  |$$$$$$$$\ $$$$$$$$\
    \__|     \__| \______/    \__|   \__|  \__|\_______/ \________|\________|

*/


function createMutablePrototype (havelock, _) {
  return {
    swap (f, ...args) {
      return this.set(f.apply(null, [this.get()].concat(args)));
    },
    lens (lensDescriptor) {
      return havelock.lens(this, lensDescriptor);
    }
  }
}


/*

    $$\       $$$$$$$$\ $$\   $$\  $$$$$$\
    $$ |      $$  _____|$$$\  $$ |$$  __$$\
    $$ |      $$ |      $$$$\ $$ |$$ /  \__|
    $$ |      $$$$$\    $$ $$\$$ |\$$$$$$\
    $$ |      $$  __|   $$ \$$$$ | \____$$\
    $$ |      $$ |      $$ |\$$$ |$$\   $$ |
    $$$$$$$$\ $$$$$$$$\ $$ | \$$ |\$$$$$$  |
    \________|\________|\__|  \__| \______/

*/


function createLensPrototype(havelock, _) {
  return {
    _clone () {
      return havelock.lens(this._parent, {
        get: this._getter,
        set: this._setter
      });
    },

    set (value) {
      this._parent.set(this._setter(this._parent._get(), value));
      return this;
    }
  }
}

function createLens(derivation, parent, descriptor) {
  derivation._getter = descriptor.get;
  derivation._setter = descriptor.set;
  derivation._parent = parent;
  derivation._type = LENS;

  return derivation;
}


/*

   $$$$$$\ $$$$$$$$\  $$$$$$\  $$\      $$\
  $$  __$$\\__$$  __|$$  __$$\ $$$\    $$$ |
  $$ /  $$ |  $$ |   $$ /  $$ |$$$$\  $$$$ |
  $$$$$$$$ |  $$ |   $$ |  $$ |$$\$$\$$ $$ |
  $$  __$$ |  $$ |   $$ |  $$ |$$ \$$$  $$ |
  $$ |  $$ |  $$ |   $$ |  $$ |$$ |\$  /$$ |
  $$ |  $$ |  $$ |    $$$$$$  |$$ | \_/ $$ |
  \__|  \__|  \__|    \______/ \__|     \__|

*/


let inReactCycle = false;

function processReactionQueue (rq) {
  inReactCycle = true;
  rq.forEach(r => r.maybeReact());
  inReactCycle = false;
}

const TXN_CTX = new TransactionContext();

const NOOP_ARRAY = {push () {}};

class AtomicTransactionState {
  constructor () {
    this.inTxnValues = {};
    this.reactionQueue = [];
  }

  getState (atom) {
    let inTxnValue = this.inTxnValues[atom._uid];
    if (inTxnValue) {
      return inTxnValue[1];
    } else {
      return atom._value;
    }
  }

  setState (atom, state) {
    this.inTxnValues[atom._uid] = [atom, state];
    gc_mark(atom, this.reactionQueue);
  }

  onCommit () {
    if (TXN_CTX.inTransaction()) {
      // push in-txn vals up to current txn
      for (let [atom, value] of util_symbolValues(this.inTxnValues)) {
        atom.set(value);
      }
    } else {
      // change root state and run reactions.
      for (let [atom, value] of util_symbolValues(this.inTxnValues)) {
        atom._value = value;
        gc_mark(atom, NOOP_ARRAY);
      }

      processReactionQueue(this.reactionQueue);

      // then sweep for a clean finish
      for (let [atom,] of util_symbolValues(this.inTxnValues)) {
        gc_sweep(atom);
      }
    }
  }

  onAbort () {
    if (!TXN_CTX.inTransaction()) {
      for (let [atom,] of util_symbolValues(this.inTxnValues)) {
        gc_sweep(atom);
      }
    }
  }
}

function createAtomPrototype (havelock, {equals}) {
  return {
    _clone () {
      return havelock.atom(this._value);
    },

    withValidator (f) {
      if (f === null) {
        return this._clone();
      } if (typeof f === 'function') {
        let result = this._clone();
        let existing = this._validator;
        if (existing) {
          result._validator = x => f(x) && existing(x)
        } else {
          result._validator = f;
        }
        return result;
      } else {
        throw new Error(".withValidator expects function or null");
      }
    },

    validate () {
      this._validate(this.get());
    },

    _validate (value) {
      let validationResult = this._validator && this._validator(value);
      if (this._validator && validationResult !== true) {
        throw new Error(`Failed validation with value: '${value}'.` +
                        ` Validator returned '${validationResult}' `);
      }
    },

    set (value) {
      if (inReactCycle) {
        throw new Error("Trying to set atom state during reaction phase. This" +
                        " is an error. Use middleware for cascading changes.");
      }
      this._validate(value);
      if (!equals(value, this._value)) {
        this._state = CHANGED;

        if (TXN_CTX.inTransaction()) {
          TXN_CTX.currentTransaction().setState(this, value);
        } else {
          this._value = value;

          let reactionQueue = [];
          gc_mark(this, reactionQueue);
          processReactionQueue(reactionQueue);
          gc_sweep(this);
        }
      }
      return this;
    },

    _get () {
      if (TXN_CTX.inTransaction()) {
        return TXN_CTX.currentTransaction().getState(this);
      }
      return this._value;
    }
  };
}

function constructAtom (atom, value) {
  atom._uid = Symbol("my_uid");
  atom._children = new Set();
  atom._state = STABLE;
  atom._value = value;
  atom._type = ATOM;
  return atom;
}

function transact (f) {
  TXN_CTX.transact(new AtomicTransactionState(), f);
}

/*

    $$\      $$\  $$$$$$\  $$$$$$$\  $$\   $$\ $$\       $$$$$$$$\
    $$$\    $$$ |$$  __$$\ $$  __$$\ $$ |  $$ |$$ |      $$  _____|
    $$$$\  $$$$ |$$ /  $$ |$$ |  $$ |$$ |  $$ |$$ |      $$ |
    $$\$$\$$ $$ |$$ |  $$ |$$ |  $$ |$$ |  $$ |$$ |      $$$$$\
    $$ \$$$  $$ |$$ |  $$ |$$ |  $$ |$$ |  $$ |$$ |      $$  __|
    $$ |\$  /$$ |$$ |  $$ |$$ |  $$ |$$ |  $$ |$$ |      $$ |
    $$ | \_/ $$ | $$$$$$  |$$$$$$$  |\$$$$$$  |$$$$$$$$\ $$$$$$$$\
    \__|     \__| \______/ \_______/  \______/ \________|\________|

*/

const defaultConfig = { equals: util_equals };

function havelock (config={}) {
  config = extend({}, defaultConfig, config);

  const Havelock = {
    transact,
    Reaction,
    isAtom:       x => x && (x._type === ATOM || x._type === LENS),
    isDerivable:  x => x && (x._type === ATOM || x._type === LENS ||
                                                 x._type === DERIVATION),
    isDerivation: x => x && (x._type === DERIVATION || x._type === LENS),
    isLensed:     x => x && x._type === LENS,
    isReaction:   x => x && x._type === REACTION,
  };

  let Derivable  = createDerivablePrototype(Havelock, config);
  let Mutable    = createMutablePrototype(Havelock, config);

  let Atom       = extend({}, Mutable, Derivable,
                          createAtomPrototype(Havelock, config));

  let Derivation = extend({}, Derivable,
                          createDerivationPrototype(Havelock, config));

  let Lens       = extend({}, Mutable, Derivation,
                          createLensPrototype(Havelock, config));


  /**
   * Constructs a new atom whose state is the given value
   */
  Havelock.atom = val => constructAtom(Object.create(Atom), val);

  /**
   * Sets the e's state to be f applied to e's current state and args
   */
  Havelock.swap = (e, f, args) => e.set(f.apply(null, [e.get()].concat(args)))
                                   .get();

  Havelock.derivation = function (f) {
    return createDerivation(Object.create(Derivation), f);
  };
  /**
   * Creates a new derivation. Can also be used as a template string tag.
   */
  Havelock.derive = function (a) {
    if (a instanceof Array) {
      return deriveString.apply(null, arguments);
    } else if (arguments.length > 0) {
      return Derivable.derive.apply(a, Array.prototype.slice.call(arguments, 1));
    } else {
      throw new Error("Wrong arity for derive. Expecting 1+ args");
    }
  };

  function deriveString (parts, ...args) {
    return Havelock.derivation(() => {
      let s = "";
      for (let i=0; i<parts.length; i++) {
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
  Havelock.lens = (parent, descriptor) => {
    let lens = Object.create(Lens);
    return createLens(createDerivation(lens,
                                       () => descriptor.get(parent.get())),
                      parent,
                      descriptor);
  };

  /**
   * dereferences a thing if it is dereferencable, otherwise just returns it.
   */
  Havelock.unpack = thing => {
    if (Havelock.isDerivable(thing)) {
      return thing.get();
    } else {
      return thing;
    }
  };

  /**
   * lifts a non-monadic function to work on derivables
   */
  Havelock.lift = f => {
    return function () {
      let args = arguments;
      return Havelock.derivation(function () {
        return f.apply(this, Array.prototype.map.call(args, Havelock.unpack));
      });
    }
  };

  /**
   * sets a to v, returning v
   */
  Havelock.set = (a, v) => a.set(v);

  Havelock.get = d => d.get();

  function deepUnpack (thing) {
    if (Havelock.isDerivable(thing)) {
      return thing.get();
    } else if (thing instanceof Array) {
      return thing.map(deepUnpack);
    } else if (thing.constructor === Object) {
      let result = {};
      for (let prop of Object.keys(thing)) {
        result[prop] = deepUnpack(thing[prop]);
      }
      return result;
    } else {
      return thing;
    }
  }

  Havelock.struct = arg => Havelock.derivation(() => deepUnpack(arg));

  Havelock.ifThenElse = (a, b, c) => a.then(b, c);

  Havelock.or = (...args) => Havelock.derivation(() => {
    let val;
    for (let arg of args) {
      val = Havelock.unpack(arg);
      if (val) {
        break;
      }
    }
    return val;
  });

  Havelock.and = (...args) => Havelock.derivation(() => {
    let val;
    for (let arg of args) {
      val = Havelock.unpack(arg);
      if (!val) {
        break;
      }
    }
    return val;
  });

  Havelock.not = x => x.not();

  Havelock.switchCase = (x, ...args) => Derivable.switch.apply(x, args);

  return Havelock;
}

extend(exports, havelock());
exports.withEquality = equals => havelock({equals})
exports['default'] = exports;

});
