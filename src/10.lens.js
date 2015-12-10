function lens_createPrototype(D, _) {
  return {
    _clone: function () {
      return D.lens(this._lensDescriptor);
    },

    set: function (value) {
      var that = this;
      D.atomically(function () {
        that._lensDescriptor.set(value);
      });
      return this;
    }
  }
}

function lens_construct(derivation, descriptor) {
  derivation._lensDescriptor = descriptor;
  derivation._type = types_LENS;

  return derivation;
}
