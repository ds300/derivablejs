function mutable_createPrototype (havelock, _) {
  return {
    swap: function (f) {
      var args = util_slice(arguments, 0);
      args[0] = this.get();
      return this.set(f.apply(null, args));
    },
    lens: function (lensDescriptor) {
      return havelock.lens(this, lensDescriptor);
    }
  }
}
