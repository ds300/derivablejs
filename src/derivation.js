import * as util from "./util";
import * as parents from "./parents";
import * as types from "./types";
import { CHANGED, UNCHANGED, UNKNOWN, DISCONNECTED } from "./states";

export function Derivation(deriver, meta = null) {
  this._deriver = deriver;
  this._parents = null;
  this._type = types.DERIVATION;
  this._value = util.unique;
  this._equals = null;
  this._activeChildren = [];
  this._state = DISCONNECTED;
  this._meta = meta;

  if (util.isDebug()) {
    this.stack = Error().stack;
  }
}

util.assign(Derivation.prototype, {
  _clone() {
    return util.setEquals(derive(this._deriver), this._equals);
  },

  _forceEval() {
    let newVal = null;
    let newNumParents;

    try {
      if (this._parents === null) {
        this._parents = [];
      }
      parents.startCapturingParents(this, this._parents);
      if (!util.isDebug()) {
        newVal = this._deriver();
      } else {
        try {
          newVal = this._deriver();
        } catch (e) {
          console.error(this.stack);
          throw e;
        }
      }
      newNumParents = parents.retrieveParentsFrame().offset;
    } finally {
      parents.stopCapturingParents();
    }

    if (!util.equals(this, newVal, this._value)) {
      this._state = CHANGED;
    } else {
      this._state = UNCHANGED;
    }

    for (let i = newNumParents, len = this._parents.length; i < len; i++) {
      const oldParent = this._parents[i];
      detach(oldParent, this);
      this._parents[i] = null;
    }

    this._parents.length = newNumParents;

    this._value = newVal;
  },

  _update() {
    if (this._parents === null) {
      // this._state === DISCONNECTED
      this._forceEval();
      // this._state === CHANGED ?
    } else if (this._state === UNKNOWN) {
      const len = this._parents.length;
      for (let i = 0; i < len; i++) {
        const parent = this._parents[i];

        if (parent._state === UNKNOWN) {
          parent._update();
        }

        if (parent._state === CHANGED) {
          this._forceEval();
          break;
        }
      }
      if (this._state === UNKNOWN) {
        this._state = UNCHANGED;
      }
    }
  },

  get() {
    parents.maybeCaptureParent(this);
    if (this._activeChildren.length > 0) {
      this._update();
    } else {
      parents.startCapturingParents(void 0, []);
      try {
        this._value = this._deriver();
      } finally {
        parents.stopCapturingParents();
      }
    }
    return this._value;
  }
});

export function detach(parent, child) {
  util.removeFromArray(parent._activeChildren, child);
  if (parent._activeChildren.length === 0 && parent._parents != null) {
    const len = parent._parents.length;
    for (let i = 0; i < len; i++) {
      detach(parent._parents[i], parent);
    }
    parent._parents = null;
    parent._state = DISCONNECTED;
  }
}

export function derive(f, meta) {
  if (typeof f !== "function") {
    throw Error("derive requires function");
  }
  return new Derivation(f, meta);
}
