'use strict';

var immutable = require('immutable');

var derivable = require('../dist/derivable');

var assert = require('assert');

describe("the `is*` fns", function () {
  it("just work, don't worry about it", function () {
    var a = derivable.atom(0);
    var d = a.derive(function (x) {
      return x * 2;
    });
    var p = a.proxy({ get: function get(x) {
        return x * 2;
      }, set: function set(_, x) {
        return x / 2;
      } });

    assert(derivable.isAtom(a), "a is an atom");
    assert(!derivable.isAtom(d), "d is not an atom");
    assert(derivable.isAtom(p), "p is an atom");

    assert(!derivable.isDerivation(a), "a is not a derivation");
    assert(derivable.isDerivation(d), "d is a derivation");
    assert(derivable.isDerivation(p), "p is a derivation");

    assert(!derivable.isProxy(a), "a is not a proxy");
    assert(derivable.isProxy(p), "p is a proxy");
    assert(!derivable.isProxy(d), "d is not a proxy");

    assert(derivable.isDerivable(a), "a is derivable");
    assert(derivable.isDerivable(d), "d is derivable");
    assert(derivable.isDerivable(p), "p is derivable");
  });
});

describe("the `struct` function", function () {
  it("expects a plain object or a plain array", function () {
    assert.throws(function () {
      derivable.struct();
    });
    assert.throws(function () {
      derivable.struct(53);
    });
    assert.throws(function () {
      derivable.struct(new Date());
    });
    assert.throws(function () {
      derivable.struct(derivable.atom(4));
    });
    derivable.struct({});
    derivable.struct([]);
    assert.throws(function () {
      derivable.struct(derivable.struct({}));
    });
  });
  it("turns an array of derivables into a derivable", function () {
    var fib1 = derivable.atom(0),
        fib2 = derivable.atom(1),
        fib = derivable.derive(function () {
      return fib1.get() + fib2.get();
    });

    var grouped = derivable.struct([fib1, fib2, fib]);
    assert.deepEqual([0, 1, 1], grouped.get());

    fib1.set(1);
    assert.deepEqual([1, 1, 2], grouped.get());
  });

  it("turns a map of derivables into a derivable", function () {
    var name = derivable.atom("wilbur"),
        telephone = derivable.atom("0987654321");

    var grouped = derivable.struct({ name: name, telephone: telephone });

    assert.deepEqual({ name: "wilbur", telephone: "0987654321" }, grouped.get());

    name.set("Jemimah");
    telephone.set("n/a");

    assert.deepEqual({ name: "Jemimah", telephone: "n/a" }, grouped.get());
  });

  it("actually turns any arbitrarily nested structure of" + " maybe-derivables into a derivable", function () {
    var name = derivable.atom("wilbur"),
        telephone = derivable.atom("0987654321"),
        friend1Name = derivable.atom("Sylvester"),
        friend1Telephone = derivable.atom("blub");

    var grouped = derivable.struct({
      name: name, telephone: telephone,
      blood_type: "AB Negative",
      age: 75,
      friends: [{ name: friend1Name, telephone: friend1Telephone }, "others"]
    });

    var expected1 = {
      name: "wilbur",
      telephone: "0987654321",
      blood_type: "AB Negative",
      age: 75,
      friends: [{ name: "Sylvester", telephone: "blub" }, "others"]
    };

    assert.deepEqual(expected1, grouped.get());

    friend1Name.set("Brittany");

    var expected2 = {
      name: "wilbur",
      telephone: "0987654321",
      blood_type: "AB Negative",
      age: 75,
      friends: [{ name: "Brittany", telephone: "blub" }, "others"]
    };

    assert.deepEqual(expected2, grouped.get());
  });

  it("only accepts plain objects or arrays", function () {
    assert.throws(function () {
      return derivable.struct(3);
    });
    assert.throws(function () {
      return derivable.struct("blah");
    });
    assert.throws(function () {
      return derivable.struct(new Error());
    });
    function A() {};
    assert.throws(function () {
      return derivable.struct(new A());
    });
    assert.throws(function () {
      return derivable.struct(/\d+/);
    });
  });
});

describe("boolean logic", function () {
  it("is well understood", function () {
    var a = derivable.atom(true),
        b = derivable.atom(true),
        aANDb = derivable.and(a, b),
        aORb = derivable.or(a, b),
        NOTa = a.not();

    assert.strictEqual(aANDb.get(), true, "true & true = true");
    assert.strictEqual(aORb.get(), true, "true | true = true");
    assert.strictEqual(NOTa.get(), false, "!true = false");

    b.set(false);

    assert.strictEqual(aANDb.get(), false, "true & false = false");
    assert.strictEqual(aORb.get(), true, "true | false = true");

    a.set(false);

    assert.strictEqual(aANDb.get(), false, "false & false = false");
    assert.strictEqual(aORb.get(), false, "false | false = false");
    assert.strictEqual(NOTa.get(), true, "!false = true");
  });

  it("is mirrored for dealing with null/undefined", function () {
    var a = derivable.atom(false),
        b = derivable.atom(false),
        aANDb = derivable.mAnd(a, b).mThen(true, false),
        aORb = derivable.mOr(a, b).mThen(true, false);

    assert.strictEqual(aANDb.get(), true, "false m& false m= true");
    assert.strictEqual(aORb.get(), true, "false m| false m= true");

    a.set(null);

    assert.strictEqual(aANDb.get(), false, "null m& false m= false");
    assert.strictEqual(aORb.get(), true, "null m| false m= true");

    b.set(null);

    assert.strictEqual(aANDb.get(), false, "null m& null m= false");
    assert.strictEqual(aORb.get(), false, "null m| null m= false");
  });
});

describe("control flow", function () {
  it("allows different paths to be taken depending on conditions", function () {
    var number = derivable.atom(0);
    var even = number.derive(function (n) {
      return n % 2 === 0;
    });

    var message = even.then("even", "odd");

    assert.strictEqual(message.get(), "even");

    number.set(1);

    assert.strictEqual(message.get(), "odd");
  });

  it("doesn't evaluate untaken paths", function () {
    var number = derivable.atom(0);
    var even = number.derive(function (n) {
      return n % 2 === 0;
    });

    var dideven = false;
    var didodd = false;

    var chooseAPath = even.then(derivable.derive(function () {
      dideven = true;
    }), derivable.derive(function () {
      didodd = true;
    }));

    chooseAPath.get();

    assert(dideven && !didodd, "didnt eval odd path");

    dideven = false;

    assert(!dideven && !didodd, "didnt eval anything yet1");

    number.set(1);

    assert(!dideven && !didodd, "didnt eval anything yet2");

    chooseAPath.get();

    assert(!dideven && didodd, "didnt eval even path");
  });

  it("same goes for the switch statement", function () {
    var thing = derivable.atom("Tigran");

    var result = thing.switch("Banana", "YUMMY", 532, "FiveThreeTwo", "Tigran", "Hamasayan");

    assert.strictEqual("Hamasayan", result.get());

    thing.set("Banana");

    assert.strictEqual("YUMMY", result.get());

    thing.set(532);

    assert.strictEqual("FiveThreeTwo", result.get());

    thing.set("nonsense");

    assert(result.get() === void 0);

    var switcheroo = derivable.atom("a");

    var dida = false,
        didb = false,
        didc = false,
        didx = false;

    var conda = derivable.atom("a"),
        condb = derivable.atom("b"),
        condc = derivable.atom("c");

    var chooseAPath = switcheroo.switch(conda, derivable.derive(function () {
      return dida = true;
    }), condb, derivable.derive(function () {
      return didb = true;
    }), condc, derivable.derive(function () {
      return didc = true;
    }),
    //else
    derivable.derive(function () {
      return didx = true;
    }));

    assert(!dida && !didb && !didc && !didx, "did nothing yet 1");

    chooseAPath.get();
    assert(dida && !didb && !didc && !didx, "did a");

    dida = false;
    switcheroo.set("b");
    assert(!dida && !didb && !didc && !didx, "did nothing yet 2");

    chooseAPath.get();
    assert(!dida && didb && !didc && !didx, "did b");

    didb = false;
    switcheroo.set("c");
    assert(!dida && !didb && !didc && !didx, "did nothing yet 3");

    chooseAPath.get();
    assert(!dida && !didb && didc && !didx, "did b");

    didc = false;
    switcheroo.set("blubr");
    assert(!dida && !didb && !didc && !didx, "did nothing yet 4");

    chooseAPath.get();
    assert(!dida && !didb && !didc && didx, "did else");
  });
});

describe("lifting by using derive", function () {

  var lift = function(f) {
    return derivable.derive.bind(null, f);
  }

  it("lifts a function which operates on values to operate on derivables", function () {
    var plus = function plus(a, b) {
      return a + b;
    };
    var dPlus = lift(plus);

    var a = derivable.atom(5);
    var b = derivable.atom(10);
    var c = dPlus(a, b);

    assert.equal(15, c.get());
  });

  it("can be used in ordinary FP stuff", function () {
    var cells = [0, 1, 2].map(derivable.atom);

    var add = lift(function (a, b) {
      return a + b;
    });

    var sum = cells.reduce(add);

    var expected = 3;
    var equalsExpected = false;
    sum.react(function (x) {
      return equalsExpected = x === expected;
    });
    assert(equalsExpected);

    expected = 4;
    equalsExpected = false;
    cells[0].update(function (x) {
      return x + 1;
    });
    assert(equalsExpected);
  });
});

describe("the `transact` function", function () {
  it("executes a function in the context of a transaction", function () {
    var a = derivable.atom("a"),
        b = derivable.atom("b");

    var timesChanged = 0;

    derivable.struct({ a: a, b: b }).react(function () {
      return timesChanged++;
    }, {skipFirst: true});

    assert.strictEqual(timesChanged, 0);

    var setAAndB = function setAAndB(a_val, b_val) {
      a.set(a_val);
      b.set(b_val);
    };

    setAAndB("aye", "bee");

    assert.strictEqual(timesChanged, 2);
    assert.strictEqual(a.get(), "aye");
    assert.strictEqual(b.get(), "bee");

    derivable.transact(function () {
      return setAAndB("a", "b");
    });

    assert.strictEqual(timesChanged, 3);
    assert.strictEqual(a.get(), "a");
    assert.strictEqual(b.get(), "b");

    derivable.transact(function () {
      return setAAndB(5, 6);
    });

    assert.strictEqual(timesChanged, 4);
    assert.strictEqual(a.get(), 5);
    assert.strictEqual(b.get(), 6);
  });
});

describe("the `transaction` function", function () {
  it("wraps a function such that its body is executed in a txn", function () {
    var a = derivable.atom("a"),
        b = derivable.atom("b");

    var timesChanged = 0;

    derivable.struct({ a: a, b: b }).react(function () {
      return timesChanged++;
    }, {skipFirst: true});

    assert.strictEqual(timesChanged, 0);

    var setAAndB = function setAAndB(a_val, b_val) {
      a.set(a_val);
      b.set(b_val);
      return a_val + b_val;
    };

    assert.strictEqual(setAAndB("aye", "bee"), "ayebee");

    assert.strictEqual(timesChanged, 2);
    assert.strictEqual(a.get(), "aye");
    assert.strictEqual(b.get(), "bee");

    var tSetAAndB = derivable.transaction(setAAndB);

    assert.strictEqual(tSetAAndB("a", "b"), "ab");

    assert.strictEqual(timesChanged, 3);
    assert.strictEqual(a.get(), "a");
    assert.strictEqual(b.get(), "b");

    assert.strictEqual(tSetAAndB(2, 3), 5);

    assert.strictEqual(timesChanged, 4);
    assert.strictEqual(a.get(), 2);
    assert.strictEqual(b.get(), 3);
  });
});

describe("debug mode", function () {
  it("causes derivations and reactors to store the stacktraces of their" + " instantiation points", function () {
    var d = derivable.derive(function () {
      return 0;
    });
    assert(!d.stack);
    derivable.setDebugMode(true);
    var e = derivable.derive(function () {
      throw Error();
    });
    assert(e.stack);
    derivable.setDebugMode(false);
  });

  it("causes stack traces to be printed when things derivations and reactors throw errors", function () {
    var d = derivable.derive(function () {
      return 0;
    });
    assert(!d.stack);
    derivable.setDebugMode(true);
    var e = derivable.derive(function () {
      throw "cheese";
    });
    try {
      var err = console.error;
      var stack = void 0;
      console.error = function (_stack) {
        stack = _stack;
      };
      e.get();
      assert.strictEqual(stack, e.stack);
      console.error = err;
    } catch (e) {
      assert.strictEqual(e, 'cheese');
    };
    derivable.setDebugMode(false);
  });
});

describe('the atomically function', function () {
  it('creates a transaction if not already in a transaction', function () {
    var $A = derivable.atom('a');
    var numReactions = 0;
    $A.react(function () {
      return numReactions++;
    }, {skipFirst: true});
    assert.strictEqual(numReactions, 0);

    derivable.atomically(function () {
      $A.set('b');
      assert.strictEqual(numReactions, 0);
    });
    assert.strictEqual(numReactions, 1);
  });

  it("doesn't create new transactions if already in a transaction", function () {
    var $A = derivable.atom('a');

    derivable.transact(function () {
      try {
        derivable.atomically(function () {
          $A.set('b');
          assert.strictEqual($A.get(), 'b');
          throw new Error();
        });
      } catch (ignored) {}
      // no transaction created so change to $A persists
      assert.strictEqual($A.get(), 'b');
    });
    assert.strictEqual($A.get(), 'b');
  });
});

describe('the atomic function', function () {
  it('creates a transaction if not already in a transaction', function () {
    var $A = derivable.atom('a');
    var numReactions = 0;
    $A.react(function () {
      return numReactions++;
    }, {skipFirst: true});
    assert.strictEqual(numReactions, 0);

    var res = derivable.atomic(function () {
      $A.set('b');
      assert.strictEqual(numReactions, 0);
      return 3;
    })();

    assert.strictEqual(numReactions, 1);

    assert.strictEqual(res, 3);
  });

  it("doesn't create new transactions if already in a transaction", function () {
    var $A = derivable.atom('a');

    derivable.transact(function () {
      try {
        derivable.atomic(function () {
          $A.set('b');
          assert.strictEqual($A.get(), 'b');
          throw new Error();
        })();
      } catch (ignored) {}
      // no transaction created so change to $A persists
      assert.strictEqual($A.get(), 'b');
    });
    assert.strictEqual($A.get(), 'b');
  });
});

describe('the wrapPreviousState function', function () {
  it('wraps a function of one argument, passing in previous arguments', function () {
    var f = derivable.wrapPreviousState(function (a, b) { return a + b;} , 0);

    assert.strictEqual(f(1), 1);
    assert.strictEqual(f(2), 3);
    assert.strictEqual(f(3), 5);
    assert.strictEqual(f(4), 7);
    assert.strictEqual(f(5), 9);
    assert.strictEqual(f(6), 11);
  });
  it('the init arg is optional', function () {
    var f = derivable.wrapPreviousState(function (a, b) { return a + (b || 10);});

    assert.strictEqual(f(1), 11);
    assert.strictEqual(f(2), 3);
  });
});

describe('the captureDereferences function', function () {
  it('executes the given function, returning an array of captured dereferences', function () {
    var a = derivable.atom("a");
    var b = derivable.atom("b");
    var c = a.derive('length');

    var _a = derivable.captureDereferences(function () {
      a.get();
    });
    assert.deepEqual(_a, [a]);

    var _ab = derivable.captureDereferences(function () {
      a.get();
      b.get();
    });
    assert.deepEqual(_ab, [a, b]);

    var _ba = derivable.captureDereferences(function () {
      b.get();
      a.get();
    });
    assert.deepEqual(_ba, [b, a]);

    var _c = derivable.captureDereferences(function () {
      c.get();
    });
    assert.deepEqual(_c, [c]);

    var _ca = derivable.captureDereferences(function () {
      c.get();
      a.get();
    });
    assert.deepEqual(_ca, [c, a]);

    var _cab = derivable.captureDereferences(function () {
      c.get();
      a.get();
      b.get();
    });
    assert.deepEqual(_cab, [c, a, b]);
  });
});
