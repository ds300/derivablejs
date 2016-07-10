'use strict';

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _derivable = require('../dist/derivable');

var _derivable2 = _interopRequireDefault(_derivable);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe("the `is*` fns", function () {
  it("just work, don't worry about it", function () {
    var a = (0, _derivable.atom)(0);
    var d = a.derive(function (x) {
      return x * 2;
    });
    var l = a.lens({ get: function get(x) {
        return x * 2;
      }, set: function set(_, x) {
        return x / 2;
      } });

    (0, _assert2.default)(_derivable2.default.isAtom(a), "a is an atom");
    (0, _assert2.default)(!_derivable2.default.isAtom(d), "d is not an atom");
    (0, _assert2.default)(_derivable2.default.isAtom(l), "l is an atom");

    (0, _assert2.default)(!_derivable2.default.isDerivation(a), "a is not a derivation");
    (0, _assert2.default)(_derivable2.default.isDerivation(d), "d is a derivation");
    (0, _assert2.default)(_derivable2.default.isDerivation(l), "l is a derivation");

    (0, _assert2.default)(!_derivable2.default.isLensed(a), "a is not a lens");
    (0, _assert2.default)(_derivable2.default.isLensed(l), "l is a lens");
    (0, _assert2.default)(!_derivable2.default.isLensed(d), "d is not a lens");

    (0, _assert2.default)(_derivable2.default.isDerivable(a), "a is derivable");
    (0, _assert2.default)(_derivable2.default.isDerivable(d), "d is derivable");
    (0, _assert2.default)(_derivable2.default.isDerivable(l), "l is derivable");
  });
});

describe("the `struct` function", function () {
  it("expects a plain object or a plain array", function () {
    _assert.throws(function () {
      _derivable.struct();
    });
    _assert.throws(function () {
      _derivable.struct(53);
    });
    _assert.throws(function () {
      _derivable.struct(new Date());
    });
    _assert.throws(function () {
      _derivable.struct(_derivable.atom(4));
    });
    _derivable.struct({});
    _derivable.struct([]);
    _assert.throws(function () {
      _derivable.struct(_derivable.struct({}));
    });
  });
  it("turns an array of derivables into a derivable", function () {
    var fib1 = (0, _derivable.atom)(0),
        fib2 = (0, _derivable.atom)(1),
        fib = (0, _derivable.derivation)(function () {
      return fib1.get() + fib2.get();
    });

    var grouped = _derivable2.default.struct([fib1, fib2, fib]);
    _assert2.default.deepEqual([0, 1, 1], grouped.get());

    fib1.set(1);
    _assert2.default.deepEqual([1, 1, 2], grouped.get());
  });

  it("turns a map of derivables into a derivable", function () {
    var name = (0, _derivable.atom)("wilbur"),
        telephone = (0, _derivable.atom)("0987654321");

    var grouped = _derivable2.default.struct({ name: name, telephone: telephone });

    _assert2.default.deepEqual({ name: "wilbur", telephone: "0987654321" }, grouped.get());

    name.set("Jemimah");
    telephone.set("n/a");

    _assert2.default.deepEqual({ name: "Jemimah", telephone: "n/a" }, grouped.get());
  });

  it("actually turns any arbitrarily nested structure of" + " maybe-derivables into a derivable", function () {
    var name = (0, _derivable.atom)("wilbur"),
        telephone = (0, _derivable.atom)("0987654321"),
        friend1Name = (0, _derivable.atom)("Sylvester"),
        friend1Telephone = (0, _derivable.atom)("blub");

    var grouped = _derivable2.default.struct({
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

    _assert2.default.deepEqual(expected1, grouped.get());

    friend1Name.set("Brittany");

    var expected2 = {
      name: "wilbur",
      telephone: "0987654321",
      blood_type: "AB Negative",
      age: 75,
      friends: [{ name: "Brittany", telephone: "blub" }, "others"]
    };

    _assert2.default.deepEqual(expected2, grouped.get());
  });

  it("only accepts plain objects or arrays", function () {
    _assert2.default.throws(function () {
      return _derivable2.default.struct(3);
    });
    _assert2.default.throws(function () {
      return _derivable2.default.struct("blah");
    });
    _assert2.default.throws(function () {
      return _derivable2.default.struct(new Error());
    });
    function A() {};
    _assert2.default.throws(function () {
      return _derivable2.default.struct(new A());
    });
    _assert2.default.throws(function () {
      return _derivable2.default.struct(/\d+/);
    });
  });
});

describe("boolean logic", function () {
  it("is well understood", function () {
    var a = (0, _derivable.atom)(true),
        b = (0, _derivable.atom)(true),
        aANDb = _derivable2.default.and(a, b),
        aORb = _derivable2.default.or(a, b),
        NOTa = a.not();

    _assert2.default.strictEqual(aANDb.get(), true, "true & true = true");
    _assert2.default.strictEqual(aORb.get(), true, "true | true = true");
    _assert2.default.strictEqual(NOTa.get(), false, "!true = false");

    b.set(false);

    _assert2.default.strictEqual(aANDb.get(), false, "true & false = false");
    _assert2.default.strictEqual(aORb.get(), true, "true | false = true");

    a.set(false);

    _assert2.default.strictEqual(aANDb.get(), false, "false & false = false");
    _assert2.default.strictEqual(aORb.get(), false, "false | false = false");
    _assert2.default.strictEqual(NOTa.get(), true, "!false = true");
  });

  it("is mirrored for dealing with null/undefined", function () {
    var a = (0, _derivable.atom)(false),
        b = (0, _derivable.atom)(false),
        aANDb = _derivable2.default.mAnd(a, b).mThen(true, false),
        aORb = _derivable2.default.mOr(a, b).mThen(true, false);

    _assert2.default.strictEqual(aANDb.get(), true, "false m& false m= true");
    _assert2.default.strictEqual(aORb.get(), true, "false m| false m= true");

    a.set(null);

    _assert2.default.strictEqual(aANDb.get(), false, "null m& false m= false");
    _assert2.default.strictEqual(aORb.get(), true, "null m| false m= true");

    b.set(null);

    _assert2.default.strictEqual(aANDb.get(), false, "null m& null m= false");
    _assert2.default.strictEqual(aORb.get(), false, "null m| null m= false");
  });
});

describe("control flow", function () {
  it("allows different paths to be taken depending on conditions", function () {
    var number = (0, _derivable.atom)(0);
    var even = number.derive(function (n) {
      return n % 2 === 0;
    });

    var message = even.then("even", "odd");

    _assert2.default.strictEqual(message.get(), "even");

    number.set(1);

    _assert2.default.strictEqual(message.get(), "odd");
  });

  it("doesn't evaluate untaken paths", function () {
    var number = (0, _derivable.atom)(0);
    var even = number.derive(function (n) {
      return n % 2 === 0;
    });

    var dideven = false;
    var didodd = false;

    var chooseAPath = even.then((0, _derivable.derivation)(function () {
      dideven = true;
    }), (0, _derivable.derivation)(function () {
      didodd = true;
    }));

    chooseAPath.get();

    (0, _assert2.default)(dideven && !didodd, "didnt eval odd path");

    dideven = false;

    (0, _assert2.default)(!dideven && !didodd, "didnt eval anything yet1");

    number.set(1);

    (0, _assert2.default)(!dideven && !didodd, "didnt eval anything yet2");

    chooseAPath.get();

    (0, _assert2.default)(!dideven && didodd, "didnt eval even path");
  });

  it("same goes for the switch statement", function () {
    var thing = (0, _derivable.atom)("Tigran");

    var result = thing.switch("Banana", "YUMMY", 532, "FiveThreeTwo", "Tigran", "Hamasayan");

    _assert2.default.strictEqual("Hamasayan", result.get());

    thing.set("Banana");

    _assert2.default.strictEqual("YUMMY", result.get());

    thing.set(532);

    _assert2.default.strictEqual("FiveThreeTwo", result.get());

    thing.set("nonsense");

    (0, _assert2.default)(result.get() === void 0);

    var switcheroo = (0, _derivable.atom)("a");

    var dida = false,
        didb = false,
        didc = false,
        didx = false;

    var conda = (0, _derivable.atom)("a"),
        condb = (0, _derivable.atom)("b"),
        condc = (0, _derivable.atom)("c");

    var chooseAPath = switcheroo.switch(conda, (0, _derivable.derivation)(function () {
      return dida = true;
    }), condb, (0, _derivable.derivation)(function () {
      return didb = true;
    }), condc, (0, _derivable.derivation)(function () {
      return didc = true;
    }),
    //else
    (0, _derivable.derivation)(function () {
      return didx = true;
    }));

    (0, _assert2.default)(!dida && !didb && !didc && !didx, "did nothing yet 1");

    chooseAPath.get();
    (0, _assert2.default)(dida && !didb && !didc && !didx, "did a");

    dida = false;
    switcheroo.set("b");
    (0, _assert2.default)(!dida && !didb && !didc && !didx, "did nothing yet 2");

    chooseAPath.get();
    (0, _assert2.default)(!dida && didb && !didc && !didx, "did b");

    didb = false;
    switcheroo.set("c");
    (0, _assert2.default)(!dida && !didb && !didc && !didx, "did nothing yet 3");

    chooseAPath.get();
    (0, _assert2.default)(!dida && !didb && didc && !didx, "did b");

    didc = false;
    switcheroo.set("blubr");
    (0, _assert2.default)(!dida && !didb && !didc && !didx, "did nothing yet 4");

    chooseAPath.get();
    (0, _assert2.default)(!dida && !didb && !didc && didx, "did else");
  });
});

describe("the lift function", function () {
  it("lifts a function which operates on values to operate on derivables", function () {
    var plus = function plus(a, b) {
      return a + b;
    };
    var dPlus = _derivable2.default.lift(plus);

    var a = (0, _derivable.atom)(5);
    var b = (0, _derivable.atom)(10);
    var c = dPlus(a, b);

    _assert2.default.equal(15, c.get());
  });

  it("can be used in ordinary FP stuff", function () {
    var cells = [0, 1, 2].map(_derivable.atom);

    var add = _derivable2.default.lift(function (a, b) {
      return a + b;
    });

    var sum = cells.reduce(add);

    var expected = 3;
    var equalsExpected = false;
    sum.react(function (x) {
      return equalsExpected = x === expected;
    });
    (0, _assert2.default)(equalsExpected);

    expected = 4;
    equalsExpected = false;
    cells[0].swap(function (x) {
      return x + 1;
    });
    (0, _assert2.default)(equalsExpected);
  });
});

describe("the `transact` function", function () {
  it("executes a function in the context of a transaction", function () {
    var a = (0, _derivable.atom)("a"),
        b = (0, _derivable.atom)("b");

    var timesChanged = 0;

    _derivable2.default.struct({ a: a, b: b }).react(function () {
      return timesChanged++;
    }, {skipFirst: true});

    _assert2.default.strictEqual(timesChanged, 0);

    var setAAndB = function setAAndB(a_val, b_val) {
      a.set(a_val);
      b.set(b_val);
    };

    setAAndB("aye", "bee");

    _assert2.default.strictEqual(timesChanged, 2);
    _assert2.default.strictEqual(a.get(), "aye");
    _assert2.default.strictEqual(b.get(), "bee");

    (0, _derivable.transact)(function () {
      return setAAndB("a", "b");
    });

    _assert2.default.strictEqual(timesChanged, 3);
    _assert2.default.strictEqual(a.get(), "a");
    _assert2.default.strictEqual(b.get(), "b");

    (0, _derivable.transact)(function () {
      return setAAndB(5, 6);
    });

    _assert2.default.strictEqual(timesChanged, 4);
    _assert2.default.strictEqual(a.get(), 5);
    _assert2.default.strictEqual(b.get(), 6);
  });
});

describe("the `transaction` function", function () {
  it("wraps a function such that its body is executed in a txn", function () {
    var a = (0, _derivable.atom)("a"),
        b = (0, _derivable.atom)("b");

    var timesChanged = 0;

    _derivable2.default.struct({ a: a, b: b }).react(function () {
      return timesChanged++;
    }, {skipFirst: true});

    _assert2.default.strictEqual(timesChanged, 0);

    var setAAndB = function setAAndB(a_val, b_val) {
      a.set(a_val);
      b.set(b_val);
      return a_val + b_val;
    };

    _assert2.default.strictEqual(setAAndB("aye", "bee"), "ayebee");

    _assert2.default.strictEqual(timesChanged, 2);
    _assert2.default.strictEqual(a.get(), "aye");
    _assert2.default.strictEqual(b.get(), "bee");

    var tSetAAndB = _derivable2.default.transaction(setAAndB);

    _assert2.default.strictEqual(tSetAAndB("a", "b"), "ab");

    _assert2.default.strictEqual(timesChanged, 3);
    _assert2.default.strictEqual(a.get(), "a");
    _assert2.default.strictEqual(b.get(), "b");

    _assert2.default.strictEqual(tSetAAndB(2, 3), 5);

    _assert2.default.strictEqual(timesChanged, 4);
    _assert2.default.strictEqual(a.get(), 2);
    _assert2.default.strictEqual(b.get(), 3);
  });
});

describe("debug mode", function () {
  it("causes derivations and reactors to store the stacktraces of their" + " instantiation points", function () {
    var d = _derivable2.default.derivation(function () {
      return 0;
    });
    (0, _assert2.default)(!d.stack);
    _derivable2.default.setDebugMode(true);
    var e = _derivable2.default.derivation(function () {
      throw Error();
    });
    (0, _assert2.default)(e.stack);
    _derivable2.default.setDebugMode(false);
  });

  it("causes stack traces to be printed when things derivations and reactors throw errors", function () {
    var d = _derivable2.default.derivation(function () {
      return 0;
    });
    (0, _assert2.default)(!d.stack);
    _derivable2.default.setDebugMode(true);
    var e = _derivable2.default.derivation(function () {
      throw "cheese";
    });
    try {
      var err = console.error;
      var stack = void 0;
      console.error = function (_stack) {
        stack = _stack;
      };
      e.get();
      _assert2.default.strictEqual(stack, e.stack);
      console.error = err;
    } catch (e) {
      _assert2.default.strictEqual(e, 'cheese');
    };
    _derivable2.default.setDebugMode(false);
  });
});

describe('the atomically function', function () {
  it('creates a transaction if not already in a transaction', function () {
    var $A = (0, _derivable.atom)('a');
    var numReactions = 0;
    $A.react(function () {
      return numReactions++;
    }, {skipFirst: true});
    _assert2.default.strictEqual(numReactions, 0);

    _derivable2.default.atomically(function () {
      $A.set('b');
      _assert2.default.strictEqual(numReactions, 0);
    });
    _assert2.default.strictEqual(numReactions, 1);
  });

  it("doesn't create new transactions if already in a transaction", function () {
    var $A = (0, _derivable.atom)('a');

    _derivable2.default.transact(function () {
      try {
        _derivable2.default.atomically(function () {
          $A.set('b');
          _assert2.default.strictEqual($A.get(), 'b');
          throw new Error();
        });
      } catch (ignored) {}
      // no transaction created so change to $A persists
      _assert2.default.strictEqual($A.get(), 'b');
    });
    _assert2.default.strictEqual($A.get(), 'b');
  });
});

describe('the atomic function', function () {
  it('creates a transaction if not already in a transaction', function () {
    var $A = (0, _derivable.atom)('a');
    var numReactions = 0;
    $A.react(function () {
      return numReactions++;
    }, {skipFirst: true});
    _assert2.default.strictEqual(numReactions, 0);

    var res = _derivable2.default.atomic(function () {
      $A.set('b');
      _assert2.default.strictEqual(numReactions, 0);
      return 3;
    })();

    _assert2.default.strictEqual(numReactions, 1);

    _assert2.default.strictEqual(res, 3);
  });

  it("doesn't create new transactions if already in a transaction", function () {
    var $A = (0, _derivable.atom)('a');

    _derivable2.default.transact(function () {
      try {
        _derivable2.default.atomic(function () {
          $A.set('b');
          _assert2.default.strictEqual($A.get(), 'b');
          throw new Error();
        })();
      } catch (ignored) {}
      // no transaction created so change to $A persists
      _assert2.default.strictEqual($A.get(), 'b');
    });
    _assert2.default.strictEqual($A.get(), 'b');
  });
});

describe('the wrapPreviousState function', function () {
  it('wraps a function of one argument, passing in previous arguments', function () {
    var f = _derivable.wrapPreviousState(function (a, b) { return a + b;} , 0);

    _assert.strictEqual(f(1), 1);
    _assert.strictEqual(f(2), 3);
    _assert.strictEqual(f(3), 5);
    _assert.strictEqual(f(4), 7);
    _assert.strictEqual(f(5), 9);
    _assert.strictEqual(f(6), 11);
  });
  it('the init arg is optional', function () {
    var f = _derivable.wrapPreviousState(function (a, b) { return a + (b || 10);});

    _assert.strictEqual(f(1), 11);
    _assert.strictEqual(f(2), 3);
  });
});

describe('the captureDereferences function', function () {
  it('executes the given function, returning an array of captured dereferences', function () {
    var a = _derivable.atom("a");
    var b = _derivable.atom("b");
    var c = a.derive('length');

    var _a = _derivable.captureDereferences(function () {
      a.get();
    });
    _assert.deepEqual(_a, [a]);

    var _ab = _derivable.captureDereferences(function () {
      a.get();
      b.get();
    });
    _assert.deepEqual(_ab, [a, b]);

    var _ba = _derivable.captureDereferences(function () {
      b.get();
      a.get();
    });
    _assert.deepEqual(_ba, [b, a]);

    var _c = _derivable.captureDereferences(function () {
      c.get();
    });
    _assert.deepEqual(_c, [c]);

    var _ca = _derivable.captureDereferences(function () {
      c.get();
      a.get();
    });
    _assert.deepEqual(_ca, [c, a]);

    var _cab = _derivable.captureDereferences(function () {
      c.get();
      a.get();
      b.get();
    });
    _assert.deepEqual(_cab, [c, a, b]);
  });
});
