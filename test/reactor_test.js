'use strict';

var derivable = require('../dist/derivable');

var assert = require('assert');

describe("anonymous reactors", function () {
  it('are created with the .react method', function () {
    var a = derivable.atom('a');
    var val = null;
    a.react(function (a) {
      val = a;
    });

    assert.strictEqual(val, 'a');

    a.set('b');

    assert.strictEqual(val, 'b');
  });

  it('can start when the `from` condition becomes truthy', function () {
    var cond = derivable.atom(false);
    var a = derivable.atom('a');
    var val = null;
    a.react(function (a) {
      val = a;
    }, { from: cond });

    assert.strictEqual(val, null);

    cond.set('truthy value');

    assert.strictEqual(val, 'a');

    a.set('b');

    assert.strictEqual(val, 'b');
  });

  it('can stop (forever) when the `until` condition becomes truthy', function () {
    var cond = derivable.atom(false);
    var a = derivable.atom('a');
    var val = null;
    a.react(function (a) {
      val = a;
    }, { until: cond });

    assert.strictEqual(val, 'a');

    a.set('b');

    assert.strictEqual(val, 'b');

    cond.set('truthy value');

    a.set('c');

    assert.strictEqual(val, 'b');

    cond.set(false);

    a.set('d');

    assert.strictEqual(val, 'b');
  });

  it('can start and stop when the `when` condition becomes truthy and falsey respectively', function () {
    var cond = derivable.atom(false);
    var a = derivable.atom('a');
    var val = null;
    a.react(function (a) {
      val = a;
    }, { when: cond });

    assert.strictEqual(val, null);

    cond.set('truthy value');

    assert.strictEqual(val, 'a');

    a.set('b');

    assert.strictEqual(val, 'b');

    cond.set(0); //falsey value

    a.set('c');

    assert.strictEqual(val, 'b');

    cond.set(1); //truthy value

    assert.strictEqual(val, 'c');
  });

  it('can have `from`, `when`, and `until` specified as functions', function () {
    {
      (function () {
        var cond = derivable.atom(false);
        var a = derivable.atom('a');
        var val = null;
        a.react(function (a) {
          val = a;
        }, { when: function when() {
            return cond.get();
          } });

        assert.strictEqual(val, null);

        cond.set('truthy value');

        assert.strictEqual(val, 'a');
      })();
    }
    {
      (function () {
        var cond = derivable.atom(false);
        var a = derivable.atom('a');
        var val = null;
        a.react(function (a) {
          val = a;
        }, { from: function from() {
            return cond.get();
          } });

        assert.strictEqual(val, null);

        cond.set('truthy value');

        assert.strictEqual(val, 'a');
      })();
    }
    {
      (function () {
        var a = derivable.atom('a');
        var val = null;
        a.react(function (a) {
          val = a;
        }, { until: function until() {
            return a.is('b').get();
          } });

        assert.strictEqual(val, 'a');

        a.set('c');

        assert.strictEqual(val, 'c');

        a.set('b');

        assert.strictEqual(val, 'c');

        a.set('a');

        assert.strictEqual(val, 'c');
      })();
    }
  });

  it('can have `from`, `when`, and `until` specified as functions that use the derivable itself', function () {
    {
      (function () {
        var a = derivable.atom('a');
        var val = null;
        a.react(function (a) {
          val = a;
        }, { when: function when(derivable) {
            return derivable.get() > 'c';
          } });

        assert.strictEqual(val, null);

        a.set('x');

        assert.strictEqual(val, 'x');
      })();
    }
    {
      (function () {
        var a = derivable.atom('a');
        var val = null;
        a.react(function (a) {
          val = a;
        }, { from: function from(derivable) {
            return derivable.get() > 'c';
          } });

        assert.strictEqual(val, null);

        a.set('x');

        assert.strictEqual(val, 'x');
      })();
    }
    {
      (function () {
        var a = derivable.atom('a');
        var val = null;
        a.react(function (a) {
          val = a;
        }, { until: function until(derivable) {
            return derivable.is('b').get();
          } });

        assert.strictEqual(val, 'a');

        a.set('c');

        assert.strictEqual(val, 'c');

        a.set('b');

        assert.strictEqual(val, 'c');

        a.set('a');

        assert.strictEqual(val, 'c');
      })();
    }
  });

  it('doesnt like it when `from`, `when`, and `until` are other things', function () {
    var a = derivable.atom('a');
    assert.throws(function () {
      return a.react(function () {
        return null;
      }, { from: 'a string' });
    });
    assert.throws(function () {
      return a.react(function () {
        return null;
      }, { when: 3 });
    });
    assert.throws(function () {
      return a.react(function () {
        return null;
      }, { until: new Date() });
    });
  });

  it('can have `from`, `when`, and `until` conditions all at once', function () {
    {
      // normal usage
      var from = derivable.atom(false);
      var when = derivable.atom(false);
      var until = derivable.atom(false);

      var a = derivable.atom('a');
      var val = null;
      a.react(function (a) {
        val = a;
      }, { from: from, when: when, until: until });

      assert.strictEqual(val, null);

      from.set(true);
      // when is still false
      assert.strictEqual(val, null);
      when.set(true);
      assert.strictEqual(val, 'a');
      a.set('b');
      assert.strictEqual(val, 'b');
      when.set(false);
      a.set('c');
      assert.strictEqual(val, 'b');
      when.set(true);
      assert.strictEqual(val, 'c');
      until.set(true);
      a.set('d');
      assert.strictEqual(val, 'c');
    }
    {
      // until already true
      var _from = derivable.atom(false);
      var _when = derivable.atom(false);
      var _until = derivable.atom(true);

      var _a = derivable.atom('a');
      var _val = null;
      _a.react(function (a) {
        _val = a;
      }, { from: _from, when: _when, until: _until });

      assert.strictEqual(_val, null);
      _from.set(true);
      // when is still false
      assert.strictEqual(_val, null);
      _when.set(true);
      assert.strictEqual(_val, null);
    }
    {
      // until already true
      var _from2 = derivable.atom(false);
      var _when2 = derivable.atom(false);
      var _until2 = derivable.atom(true);

      var _a2 = derivable.atom('a');
      var _val2 = null;
      _a2.react(function (a) {
        _val2 = a;
      }, { from: _from2, when: _when2, until: _until2 });

      assert.strictEqual(_val2, null);
      _from2.set(true);
      // when is still false
      assert.strictEqual(_val2, null);
      _when2.set(true);
      assert.strictEqual(_val2, null);
    }
    {
      // when already true
      var _from3 = derivable.atom(false);
      var _when3 = derivable.atom(true);
      var _until3 = derivable.atom(false);

      var _a3 = derivable.atom('a');
      var _val3 = null;
      _a3.react(function (a) {
        _val3 = a;
      }, { from: _from3, when: _when3, until: _until3 });

      assert.strictEqual(_val3, null);
      _from3.set(true);
      assert.strictEqual(_val3, 'a');
    }
    {
      // from and when already true
      var _from4 = derivable.atom(true);
      var _when4 = derivable.atom(true);
      var _until4 = derivable.atom(false);

      var _a4 = derivable.atom('a');
      var _val4 = null;
      _a4.react(function (a) {
        _val4 = a;
      }, { from: _from4, when: _when4, until: _until4 });

      assert.strictEqual(_val4, 'a');
    }
    {
      // from and until already true
      var _from5 = derivable.atom(true);
      var _when5 = derivable.atom(false);
      var _until5 = derivable.atom(true);

      var _a5 = derivable.atom('a');
      var _val5 = null;
      _a5.react(function (a) {
        _val5 = a;
      }, { from: _from5, when: _when5, until: _until5 });

      assert.strictEqual(_val5, null);
      _when5.set(true);
      assert.strictEqual(_val5, null);
    }
    {
      // until and when already true
      var _from6 = derivable.atom(false);
      var _when6 = derivable.atom(true);
      var _until6 = derivable.atom(true);

      var _a6 = derivable.atom('a');
      var _val6 = null;
      _a6.react(function (a) {
        _val6 = a;
      }, { from: _from6, when: _when6, until: _until6 });

      assert.strictEqual(_val6, null);
      _from6.set(true);
      assert.strictEqual(_val6, null);
    }
    {
      (function () {
        // when and until become true atomically
        var when = derivable.atom(false);
        var until = derivable.atom(false);

        var a = derivable.atom('a');
        var val = null;
        a.react(function (a) {
          val = a;
        }, { when: when, until: until });

        assert.strictEqual(val, null);
        derivable.atomically(function () {
          when.set(true);
          until.set(true);
        });

        assert.strictEqual(val, null);
      })();
    }
  });

  it('can specify that the first reaction should be skipped', function () {
    var when = derivable.atom(false);
    var a = derivable.atom('a');
    var val = null;
    a.react(function (a) {
      val = a;
    }, { skipFirst: true, when: when });

    assert.strictEqual(val, null);
    when.set(true);
    assert.strictEqual(val, null);
    a.set('b');
    assert.strictEqual(val, 'b');
  });

  it('can specify that a reaction should only happen once', function () {
    {
      // without skipFirst
      var a = derivable.atom('a');
      var val = null;
      a.react(function (a) {
        val = a;
      }, { once: true });

      assert.strictEqual(val, 'a');

      a.set('b');
      assert.strictEqual(val, 'a');
    }
    {
      // with skipFirst
      var _a7 = derivable.atom('a');
      var _val7 = null;
      _a7.react(function (a) {
        _val7 = a;
      }, { skipFirst: true, once: true });

      assert.strictEqual(_val7, null);

      _a7.set('b');
      assert.strictEqual(_val7, 'b');
      _a7.set('c');
      assert.strictEqual(_val7, 'b');
    }
    {
      // with when
      var when = derivable.atom(false);
      var _a8 = derivable.atom('a');
      var _val8 = null;
      _a8.react(function (a) {
        _val8 = a;
      }, { when: when, once: true });

      assert.strictEqual(_val8, null);

      _a8.set('b');

      assert.strictEqual(_val8, null);
      when.set(true);

      assert.strictEqual(_val8, 'b');

      _a8.set('c');
      assert.strictEqual(_val8, 'b');
    }
  });

});

describe("the .react method", function () {
  it("must have a function as the first argument", function () {
    assert.throws(function () {
      return derivable.atom(5).react();
    });
    assert.throws(function () {
      return derivable.atom(5).react(4);
    });
    assert.throws(function () {
      return derivable.atom(5).react('');
    });
    assert.throws(function () {
      return derivable.atom(5).react({});
    });
  });
});

describe("setting the values of atoms in a reaction phase", function () {
  it("is ok as long as no cycles are created", function () {
    var a = derivable.atom("a");

    var b = derivable.atom("b");

    a.react(function (a) {
      return b.set(b.get() + a);
    });

    assert.strictEqual(b.get(), "ba");

    a.set("aa");

    assert.strictEqual(b.get(), "baaa");

    // derivable disallows
    assert.throws(function () {
      return b.react(function (b) {
        return a.set(b);
      });
    });
  });

  it("is allowed if the atom in question is upstream of the reactor as long as equilibrium is reached", function () {
    var n = derivable.atom(3);

    // currently 1
    var nmod2 = n.derive(function (x) {
      return x % 2;
    });

    var double = function double(n) {
      return n * 2;
    };

    nmod2.react(function (_) {
      return n.swap(double);
    }, {skipFirst: true});

    // nmod2 becomes 0, reactor triggers n being set to 4, nmod2 doesn't change and cycle stops
    n.set(2);
    assert.strictEqual(n.get(), 4);
  });
});

describe("tickers", function () {
  it("allow reacting at custom intervals", function () {
    var a = derivable.atom("a");

    var ticker = derivable.ticker();

    var b = "b";

    a.react(function (a) {
      return b = a;
    }, {skipFirst: true});

    assert.strictEqual(b, "b");

    a.set("c");

    assert.strictEqual(b, "b");

    a.set("d");

    assert.strictEqual(b, "b");

    ticker.tick();

    assert.strictEqual(b, "d");

    a.set("e");

    assert.strictEqual(b, "d");

    a.set("f");

    assert.strictEqual(b, "d");

    ticker.tick();

    assert.strictEqual(b, "f");

    ticker.release();
  });

  it("can be used by more than one piece of the stack", function () {
    var a = derivable.atom("a");
    var ticker1 = derivable.ticker();
    var ticker2 = derivable.ticker();
    var ticker3 = derivable.ticker();

    assert(ticker1 !== ticker2);
    assert(ticker1 !== ticker3);
    assert(ticker2 !== ticker3);

    var b = "b";

    a.react(function (a) {
      return b = a;
    }, {skipFirst: true});
    assert.strictEqual(b, "b");
    a.set("c");
    assert.strictEqual(b, "b");
    a.set("d");
    assert.strictEqual(b, "b");
    ticker1.tick();
    assert.strictEqual(b, "d");
    a.set("e");
    assert.strictEqual(b, "d");
    a.set("f");
    assert.strictEqual(b, "d");
    ticker2.tick();
    assert.strictEqual(b, "f");
    a.set("g");
    ticker3.tick();
    assert.strictEqual(b, "g");

    ticker1.release();
    ticker2.release();
    ticker3.release();
  });

  it("are reference counted", function () {
    var a = derivable.atom(null);
    var b = "b";

    a.react(function (a) {
      return b = a;
    }, {skipFirst: true});

    a.set("a");

    assert.strictEqual(b, "a");

    var ticker1 = derivable.ticker();
    var ticker2 = derivable.ticker();
    var ticker3 = derivable.ticker();

    a.set("b");

    assert.strictEqual(b, "a");

    ticker1.release();
    assert.strictEqual(b, "a");
    ticker2.release();
    assert.strictEqual(b, "a");
    ticker3.release();
    assert.strictEqual(b, "b");

    a.set("c");

    assert.strictEqual(b, "c");
  });

  it('can reset the global state to the last tick', function () {
    var a = derivable.atom('a');
    var b = derivable.atom('b');

    var t = derivable.ticker();

    a.set('b');
    b.set('a');

    assert.strictEqual(a.get(), 'b');
    assert.strictEqual(b.get(), 'a');

    t.reset();

    assert.strictEqual(a.get(), 'a');
    assert.strictEqual(b.get(), 'b');

    t.release();
    assert.throws(function () {
      return t.reset();
    });
  });

  it("cannot be used after being released", function () {
    var t1 = derivable.ticker();
    var t2 = derivable.ticker();

    t1.release();

    assert.throws(function () {
      return t1.release();
    });

    t2.release();

    assert.throws(function () {
      return t2.tick();
    });
  });

  it("should not cause parents to be investigated in the wrong order", function () {
    var a = derivable.atom(null);
    var b = a.derive(function (a) {
      return a.toString();
    });
    var c = a.then(b, 'a is null');

    var expecting = 'a is null';

    c.react(function (c) {
      return assert.strictEqual(c, expecting);
    });

    expecting = 'some other string';

    a.set('some other string');

    expecting = 'a is null';
    // this would throw if subject to wrong-order bug
    a.set(null);
  });

  it("can be created in reactors", function () {
    var a = derivable.atom('a');

    derivable.transact(function () {
      a.set('b');
      a.react(function (a) {
        return console.log(a);
      });
    });
  });
});


describe('the `when` optons to the `react` method', function () {
  it('allows one to tie the lifecycle of a reactor to some piece of state anonymously', function () {
    var $Cond = derivable.atom(false);
    var $N = derivable.atom(0);
    var inc = function inc(x) {
      return x + 1;
    };

    var i = 0;
    $N.react(function (n) {
      return i++;
    }, { when: $Cond });

    assert.strictEqual(i, 0);

    $N.swap(inc);

    assert.strictEqual(i, 0);

    $Cond.set(true);

    assert.strictEqual(i, 1);

    $N.swap(inc);

    assert.strictEqual(i, 2);

    $N.swap(inc);
    $N.swap(inc);

    assert.strictEqual(i, 4);

    // it uses truthy/falsiness
    $Cond.set(0);

    $N.swap(inc);
    $N.swap(inc);

    assert.strictEqual(i, 4);
  });

  it('casts the condition to a boolean', function () {
    var $Cond = derivable.atom("blub");
    var $N = derivable.atom(0);
    var inc = function inc(x) {
      return x + 1;
    };

    var i = 0;

    $N.react(function (n) {
      return i++;
    }, { when: $Cond });

    assert.strictEqual(i, 1);

    $N.swap(inc);
    assert.strictEqual(i, 2);
    $N.swap(inc);
    $N.swap(inc);
    $N.swap(inc);
    assert.strictEqual(i, 5);
    $Cond.set("steve");
    // sould cause .force() if not casting to boolean, which would inc i
    assert.strictEqual(i, 5);
  });
});

describe('the .mReact method', function () {
  it('only reacts when the thing in the derivable is not null or undefined', function () {
    var a = derivable.atom(null);

    var _a = "Tree";

    a.mReact(function (a) {
      _a = a;
    });

    assert.strictEqual(_a, "Tree");

    a.set("House");

    assert.strictEqual(_a, "House");

    a.set(void 0);

    assert.strictEqual(_a, "House");
  });

  it('merges any given when condition', function () {
    var a = derivable.atom(null);
    var alive = derivable.atom(true);

    var _a = "Tree";

    a.mReact(function (a) {
      _a = a;
    }, {when: alive});

    assert.strictEqual(_a, "Tree");

    a.set("House");

    assert.strictEqual(_a, "House");

    a.set(void 0);

    assert.strictEqual(_a, "House");

    a.set("Tree");

    assert.strictEqual(_a, "Tree");

    alive.set(false);

    a.set("House");

    assert.strictEqual(_a, "Tree");
  });

  it("shouldn't touch any other conditions", function () {
    var a = derivable.atom(null);
    var alive = derivable.atom(true);
    var from = derivable.atom(false);
    var until = derivable.atom(false);

    var _a = "Tree";

    a.mReact(function (a) {
      _a = a;
    }, {when: alive, from: from, until: until});

    assert.strictEqual(_a, "Tree");

    a.set("House");

    assert.strictEqual(_a, "Tree");

    from.set(true);

    assert.strictEqual(_a, "House");

    a.set(void 0);

    assert.strictEqual(_a, "House");

    alive.set(false);

    a.set("Tree");

    assert.strictEqual(_a, "House");

    alive.set(true);

    assert.strictEqual(_a, "Tree");

    until.set(true);

    a.set("House");

    assert.strictEqual(_a, "Tree");

  });
});
