'use strict';

var _templateObject = _taggedTemplateLiteral(['', ' ', ''], ['', ' ', '']);

var _derivable = require('../dist/derivable');

var _derivable2 = _interopRequireDefault(_derivable);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _immutable = require('immutable');

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

describe("a derivation", function () {
  var oneGigabyte = 1024 * 1024 * 1024;
  var bytes = (0, _derivable.atom)(oneGigabyte);
  var kiloBytes = void 0,
      megaBytes = void 0;

  var orderUp = function orderUp(n) {
    var order = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];

    return order > 0 ? orderUp(n / 1024, order - 1) : n;
  };

  it("can be created via the Atom.derive(f) method", function () {
    kiloBytes = bytes.derive(orderUp);
    _assert2.default.strictEqual(kiloBytes.get(), 1024 * 1024);
  });

  it("can also be created via the derivation function in the derivable package", function () {
    megaBytes = (0, _derivable.derivation)(function () {
      return orderUp(kiloBytes.get());
    });
    _assert2.default.strictEqual(megaBytes.get(), 1024);
  });

  it("can derive from more than one atom", function () {
    var order = (0, _util.label)((0, _derivable.atom)(0), "O");
    var orderName = (0, _util.label)(order.derive(function (order) {
      return ["bytes", "kilobytes", "megabytes", "gigabytes"][order];
    }), "ON");
    var size = (0, _util.label)(bytes.derive(orderUp, order), "!size!");
    var sizeString = (0, _derivable.derive)(_templateObject, size, orderName);

    _assert2.default.strictEqual(size.get(), bytes.get(), "size is in bytes when order is 0");
    _assert2.default.strictEqual(sizeString.get(), bytes.get() + " bytes");
    order.set(1);
    _assert2.default.strictEqual(size.get(), kiloBytes.get(), "size is in kbs when order is 1");
    _assert2.default.strictEqual(sizeString.get(), kiloBytes.get() + " kilobytes");
    order.set(2);
    _assert2.default.strictEqual(size.get(), megaBytes.get(), "size is in mbs when order is 2");
    _assert2.default.strictEqual(sizeString.get(), megaBytes.get() + " megabytes");
    order.set(3);
    _assert2.default.strictEqual(size.get(), 1, "size is in gbs when order is 2");
    _assert2.default.strictEqual(sizeString.get(), "1 gigabytes");
  });

  it("implements the derivable interface", function () {
    var name = (0, _derivable.atom)("smithe");
    var size6 = name.derive(function (x) {
      return x.length === 6;
    });
    var startsWithS = name.derive(function (x) {
      return x[0] === "s";
    });
    var endsWithE = name.derive(function (x) {
      return x[x.length - 1] === "e";
    });

    _assert2.default.strictEqual(size6.get(), true, "has length 6");
    _assert2.default.strictEqual(startsWithS.get(), true, "starts with s");
    _assert2.default.strictEqual(endsWithE.get(), true, "ends wth e");

    var isSmithe = name.is((0, _derivable.atom)("smithe"));

    _assert2.default.strictEqual(isSmithe.get(), true, "is smithe");

    var size6orE = size6.or(endsWithE);
    var size6andE = size6.and(endsWithE);
    var sOrE = startsWithS.or(endsWithE);
    var sAndE = startsWithS.and(endsWithE);

    _assert2.default.strictEqual(size6orE.get(), true);
    _assert2.default.strictEqual(size6andE.get(), true);
    _assert2.default.strictEqual(sOrE.get(), true);
    _assert2.default.strictEqual(sAndE.get(), true);

    name.set("smithy");

    _assert2.default.strictEqual(size6.get(), true, "has length 6");
    _assert2.default.strictEqual(startsWithS.get(), true, "starts with s");
    _assert2.default.strictEqual(endsWithE.get(), false, "ends wth y");

    _assert2.default.strictEqual(isSmithe.get(), false, "is not smithe");

    _assert2.default.strictEqual(size6orE.get(), true);
    _assert2.default.strictEqual(size6andE.get(), false);
    _assert2.default.strictEqual(sOrE.get(), true);
    _assert2.default.strictEqual(sAndE.get(), false);

    _assert2.default.strictEqual(size6orE.not().get(), false);
    _assert2.default.strictEqual(size6andE.not().get(), true);
    _assert2.default.strictEqual(sOrE.not().get(), false);
    _assert2.default.strictEqual(sAndE.not().get(), true);

    _assert2.default.strictEqual(size6orE.not().not().get(), true);
    _assert2.default.strictEqual(size6andE.not().not().get(), false);
    _assert2.default.strictEqual(sOrE.not().not().get(), true);
    _assert2.default.strictEqual(sAndE.not().not().get(), false);

    _assert2.default.strictEqual(name.derive('length').get(), 6);
    _assert2.default.strictEqual(name.derive(0).get(), "s");

    var x = startsWithS.then(function () {
      return (0, _assert2.default)(true, "smithy starts with s");
    }, function () {
      return (0, _assert2.default)(false, "smithy what?");
    }).get()();

    endsWithE.then(function () {
      return (0, _assert2.default)(false, "smithy doesn't end in e?!");
    }, function () {
      return (0, _assert2.default)(true, "smithy ends in y yo");
    }).get()();

    var firstLetter = name.derive(function (x) {
      return x[0];
    });

    firstLetter.switch("a", function () {
      return (0, _assert2.default)(false, "smithy doesn't start with a");
    }, "b", function () {
      return (0, _assert2.default)(false, "smithy doesn't start with b");
    }, "s", function () {
      return (0, _assert2.default)(true, "smithy starts with s");
    }).get()();

    it("allows a default value", function (done) {
      firstLetter.switch("a", function () {
        return (0, _assert2.default)(false, "smithy doesn't start with a");
      }, "b", function () {
        return (0, _assert2.default)(false, "smithy doesn't start with b");
      }, "x", "blah", function () {
        return (0, _assert2.default)(true, "yay");
      }).get()();
    });

    var nonexistent = (0, _derivable.atom)(null);
    (0, _assert2.default)(nonexistent.mThen(false, true).get(), "null doesn't exist");

    nonexistent.set(false);
    (0, _assert2.default)(nonexistent.mThen(true, false).get(), "false exists");

    nonexistent.set(void 0);
    (0, _assert2.default)(nonexistent.mThen(false, true).get(), "undefined doesn't exist");

    nonexistent.set("");
    (0, _assert2.default)(nonexistent.mThen(true, false).get(), "the empty string exists");

    nonexistent.set(0);
    (0, _assert2.default)(nonexistent.mThen(true, false).get(), "zero exists");

    var nestedStuff = (0, _derivable.atom)((0, _immutable.fromJS)({ a: { b: { c: false } } }));
    var get = function get(x, y) {
      return x.get(y);
    };
    var innermost = nestedStuff.mDerive(get, 'a').mDerive(get, 'b').mDerive(get, 'c').mOr('not found');

    _assert2.default.strictEqual(innermost.get(), false);

    nestedStuff.set((0, _immutable.fromJS)({ a: { b: { c: 'found' } } }));

    _assert2.default.strictEqual(innermost.get(), 'found');

    nestedStuff.set((0, _immutable.fromJS)({ a: { b: { d: 'd' } } }));

    _assert2.default.strictEqual(innermost.get(), 'not found');

    nestedStuff.set((0, _immutable.fromJS)({ a: { d: { d: 'd' } } }));

    _assert2.default.strictEqual(innermost.get(), 'not found');

    nestedStuff.set((0, _immutable.fromJS)({ d: { d: { d: 'd' } } }));

    _assert2.default.strictEqual(innermost.get(), 'not found');

    nestedStuff.set(null);

    _assert2.default.strictEqual(innermost.get(), 'not found');

    var thingOr = nestedStuff.mOr('not there');
    _assert2.default.strictEqual(thingOr.get(), 'not there');

    nestedStuff.set(false);
    _assert2.default.strictEqual(thingOr.get(), false);

    var thingAnd = nestedStuff.mAnd('yes there');

    _assert2.default.strictEqual(thingAnd.get(), 'yes there');

    nestedStuff.set(null);

    _assert2.default.strictEqual(thingAnd.get(), null);
  });

  it('can be re-instantiated with custom equality-checking', function () {
    var a = (0, _derivable.atom)(5);
    var amod2map = a.derive(function (a) {
      return { a: a % 2 };
    });

    var numReactions = 0;
    amod2map.react(function () {
      return numReactions++;
    }, { skipFirst: true });

    _assert2.default.strictEqual(numReactions, 0);
    a.set(7);
    _assert2.default.strictEqual(numReactions, 1);
    a.set(9);
    _assert2.default.strictEqual(numReactions, 2);
    a.set(11);
    _assert2.default.strictEqual(numReactions, 3);

    var amod2map2 = a.derive(function (a) {
      return { a: a % 2 };
    }).withEquality(function (_ref, _ref2) {
      var a = _ref.a;
      var b = _ref2.a;
      return a === b;
    });

    var numReactions2 = 0;
    amod2map2.react(function () {
      return numReactions2++;
    }, { skipFirst: true });

    _assert2.default.strictEqual(numReactions2, 0);
    a.set(7);
    _assert2.default.strictEqual(numReactions2, 0);
    a.set(9);
    _assert2.default.strictEqual(numReactions2, 0);
    a.set(11);
    _assert2.default.strictEqual(numReactions2, 0);
  });
});

describe("the derive method", function () {
  it("'pluck's when given a string or derivable string", function () {
    var obj = (0, _derivable.atom)({ nested: 'nested!', other: 'also nested!' });

    var nested = obj.derive('nested');
    _assert2.default.strictEqual(nested.get(), 'nested!');

    var prop = (0, _derivable.atom)('nested');
    var item = obj.derive(prop);
    _assert2.default.strictEqual(item.get(), 'nested!');
    prop.set('other');
    _assert2.default.strictEqual(item.get(), 'also nested!');
  });
  it("also 'pluck's when given a number or derivable number", function () {
    var arr = (0, _derivable.atom)([1, 2, 3]);

    var middle = arr.derive(1);
    _assert2.default.strictEqual(middle.get(), 2);

    var cursor = (0, _derivable.atom)(0);
    var item = arr.derive(cursor);

    _assert2.default.strictEqual(item.get(), 1);
    cursor.set(1);
    _assert2.default.strictEqual(item.get(), 2);
    cursor.set(2);
    _assert2.default.strictEqual(item.get(), 3);
  });

  it("uses RegExp objects to do string matching", function () {
    var string = (0, _derivable.atom)("this is a lovely string");
    var words = string.derive(/\w+/g);

    _assert2.default.deepEqual(words.get(), ['this', 'is', 'a', 'lovely', 'string']);

    var firstLetters = string.derive(/\b\w/g);
    _assert2.default.deepEqual(firstLetters.get(), ['t', 'i', 'a', 'l', 's']);

    string.set("you are so kind");
    _assert2.default.deepEqual(firstLetters.get(), ['y', 'a', 's', 'k']);
  });

  it("throws when given no aguments", function () {
    _assert2.default.throws(function () {
      (0, _derivable.atom)(null).derive();
    });
  });

  it("destructures derivables", function () {
    var s = (0, _derivable.atom)({ a: "aye", b: "bee", c: "cee" });

    var _s$derive = s.derive(['a', 'b', 'c']);

    var a = _s$derive[0];
    var b = _s$derive[1];
    var c = _s$derive[2];


    _assert2.default.strictEqual(a.get(), "aye");
    _assert2.default.strictEqual(b.get(), "bee");
    _assert2.default.strictEqual(c.get(), "cee");

    // swap a and c over

    var aKey = (0, _derivable.atom)('c');
    var cKey = (0, _derivable.atom)('a');

    var _s$derive3 = s.derive([aKey, 'b', cKey]);

    a = _s$derive3[0];
    b = _s$derive3[1];
    c = _s$derive3[2];


    _assert2.default.strictEqual(a.get(), "cee");
    _assert2.default.strictEqual(b.get(), "bee");
    _assert2.default.strictEqual(c.get(), "aye");

    aKey.set('a');
    cKey.set('c');

    _assert2.default.strictEqual(a.get(), "aye");
    _assert2.default.strictEqual(b.get(), "bee");
    _assert2.default.strictEqual(c.get(), "cee");

    var arr = (0, _derivable.atom)(['naught', 'one', 'two']);

    var _arr$derive = arr.derive([0, 1, (0, _derivable.atom)(2)]);

    var naught = _arr$derive[0];
    var one = _arr$derive[1];
    var two = _arr$derive[2];


    _assert2.default.strictEqual(naught.get(), "naught");
    _assert2.default.strictEqual(one.get(), "one");
    _assert2.default.strictEqual(two.get(), "two");

    arr.set(['love', 'fifteen', 'thirty']);

    _assert2.default.strictEqual(naught.get(), "love");
    _assert2.default.strictEqual(one.get(), "fifteen");
    _assert2.default.strictEqual(two.get(), "thirty");
  });

  it('can also do destructuring with regexps etc', function () {
    var string = (0, _derivable.atom)("you are so kind");

    var _string$derive = string.derive([/\b\w/g, 'length', function (s) {
      return s.split(' ').pop();
    }, 0]);

    var firstLetters = _string$derive[0];
    var len = _string$derive[1];
    var lastWord = _string$derive[2];
    var firstChar = _string$derive[3];


    _assert2.default.deepEqual(firstLetters.get(), ['y', 'a', 's', 'k']);
    _assert2.default.strictEqual(len.get(), 15);
    _assert2.default.strictEqual(lastWord.get(), 'kind');
    _assert2.default.strictEqual(firstChar.get(), 'y');

    string.set('thank you');

    _assert2.default.deepEqual(firstLetters.get(), ['t', 'y']);
    _assert2.default.strictEqual(len.get(), 9);
    _assert2.default.strictEqual(lastWord.get(), 'you');
    _assert2.default.strictEqual(firstChar.get(), 't');
  });

  it('can derive with derivable functions', function () {
    var $Deriver = (0, _derivable.atom)(function (n) {
      return n * 2;
    });

    var $A = (0, _derivable.atom)(4);

    var $b = $A.derive($Deriver);

    _assert2.default.strictEqual($b.get(), 8);

    $Deriver.set(function (n) {
      return n / 2;
    });

    _assert2.default.strictEqual($b.get(), 2);
  });

  it('can derive with derivable regexps', function () {
    var $Deriver = (0, _derivable.atom)(/[a-z]+/);

    var $A = (0, _derivable.atom)("29892funtimes232");

    var $b = $A.derive($Deriver);

    _assert2.default.strictEqual($b.get()[0], "funtimes");

    $Deriver.set(/\d+/);

    _assert2.default.strictEqual($b.get()[0], "29892");
  });

  it('can\'t derive with some kinds of things', function () {
    _assert2.default.throws(function () {
      return (0, _derivable.atom)("blah").derive(new Date());
    });
  });

  it('can\'t derive with some kinds of derivable things', function () {
    var $Deriver = (0, _derivable.atom)(new Date());

    var $A = (0, _derivable.atom)("29892funtimes232");

    var $b = $A.derive($Deriver);

    _assert2.default.throws(function () {
      return $b.get();
    });
  });

  function add() {
    return Array.prototype.reduce.call(arguments, function (a, b) {
      return a + b;
    }, 0);
  }
  it('can work with three args', function () {
    _assert2.default.strictEqual((0, _derivable.atom)(1).derive(add, 2, 3).get(), 6);
    _assert2.default.strictEqual((0, _derivable.atom)(1).derive(add, (0, _derivable.atom)(2), (0, _derivable.atom)(3)).get(), 6);
  });

  it('can work with four args', function () {
    _assert2.default.strictEqual((0, _derivable.atom)(1).derive(add, 2, 3, 4).get(), 10);
    _assert2.default.strictEqual((0, _derivable.atom)(1).derive(add, (0, _derivable.atom)(2), (0, _derivable.atom)(3), 4).get(), 10);
  });

  it('can work with five args', function () {
    _assert2.default.strictEqual((0, _derivable.atom)(1).derive(add, 2, 3, 4, 5).get(), 15);
    _assert2.default.strictEqual((0, _derivable.atom)(1).derive(add, (0, _derivable.atom)(2), (0, _derivable.atom)(3), 4, 5).get(), 15);
  });
  it('can work with six args', function () {
    _assert2.default.strictEqual((0, _derivable.atom)(1).derive(add, 2, 3, 4, 5, 6).get(), 21);
    _assert2.default.strictEqual((0, _derivable.atom)(1).derive(add, (0, _derivable.atom)(2), (0, _derivable.atom)(3), 4, 5, (0, _derivable.atom)(6)).get(), 21);
  });
  it('can work with seven args', function () {
    _assert2.default.strictEqual((0, _derivable.atom)(1).derive(add, 2, 3, 4, 5, 6, 7).get(), 28);
    _assert2.default.strictEqual((0, _derivable.atom)(1).derive(add, (0, _derivable.atom)(2), (0, _derivable.atom)(3), 4, 5, (0, _derivable.atom)(6), (0, _derivable.atom)(7)).get(), 28);
  });
});

describe("mDerive", function () {
  it('is like derive, but propagates nulls', function () {
    var thing = (0, _derivable.atom)({ prop: 'val' });
    var val = thing.mDerive('prop');

    _assert2.default.strictEqual(val.get(), 'val');
    thing.set(null);
    _assert2.default.equal(val.get(), null);

    var _thing$mDerive = thing.mDerive(['foo', 'bar']);

    var foo = _thing$mDerive[0];
    var bar = _thing$mDerive[1];


    _assert2.default.equal(foo.get(), null);
    _assert2.default.equal(bar.get(), null);

    thing.set({ foo: 'FOO!', bar: 'BAR!' });

    _assert2.default.strictEqual(foo.get(), 'FOO!');
    _assert2.default.strictEqual(bar.get(), 'BAR!');
  });
});

describe("derivations inside a transaction", function () {
  it("can take on temporary values", function () {
    var a = (0, _derivable.atom)(0);
    var plusOne = a.derive(function (a) {
      return a + 1;
    });

    _assert2.default.strictEqual(plusOne.get(), 1);

    (0, _derivable.transact)(function (abort) {
      a.set(1);
      _assert2.default.strictEqual(plusOne.get(), 2);
      abort();
    });

    _assert2.default.strictEqual(plusOne.get(), 1);

    var thrown = null;
    try {
      (0, _derivable.transact)(function () {
        a.set(2);
        _assert2.default.strictEqual(plusOne.get(), 3);
        throw "death";
      });
    } catch (e) {
      thrown = e;
    }

    _assert2.default.strictEqual(thrown, "death");
    _assert2.default.strictEqual(plusOne.get(), 1);
  });
  it('can take on temporary values even in nested transactions', function () {
    var a = (0, _derivable.atom)(0);
    var plusOne = a.derive(function (a) {
      return a + 1;
    });

    _assert2.default.strictEqual(plusOne.get(), 1);

    (0, _derivable.transact)(function (abort) {
      a.set(1);
      _assert2.default.strictEqual(plusOne.get(), 2);
      (0, _derivable.transact)(function (abort) {
        a.set(2);
        _assert2.default.strictEqual(plusOne.get(), 3);
        (0, _derivable.transact)(function (abort) {
          a.set(3);
          _assert2.default.strictEqual(plusOne.get(), 4);
          abort();
        });
        _assert2.default.strictEqual(plusOne.get(), 3);
        abort();
      });
      _assert2.default.strictEqual(plusOne.get(), 2);
      abort();
    });
    _assert2.default.strictEqual(plusOne.get(), 1);
  });

  it('can be dereferenced in nested transactions', function () {
    var a = (0, _derivable.atom)(0);
    var plusOne = a.derive(function (a) {
      return a + 1;
    });

    _assert2.default.strictEqual(plusOne.get(), 1);

    (0, _derivable.transact)(function () {
      _assert2.default.strictEqual(plusOne.get(), 1);
      (0, _derivable.transact)(function () {
        _assert2.default.strictEqual(plusOne.get(), 1);
        (0, _derivable.transact)(function () {
          _assert2.default.strictEqual(plusOne.get(), 1);
        });
      });
    });

    a.set(1);
    (0, _derivable.transact)(function () {
      (0, _derivable.transact)(function () {
        (0, _derivable.transact)(function () {
          _assert2.default.strictEqual(plusOne.get(), 2);
        });
      });
    });
  });

  it('can be mutated indirectly in nested transactions', function () {
    var a = (0, _derivable.atom)(0);
    var plusOne = a.derive(function (a) {
      return a + 1;
    });

    _assert2.default.strictEqual(plusOne.get(), 1);

    (0, _derivable.transact)(function () {
      (0, _derivable.transact)(function () {
        (0, _derivable.transact)(function () {
          a.set(1);
        });
      });
    });

    _assert2.default.strictEqual(plusOne.get(), 2);

    (0, _derivable.transact)(function () {
      (0, _derivable.transact)(function () {
        (0, _derivable.transact)(function () {
          a.set(2);
        });
      });
      _assert2.default.strictEqual(plusOne.get(), 3);
    });

    (0, _derivable.transact)(function () {
      (0, _derivable.transact)(function () {
        (0, _derivable.transact)(function () {
          a.set(3);
        });
        _assert2.default.strictEqual(plusOne.get(), 4);
      });
    });
  });
});

describe("nested derivables", function () {
  it("should work in the appropriate fashion", function () {
    var $$A = (0, _derivable.atom)(null);
    var $a = $$A.mDerive(function ($a) {
      return $a.get();
    });

    (0, _assert2.default)($a.get() == null);

    var $B = (0, _derivable.atom)(5);

    $$A.set($B);

    _assert2.default.strictEqual($a.get(), 5);

    var reaction_b = null;
    $a.react(function (b) {
      reaction_b = b;
    }, { skipFirst: true });

    _assert2.default.strictEqual(reaction_b, null);

    $B.set(10);
    _assert2.default.strictEqual(reaction_b, 10);

    $B.set(4);
    _assert2.default.strictEqual(reaction_b, 4);

    var $C = (0, _derivable.atom)(9);
    $$A.set($C);
    _assert2.default.strictEqual(reaction_b, 9);
  });

  it("should let reactors adapt to changes in atoms", function () {
    var $$A = (0, _derivable.atom)(null);
    var $a = $$A.mDerive(function ($a) {
      return $a.get();
    });

    var $B = (0, _derivable.atom)('junk');

    var $isJunk = $B.is('junk');

    var isJunk = null;

    $a.react(function (a) {
      isJunk = a;
    });

    (0, _assert2.default)(isJunk == null);

    $$A.set($isJunk);

    _assert2.default.strictEqual(isJunk, true, "bad one");

    $B.set('not junk');
    _assert2.default.strictEqual(isJunk, false, "bad other");
  });

  it("should not interfere with lifecycle control", function () {
    var $$A = (0, _derivable.atom)(null);
    var $a = $$A.mDerive(function ($a) {
      return $a.get();
    });

    var $B = (0, _derivable.atom)('junk');

    var $isJunk = $B.is('junk');

    var isJunk = null;

    $a.react(function (a) {
      isJunk = a;
    }, { when: $a });

    (0, _assert2.default)(isJunk == null);

    $$A.set($isJunk);

    _assert2.default.strictEqual(isJunk, true);

    $B.set('not junk');
    // still junk
    _assert2.default.strictEqual(isJunk, true);
  });

  it("should not interfere with boolean casting?!", function () {
    var $$Running = (0, _derivable.atom)(null);
    var $running = $$Running.mDerive(function ($a) {
      return $a.get();
    });

    var running = null;
    $running.derive(function (x) {
      return !!x;
    }).react(function (r) {
      running = r;
    });

    (0, _assert2.default)(!running);

    var $Running = (0, _derivable.atom)(false);

    $$Running.set($Running);

    (0, _assert2.default)(!running);

    $Running.set(true);

    (0, _assert2.default)(running);
  });
});
