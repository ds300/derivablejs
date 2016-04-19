import {captureParent, captureEpoch, capturingParentsEpochs} from './parents'
import {addToArray, removeFromArray} from './util';

let globalEpoch = 0;

export interface Derivable<T> {
  get(): T;
  derive<E>(f: (t:T) => E): Derivable<E>;
  reactor(f: (t: T) => void): Reactor<T>;
  epoch: number;
}

export class Atom<T> implements Derivable<T> {
  value: T;
  epoch: number;
  reactors: any[];
  constructor(init: T) {
    this.value = init;
    this.epoch = 0;
    this.reactors = [];
  }
  reactor(f) {
    return new Reactor(this, f);
  }
  get() {
    captureEpoch(captureParent(this), this.epoch);
    return this.value;
  }
  _update() {

  }
  derive(f) {
    return new Derivation(() => f(this.get()));
  }
  set(value: T) {
    if (value !== this.value) {
      globalEpoch++;
      this.epoch++;
      this.value = value;
      this.reactors.forEach(r => r.maybeReact());
    }
  }
}

const EMPTY = Object.freeze({});

export class Derivation<T> implements Derivable<T> {
  cache: T;
  epoch: number;
  lastGlobalEpoch: number;
  lastParentsEpochs: any[];
  deriver: () => T;
  constructor(deriver: () => T) {
    this.deriver = deriver;
    this.cache = <T>EMPTY;
    this.lastGlobalEpoch = globalEpoch - 1;
    this.epoch = 0;
  }
  reactor(f) {
    return new Reactor(this, f);
  }
  derive(f) {
    return new Derivation(() => f(this.get()));
  }
  _forceEval() {
    let newVal = null;
    const parents = capturingParentsEpochs(() => {
      newVal = this.deriver();
    });

    this.lastParentsEpochs = parents;

    if (newVal !== this.cache) {
      this.epoch++;
    }
    this.cache = newVal;
  }
  _update() {
    if (this.lastGlobalEpoch === globalEpoch) {
      // do nothing
    } else if (this.cache === EMPTY) {
      // touched for the very first time
      this._forceEval();
    } else {
      // check parent epochs
      for (var i = 0, len = this.lastParentsEpochs.length; i < len; i+=2) {
        const parent = this.lastParentsEpochs[i];
        const lastParentEpoch = this.lastParentsEpochs[i+1];

        parent._update();
        if (parent.epoch !== lastParentEpoch) {
          this._forceEval();
          break;
        }
      }
    }
  }
  get() {
    const idx = captureParent(this);
    this._update();
    captureEpoch(idx, this.epoch);
    return this.cache;
  }
}

function descend(derivable, reactor) {
  if (derivable instanceof Atom) {
    addToArray(derivable.reactors, reactor);
    addToArray(reactor.atoms, derivable);
  } else {
    for (var i = 0, len = derivable.lastParentsEpochs.length; i < len; i+=2) {
      descend(derivable.lastParentsEpochs[i], reactor);
    }
  }
}

const reactorParentStack = [];

class Reactor<T> {
  derivable: Derivable<T>
  lastValue: T;
  lastEpoch: number;
  react: (t: T) => void;
  atoms: Atom<any>[];
  parent: Reactor<any>;
  yielding: boolean;
  $running: Atom<boolean>;
  constructor(derivable: Derivable<T>, react: (t: T) => void) {
    this.derivable = derivable;
    this.react = react;
    this.atoms = [];
    this.parent = null;
    this.$running = new Atom(false);
  }
  start() {
    this.lastValue = this.derivable.get();
    this.lastEpoch = this.derivable.epoch;
    this.atoms = [];
    descend(this.derivable, this);
    const len = reactorParentStack.length;
    if (len > 0) {
      this.parent = reactorParentStack[len - 1];
    }
    this.$running.set(true);
  }
  _force(nextValue) {
    reactorParentStack.push(this);
    (<any>this.react).call(null, nextValue);
    reactorParentStack.pop();
  }
  force() {
    this._force(this.derivable.get());
  }
  maybeReact() {
    if (this.$running.get()) {
      if (this.yielding) {
        throw Error('reactory dependency cycle detected');
      }
      if (this.parent !== null) {
        this.yielding = true;
        this.parent.maybeReact();
        this.yielding = false;
      }
      const nextValue = this.derivable.get();
      if (this.derivable.epoch !== this.lastEpoch
          && nextValue !== this.lastValue) {
        this._force(nextValue);
      }
      this.lastEpoch = this.derivable.epoch;
      this.lastValue = nextValue;
    }
  }
  stop() {
    this.atoms.forEach(atom => removeFromArray(atom.reactors, this));
    this.atoms = [];
    this.parent = null;
    this.$running.set(false);
  }
}
