function mutable_createPrototype (D, _) {
  return {
    swap: function (f) {
      var args = util_slice(arguments, 0);
      args[0] = this.get();
      return this.set(f.apply(null, args));
    },
    lens: function (monoLensDescriptor) {
      var that = this;
      return D.lens({
        get: function () {
          return monoLensDescriptor.get(that.get());
        },
        set: function (val) {
          that.set(monoLensDescriptor.set(that.get(), val));
        }
      });
    },
  };
}
