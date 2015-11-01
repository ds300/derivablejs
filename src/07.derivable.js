function derivable_createPrototype (D, opts) {
  var x = {
    /**
     * Creates a derived value whose state will always be f applied to this
     * value
     */
    derive: function (f, a, b, c, d) {
      var that = this;
      switch (arguments.length) {
      case 0:
        return that;
      case 1:
        return D.derivation(function () {
          return f(that.get());
        });
      case 2:
        return D.derivation(function () {
          return f(that.get(), D.unpack(a));
        });
      case 3:
        return D.derivation(function () {
          return f(that.get(), D.unpack(a), D.unpack(b));
        });
      case 4:
        return D.derivation(function () {
          return f(that.get(),
                   D.unpack(a),
                   D.unpack(b),
                   D.unpack(c));
        });
      case 5:
        return D.derivation(function () {
          return f(that.get(),
                   D.unpack(a),
                   D.unpack(b),
                   D.unpack(c),
                   D.unpack(d));
        });
      default:
        var args = ([that]).concat(util_slice(arguments, 1));
        return D.derivation(function () {
          return f.apply(null, args.map(D.unpack));
        });
      }
    },



    reactor: function (f) {
      if (typeof f === 'function') {
        return reactors_createBase(new reactors_StandardReactor(f), this);
      } else if (f instanceof reactors_Reactor) {
        return reactors_createBase(f, this);
      } else if (f && f.react) {
        return reactors_createBase(reactors_anonymousReactor(f), this);
      } else {
        throw new Error("Unrecognized type for reactor " + f);
      }
    },

    react: function (f) {
      return this.reactor(f).start().force();
    },

    get: function () {
      parents_maybeCaptureParent(this);
      return this._get(); // abstract protected method, in Java parlance
    },

    is: function (other) {
      return D.lift(opts.equals)(this, other);
    },

    and: function (other) {
      return this.derive(function (x) {return x && D.unpack(other);});
    },

    or: function (other) {
      return this.derive(function (x) {return x || D.unpack(other);});
    },

    then: function (thenClause, elseClause) {
      return this.derive(function (x) {
        return D.unpack(x ? thenClause : elseClause);
      });
    },

    mThen: function (thenClause, elseClause) {
      return this.derive(function (x) {
        return D.unpack(util_some(x) ? thenClause : elseClause);
      });
    },

    mOr: function (other) {
      return this.mThen(this, other);
    },

    mDerive: function () {
      return this.mThen(this.derive.apply(this, arguments));
    },

    mAnd: function (other) {
      return this.mThen(other, this);
    },

    not: function () {
      return this.derive(function (x) { return !x; });
    },
  };
  x.switch = function () {
    var args = arguments;
    return this.derive(function (x) {
      var i;
      for (i = 0; i < args.length-1; i+=2) {
        if (opts.equals(x, D.unpack(args[i]))) {
          return D.unpack(args[i+1]);
        }
      }
      if (i === args.length - 1) {
        return D.unpack(args[i]);
      }
    });
  };
  return x;
}
