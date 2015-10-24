function lens_createPrototype(D, _) {
  return {
    _clone: function () {
      return D.lens(this._parent, {
        get: this._getter,
        set: this._setter
      });
    },

    set: function (value) {
      this._parent.set(this._setter(this._parent._get(), value));
      return this;
    }
  }
}

function lens_construct(derivation, parent, descriptor) {
  derivation._getter = descriptor.get;
  derivation._setter = descriptor.set;
  derivation._parent = parent;
  derivation._type = types_LENS;

  return derivation;
}
