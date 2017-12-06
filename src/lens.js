import * as util from "./util";
import * as types from "./types";
import { Derivation } from "./derivation";
import { atomically } from "./transactions";

export function Lens(descriptor) {
  Derivation.call(this, descriptor.get);
  this._descriptor = descriptor;
  this._type = types.LENS;
}

util.assign(Lens.prototype, Derivation.prototype, {
  _clone() {
    return util.setEquals(new Lens(this._descriptor), this._equals);
  },

  set(value) {
    atomically(() => {
      this._descriptor.set(value);
    });
  }
});

export function lens(descriptor) {
  return new Lens(descriptor);
}
