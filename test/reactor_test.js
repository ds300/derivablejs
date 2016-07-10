'use strict';

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _derivable = require('../dist/derivable');

var _derivable2 = _interopRequireDefault(_derivable);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe("anonymous reactors", function () {
  it('are created with the .react method', function () {
    var a = (0, _derivable.atom)('a');
    var val = null;
    a.react(function (a) {
      val = a;
    });

    _assert2.default.strictEqual(val, 'a');

    a.set('b');

    _assert2.default.strictEqual(val, 'b');
  });

  it('can start when the `from` condition becomes truthy', function () {
    var cond = (0, _derivable.atom)(false);
    var a = (0, _derivable.atom)('a');
    var val = null;
    a.react(function (a) {
      val = a;
    }, { from: cond });

    _assert2.default.strictEqual(val, null);

    cond.set('truthy value');

    _assert2.default.strictEqual(val, 'a');

    a.set('b');

    _assert2.default.strictEqual(val, 'b');
  });

  it('can stop (forever) when the `until` condition becomes truthy', function () {
    var cond = (0, _derivable.atom)(false);
    var a = (0, _derivable.atom)('a');
    var val = null;
    a.react(function (a) {
      val = a;
    }, { until: cond });

    _assert2.default.strictEqual(val, 'a');

    a.set('b');

    _assert2.default.strictEqual(val, 'b');

    cond.set('truthy value');

    a.set('c');

    _assert2.default.strictEqual(val, 'b');

    cond.set(false);

    a.set('d');

    _assert2.default.strictEqual(val, 'b');
  });

  it('can start and stop when the `when` condition becomes truthy and falsey respectively', function () {
    var cond = (0, _derivable.atom)(false);
    var a = (0, _derivable.atom)('a');
    var val = null;
    a.react(function (a) {
      val = a;
    }, { when: cond });

    _assert2.default.strictEqual(val, null);

    cond.set('truthy value');

    _assert2.default.strictEqual(val, 'a');

    a.set('b');

    _assert2.default.strictEqual(val, 'b');

    cond.set(0); //falsey value

    a.set('c');

    _assert2.default.strictEqual(val, 'b');

    cond.set(1); //truthy value

    _assert2.default.strictEqual(val, 'c');
  });

  it('can have `from`, `when`, and `until` specified as functions', function () {
    {
      (function () {
        var cond = (0, _derivable.atom)(false);
        var a = (0, _derivable.atom)('a');
        var val = null;
        a.react(function (a) {
          val = a;
        }, { when: function when() {
            return cond.get();
          } });

        _assert2.default.strictEqual(val, null);

        cond.set('truthy value');

        _assert2.default.strictEqual(val, 'a');
      })();
    }
    {
      (function () {
        var cond = (0, _derivable.atom)(false);
        var a = (0, _derivable.atom)('a');
        var val = null;
        a.react(function (a) {
          val = a;
        }, { from: function from() {
            return cond.get();
          } });

        _assert2.default.strictEqual(val, null);

        cond.set('truthy value');

        _assert2.default.strictEqual(val, 'a');
      })();
    }
    {
      (function () {
        var a = (0, _derivable.atom)('a');
        var val = null;
        a.react(function (a) {
          val = a;
        }, { until: function until() {
            return a.is('b').get();
          } });

        _assert2.default.strictEqual(val, 'a');

        a.set('c');

        _assert2.default.strictEqual(val, 'c');

        a.set('b');

        _assert2.default.strictEqual(val, 'c');

        a.set('a');

        _assert2.default.strictEqual(val, 'c');
      })();
    }
  });

  it('doesnt like it when `from`, `when`, and `until` are other things', function () {
    var a = (0, _derivable.atom)('a');
    _assert2.default.throws(function () {
      return a.react(function () {
        return null;
      }, { from: 'a string' });
    });
    _assert2.default.throws(function () {
      return a.react(function () {
        return null;
      }, { when: 3 });
    });
    _assert2.default.throws(function () {
      return a.react(function () {
        return null;
      }, { until: new Date() });
    });
  });

  it('can have `from`, `when`, and `until` conditions all at once', function () {
    {
      // normal usage
      var from = (0, _derivable.atom)(false);
      var when = (0, _derivable.atom)(false);
      var until = (0, _derivable.atom)(false);

      var a = (0, _derivable.atom)('a');
      var val = null;
      a.react(function (a) {
        val = a;
      }, { from: from, when: when, until: until });

      _assert2.default.strictEqual(val, null);

      from.set(true);
      // when is still false
      _assert2.default.strictEqual(val, null);
      when.set(true);
      _assert2.default.strictEqual(val, 'a');
      a.set('b');
      _assert2.default.strictEqual(val, 'b');
      when.set(false);
      a.set('c');
      _assert2.default.strictEqual(val, 'b');
      when.set(true);
      _assert2.default.strictEqual(val, 'c');
      until.set(true);
      a.set('d');
      _assert2.default.strictEqual(val, 'c');
    }
    {
      // until already true
      var _from = (0, _derivable.atom)(false);
      var _when = (0, _derivable.atom)(false);
      var _until = (0, _derivable.atom)(true);

      var _a = (0, _derivable.atom)('a');
      var _val = null;
      _a.react(function (a) {
        _val = a;
      }, { from: _from, when: _when, until: _until });

      _assert2.default.strictEqual(_val, null);
      _from.set(true);
      // when is still false
      _assert2.default.strictEqual(_val, null);
      _when.set(true);
      _assert2.default.strictEqual(_val, null);
    }
    {
      // until already true
      var _from2 = (0, _derivable.atom)(false);
      var _when2 = (0, _derivable.atom)(false);
      var _until2 = (0, _derivable.atom)(true);

      var _a2 = (0, _derivable.atom)('a');
      var _val2 = null;
      _a2.react(function (a) {
        _val2 = a;
      }, { from: _from2, when: _when2, until: _until2 });

      _assert2.default.strictEqual(_val2, null);
      _from2.set(true);
      // when is still false
      _assert2.default.strictEqual(_val2, null);
      _when2.set(true);
      _assert2.default.strictEqual(_val2, null);
    }
    {
      // when already true
      var _from3 = (0, _derivable.atom)(false);
      var _when3 = (0, _derivable.atom)(true);
      var _until3 = (0, _derivable.atom)(false);

      var _a3 = (0, _derivable.atom)('a');
      var _val3 = null;
      _a3.react(function (a) {
        _val3 = a;
      }, { from: _from3, when: _when3, until: _until3 });

      _assert2.default.strictEqual(_val3, null);
      _from3.set(true);
      _assert2.default.strictEqual(_val3, 'a');
    }
    {
      // from and when already true
      var _from4 = (0, _derivable.atom)(true);
      var _when4 = (0, _derivable.atom)(true);
      var _until4 = (0, _derivable.atom)(false);

      var _a4 = (0, _derivable.atom)('a');
      var _val4 = null;
      _a4.react(function (a) {
        _val4 = a;
      }, { from: _from4, when: _when4, until: _until4 });

      _assert2.default.strictEqual(_val4, 'a');
    }
    {
      // from and until already true
      var _from5 = (0, _derivable.atom)(true);
      var _when5 = (0, _derivable.atom)(false);
      var _until5 = (0, _derivable.atom)(true);

      var _a5 = (0, _derivable.atom)('a');
      var _val5 = null;
      _a5.react(function (a) {
        _val5 = a;
      }, { from: _from5, when: _when5, until: _until5 });

      _assert2.default.strictEqual(_val5, null);
      _when5.set(true);
      _assert2.default.strictEqual(_val5, null);
    }
    {
      // until and when already true
      var _from6 = (0, _derivable.atom)(false);
      var _when6 = (0, _derivable.atom)(true);
      var _until6 = (0, _derivable.atom)(true);

      var _a6 = (0, _derivable.atom)('a');
      var _val6 = null;
      _a6.react(function (a) {
        _val6 = a;
      }, { from: _from6, when: _when6, until: _until6 });

      _assert2.default.strictEqual(_val6, null);
      _from6.set(true);
      _assert2.default.strictEqual(_val6, null);
    }
    {
      (function () {
        // when and until become true atomically
        var when = (0, _derivable.atom)(false);
        var until = (0, _derivable.atom)(false);

        var a = (0, _derivable.atom)('a');
        var val = null;
        a.react(function (a) {
          val = a;
        }, { when: when, until: until });

        _assert2.default.strictEqual(val, null);
        _derivable2.default.atomically(function () {
          when.set(true);
          until.set(true);
        });

        _assert2.default.strictEqual(val, null);
      })();
    }
  });

  it('can specify that the first reaction should be skipped', function () {
    var when = (0, _derivable.atom)(false);
    var a = (0, _derivable.atom)('a');
    var val = null;
    a.react(function (a) {
      val = a;
    }, { skipFirst: true, when: when });

    _assert2.default.strictEqual(val, null);
    when.set(true);
    _assert2.default.strictEqual(val, null);
    a.set('b');
    _assert2.default.strictEqual(val, 'b');
  });

  it('can specify that a reaction should only happen once', function () {
    {
      // without skipFirst
      var a = (0, _derivable.atom)('a');
      var val = null;
      a.react(function (a) {
        val = a;
      }, { once: true });

      _assert2.default.strictEqual(val, 'a');

      a.set('b');
      _assert2.default.strictEqual(val, 'a');
    }
    {
      // with skipFirst
      var _a7 = (0, _derivable.atom)('a');
      var _val7 = null;
      _a7.react(function (a) {
        _val7 = a;
      }, { skipFirst: true, once: true });

      _assert2.default.strictEqual(_val7, null);

      _a7.set('b');
      _assert2.default.strictEqual(_val7, 'b');
      _a7.set('c');
      _assert2.default.strictEqual(_val7, 'b');
    }
    {
      // with when
      var when = (0, _derivable.atom)(false);
      var _a8 = (0, _derivable.atom)('a');
      var _val8 = null;
      _a8.react(function (a) {
        _val8 = a;
      }, { when: when, once: true });

      _assert2.default.strictEqual(_val8, null);

      _a8.set('b');

      _assert2.default.strictEqual(_val8, null);
      when.set(true);

      _assert2.default.strictEqual(_val8, 'b');

      _a8.set('c');
      _assert2.default.strictEqual(_val8, 'b');
    }
  });

});

describe("the .react method", function () {
  it("must have a function as the first argument", function () {
    _assert2.default.throws(function () {
      return (0, _derivable.atom)(5).react();
    });
    _assert2.default.throws(function () {
      return (0, _derivable.atom)(5).react(4);
    });
    _assert2.default.throws(function () {
      return (0, _derivable.atom)(5).react('');
    });
    _assert2.default.throws(function () {
      return (0, _derivable.atom)(5).react({});
    });
  });
});

describe("setting the values of atoms in a reaction phase", function () {
  it("is ok as long as no cycles are created", function () {
    var a = (0, _derivable.atom)("a");

    var b = (0, _derivable.atom)("b");

    a.react(function (a) {
      return b.set(b.get() + a);
    });

    _assert2.default.strictEqual(b.get(), "ba");

    a.set("aa");

    _assert2.default.strictEqual(b.get(), "baaa");

    // derivable disallows
    _assert2.default.throws(function () {
      return b.react(function (b) {
        return a.set(b);
      });
    });
  });

  it("is not allowed if the atom in question is upstream of the reactor", function () {
    var n = (0, _derivable.atom)(3);

    // currently 1
    var nmod2 = n.derive(function (x) {
      return x % 2;
    });

    var double = function double(n) {
      return n * 2;
    };

    var r = nmod2.react(function (_) {
      return n.swap(double);
    }, {skipFirst: true});

    _assert2.default.throws(function () {
      return n.set(2);
    });
    // nmod2 becomes 0, reactor triggers n being set to 4
    // reactor caught up in sweep again, identified as cycle
  });
});

describe("tickers", function () {
  it("allow reacting at custom intervals", function () {
    var a = (0, _derivable.atom)("a");

    var ticker = _derivable2.default.ticker();

    var b = "b";

    a.react(function (a) {
      return b = a;
    }, {skipFirst: true});

    _assert2.default.strictEqual(b, "b");

    a.set("c");

    _assert2.default.strictEqual(b, "b");

    a.set("d");

    _assert2.default.strictEqual(b, "b");

    ticker.tick();

    _assert2.default.strictEqual(b, "d");

    a.set("e");

    _assert2.default.strictEqual(b, "d");

    a.set("f");

    _assert2.default.strictEqual(b, "d");

    ticker.tick();

    _assert2.default.strictEqual(b, "f");

    ticker.release();
  });

  it("can be used by more than one piece of the stack", function () {
    var a = (0, _derivable.atom)("a");
    var ticker1 = _derivable2.default.ticker();
    var ticker2 = _derivable2.default.ticker();
    var ticker3 = _derivable2.default.ticker();

    (0, _assert2.default)(ticker1 !== ticker2);
    (0, _assert2.default)(ticker1 !== ticker3);
    (0, _assert2.default)(ticker2 !== ticker3);

    var b = "b";

    a.react(function (a) {
      return b = a;
    }, {skipFirst: true});
    _assert2.default.strictEqual(b, "b");
    a.set("c");
    _assert2.default.strictEqual(b, "b");
    a.set("d");
    _assert2.default.strictEqual(b, "b");
    ticker1.tick();
    _assert2.default.strictEqual(b, "d");
    a.set("e");
    _assert2.default.strictEqual(b, "d");
    a.set("f");
    _assert2.default.strictEqual(b, "d");
    ticker2.tick();
    _assert2.default.strictEqual(b, "f");
    a.set("g");
    ticker3.tick();
    _assert2.default.strictEqual(b, "g");

    ticker1.release();
    ticker2.release();
    ticker3.release();
  });

  it("are reference counted", function () {
    var a = (0, _derivable.atom)(null);
    var b = "b";

    a.react(function (a) {
      return b = a;
    }, {skipFirst: true});

    a.set("a");

    _assert2.default.strictEqual(b, "a");

    var ticker1 = _derivable2.default.ticker();
    var ticker2 = _derivable2.default.ticker();
    var ticker3 = _derivable2.default.ticker();

    a.set("b");

    _assert2.default.strictEqual(b, "a");

    ticker1.release();
    _assert2.default.strictEqual(b, "a");
    ticker2.release();
    _assert2.default.strictEqual(b, "a");
    ticker3.release();
    _assert2.default.strictEqual(b, "b");

    a.set("c");

    _assert2.default.strictEqual(b, "c");
  });

  it('can reset the global state to the last tick', function () {
    var a = (0, _derivable.atom)('a');
    var b = (0, _derivable.atom)('b');

    var t = _derivable2.default.ticker();

    a.set('b');
    b.set('a');

    _assert2.default.strictEqual(a.get(), 'b');
    _assert2.default.strictEqual(b.get(), 'a');

    t.reset();

    _assert2.default.strictEqual(a.get(), 'a');
    _assert2.default.strictEqual(b.get(), 'b');

    t.release();
    _assert2.default.throws(function () {
      return t.reset();
    });
  });

  it("cannot be used after being released", function () {
    var t1 = _derivable2.default.ticker();
    var t2 = _derivable2.default.ticker();

    t1.release();

    _assert2.default.throws(function () {
      return t1.release();
    });

    t2.release();

    _assert2.default.throws(function () {
      return t2.tick();
    });
  });

  it("should not cause parents to be investigated in the wrong order", function () {
    var a = (0, _derivable.atom)(null);
    var b = a.derive(function (a) {
      return a.toString();
    });
    var c = a.then(b, 'a is null');

    var expecting = 'a is null';

    c.react(function (c) {
      return _assert2.default.strictEqual(c, expecting);
    });

    expecting = 'some other string';

    a.set('some other string');

    expecting = 'a is null';
    // this would throw if subject to wrong-order bug
    a.set(null);
  });

  it("can be created in reactors", function () {
    var a = (0, _derivable.atom)('a');

    _derivable2.default.transact(function () {
      a.set('b');
      a.react(function (a) {
        return console.log(a);
      });
    });
  });
});


describe('the `when` optons to the `react` method', function () {
  it('allows one to tie the lifecycle of a reactor to some piece of state anonymously', function () {
    var $Cond = (0, _derivable.atom)(false);
    var $N = (0, _derivable.atom)(0);
    var inc = function inc(x) {
      return x + 1;
    };

    var i = 0;
    $N.react(function (n) {
      return i++;
    }, { when: $Cond });

    _assert2.default.strictEqual(i, 0);

    $N.swap(inc);

    _assert2.default.strictEqual(i, 0);

    $Cond.set(true);

    _assert2.default.strictEqual(i, 1);

    $N.swap(inc);

    _assert2.default.strictEqual(i, 2);

    $N.swap(inc);
    $N.swap(inc);

    _assert2.default.strictEqual(i, 4);

    // it uses truthy/falsiness
    $Cond.set(0);

    $N.swap(inc);
    $N.swap(inc);

    _assert2.default.strictEqual(i, 4);
  });

  it('casts the condition to a boolean', function () {
    var $Cond = (0, _derivable.atom)("blub");
    var $N = (0, _derivable.atom)(0);
    var inc = function inc(x) {
      return x + 1;
    };

    var i = 0;

    $N.react(function (n) {
      return i++;
    }, { when: $Cond });

    _assert2.default.strictEqual(i, 1);

    $N.swap(inc);
    _assert2.default.strictEqual(i, 2);
    $N.swap(inc);
    $N.swap(inc);
    $N.swap(inc);
    _assert2.default.strictEqual(i, 5);
    $Cond.set("steve");
    // sould cause .force() if not casting to boolean, which would inc i
    _assert2.default.strictEqual(i, 5);
  });
});

describe('the .mReact method', function () {
  it('only reacts when the thing in the derivable is not null or undefined', function () {
    var a = _derivable.atom(null);

    var _a = "Tree";

    a.mReact(function (a) {
      _a = a;
    });

    _assert.strictEqual(_a, "Tree");

    a.set("House");

    _assert.strictEqual(_a, "House");

    a.set(void 0);

    _assert.strictEqual(_a, "House");
  });

  it('merges any given when condition', function () {
    var a = _derivable.atom(null);
    var alive = _derivable.atom(true);

    var _a = "Tree";

    a.mReact(function (a) {
      _a = a;
    }, {when: alive});

    _assert.strictEqual(_a, "Tree");

    a.set("House");

    _assert.strictEqual(_a, "House");

    a.set(void 0);

    _assert.strictEqual(_a, "House");

    a.set("Tree");

    _assert.strictEqual(_a, "Tree");

    alive.set(false);

    a.set("House");

    _assert.strictEqual(_a, "Tree");
  });

  it("shouldn't touch any other conditions", function () {
    var a = _derivable.atom(null);
    var alive = _derivable.atom(true);
    var from = _derivable.atom(false);
    var until = _derivable.atom(false);

    var _a = "Tree";

    a.mReact(function (a) {
      _a = a;
    }, {when: alive, from: from, until: until});

    _assert.strictEqual(_a, "Tree");

    a.set("House");

    _assert.strictEqual(_a, "Tree");

    from.set(true);

    _assert.strictEqual(_a, "House");

    a.set(void 0);

    _assert.strictEqual(_a, "House");

    alive.set(false);

    a.set("Tree");

    _assert.strictEqual(_a, "House");

    alive.set(true);

    _assert.strictEqual(_a, "Tree");

    until.set(true);

    a.set("House");

    _assert.strictEqual(_a, "Tree");

  });
});
