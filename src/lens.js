import * as util from './util';
import * as types from './types';
import {Derivation} from './derivation';
import {atomically} from './transactions';

export function Lens (descriptor) {
  Derivation.call(this, descriptor.get);
  this._lensDescriptor = descriptor;
  this._type = types.LENS;
}

util.assign(Lens.prototype, Derivation.prototype, {
  _clone: function () {
    return util.setEquals(new Lens(this._lensDescriptor), this._equals);
  },

  set: function (value) {
    var that = this;
    atomically(function () {
      that._lensDescriptor.set(value);
    });
    return this;
  },
});

export function lens (descriptor) {
  return new Lens(descriptor);
}
