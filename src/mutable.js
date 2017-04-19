import * as util from './util';
import {Proxy} from './proxy';

export var mutablePrototype = {
  swap: function (f) {
    var args = util.slice(arguments, 0);
    args[0] = this.get();
    return this.set(f.apply(null, args));
  },
  proxy: function (monoProxyMapping) {
    var that = this;
    return new Proxy({
      get: function () {
        return monoProxyMapping.get(that.get());
      },
      set: function (val) {
        that.set(monoProxyMapping.set(that.get(), val));
      }
    });
  },
};
