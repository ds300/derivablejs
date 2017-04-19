import * as util from './util';
import * as types from './types';
import {Derivation} from './derivation';
import {atomically} from './transactions';

export function Proxy (descriptor) {
  Derivation.call(this, descriptor.get);
  this._proxyMapping = descriptor;
  this._type = types.PROXY;
}

util.assign(Proxy.prototype, Derivation.prototype, {
  _clone: function () {
    return util.setEquals(new Proxy(this._proxyMapping), this._equals);
  },

  set: function (value) {
    var that = this;
    atomically(function () {
      that._proxyMapping.set(value);
    });
    return this;
  },
});

export function proxy (descriptor) {
  return new Proxy(descriptor);
}
