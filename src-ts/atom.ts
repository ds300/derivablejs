import {captureParent, captureEpoch, capturingParentsEpochs} from './parents'

let globalEpoch = 0;

interface Derivable<T> {
  get(): T;
  derive<E>(f: (t:T) => E): Derivable<E>;
  epoch: number;
}

class Atom<T> {
  value: T;
  epoch: number;
  reactors: any[];
  constructor(init: T) {
    this.value = init;
    this.epoch = 0;
    this.reactors = [];
  }
  get() {
    captureEpoch(captureParent(this), this.epoch);
    return this.value;
  }
  _update() {

  }
}

const EMPTY = Object.freeze({});

class Derivation<T> {
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
  _forceEval() {
    let newVal = null;
    const parents = capturingParentsEpochs(() => {
      newVal = this.deriver();
    });

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
