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

    reaction: function (f) {
      if (typeof f === 'function') {
        return reactions_createBase(new reactions_StandardReaction(f), this);
      } else if (f instanceof reactions_Reaction) {
        return reactions_createBase(f, this);
      } else if (f && f.react) {
        return reactions_createBase(reactions_anonymousReaction(f), this);
      } else {
        throw new Error("Unrecognized type for reaction " + f);
      }
    },

    react: function (f) {
      return this.reaction(f).start().force();
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

    some: function (thenClause, elseClause) {
      return this.derive(function (x) {
        return D.unpack(x === null || x === (void 0) ? elseClause : thenClause);
      });
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
