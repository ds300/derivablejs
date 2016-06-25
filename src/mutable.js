import * as util from './util';
import {Lens} from './lens';

export var mutablePrototype = {
  swap: function (f) {
    var args = util.slice(arguments, 0);
    args[0] = this.get();
    return this.set(f.apply(null, args));
  },
  lens: function (monoLensDescriptor) {
    var that = this;
    return new Lens({
      get: function () {
        return monoLensDescriptor.get(that.get());
      },
      set: function (val) {
        that.set(monoLensDescriptor.set(that.get(), val));
      }
    });
  },
};
