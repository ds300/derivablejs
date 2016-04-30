import * as util from './util';
import * as types from './types';


export function createPrototype (D, _) {
  return {
    _clone: function () {
      return util.setEquals(D.lens(this._lensDescriptor), this._equals);
    },

    set: function (value) {
      var that = this;
      D.atomically(function () {
        that._lensDescriptor.set(value);
      });
      return this;
    },
  };
};

export function construct (derivation, descriptor) {
  derivation._lensDescriptor = descriptor;
  derivation._type = types.LENS;

  return derivation;
};
