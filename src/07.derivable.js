function derivable_createPrototype (havelock, opts) {
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
        return havelock.derivation(function () {
          return f(that.get());
        });
      case 2:
        return havelock.derivation(function () {
          return f(that.get(), havelock.unpack(a));
        });
      case 3:
        return havelock.derivation(function () {
          return f(that.get(), havelock.unpack(a), havelock.unpack(b));
        });
      case 4:
        return havelock.derivation(function () {
          return f(that.get(),
                   havelock.unpack(a),
                   havelock.unpack(b),
                   havelock.unpack(c));
        });
      case 5:
        return havelock.derivation(function () {
          return f(that.get(),
                   havelock.unpack(a),
                   havelock.unpack(b),
                   havelock.unpack(c),
                   havelock.unpack(d));
        });
      default:
        var args = ([that]).concat(util_slice(arguments, 1));
        return havelock.derivation(function () {
          return f.apply(null, args.map(havelock.unpack));
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
      return havelock.lift(opts.equals)(this, other);
    },

    and: function (other) {
      return this.derive(function (x) {return x && havelock.unpack(other);});
    },

    or: function (other) {
      return this.derive(function (x) {return x || havelock.unpack(other);});
    },

    then: function (thenClause, elseClause) {
      return this.derive(function (x) {
        return havelock.unpack(x ? thenClause : elseClause);
      });
    },

    some: function (thenClause, elseClause) {
      return this.derive(function (x) {
        return havelock.unpack(x === null || x === (void 0) ? elseClause : thenClause);
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
        if (opts.equals(x, havelock.unpack(args[i]))) {
          return havelock.unpack(args[i+1]);
        }
      }
      if (i === args.length - 1) {
        return havelock.unpack(args[i]);
      }
    });
  };
  return x;
}
