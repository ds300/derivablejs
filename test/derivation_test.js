'use strict';

var _templateObject = _taggedTemplateLiteral(['', ' ', ''], ['', ' ', '']);

var derivable = require('../dist/derivable');

var assert = require('assert');

var immutable = require('immutable');

var util = require('./util');

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

describe("a derivation", function () {
  var oneGigabyte = 1024 * 1024 * 1024;
  var bytes = derivable.atom(oneGigabyte);
  var kiloBytes = void 0,
      megaBytes = void 0;

  var orderUp = function orderUp(n) {
    var order = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];

    return order > 0 ? orderUp(n / 1024, order - 1) : n;
  };

  it("can be created via the Atom.derive(f) method", function () {
    kiloBytes = bytes.derive(orderUp);
    assert.strictEqual(kiloBytes.get(), 1024 * 1024);
  });

  it("can also be created via the derivation function in the derivable package", function () {
    megaBytes = derivable.derive(function () {
      return orderUp(kiloBytes.get());
    });
    assert.strictEqual(megaBytes.get(), 1024);
  });

  it("can derive from more than one atom", function () {
    var order = util.label(derivable.atom(0), "O");
    var orderName = util.label(order.derive(function (order) {
      return ["bytes", "kilobytes", "megabytes", "gigabytes"][order];
    }), "ON");
    var size = util.label(bytes.derive(orderUp, order), "!size!");
    var sizeString = derivable.derive(_templateObject, size, orderName);

    assert.strictEqual(size.get(), bytes.get(), "size is in bytes when order is 0");
    assert.strictEqual(sizeString.get(), bytes.get() + " bytes");
    order.set(1);
    assert.strictEqual(size.get(), kiloBytes.get(), "size is in kbs when order is 1");
    assert.strictEqual(sizeString.get(), kiloBytes.get() + " kilobytes");
    order.set(2);
    assert.strictEqual(size.get(), megaBytes.get(), "size is in mbs when order is 2");
    assert.strictEqual(sizeString.get(), megaBytes.get() + " megabytes");
    order.set(3);
    assert.strictEqual(size.get(), 1, "size is in gbs when order is 2");
    assert.strictEqual(sizeString.get(), "1 gigabytes");
  });

  it("implements the derivable interface", function () {
    var name = derivable.atom("smithe");
    var size6 = name.derive(function (x) {
      return x.length === 6;
    });
    var startsWithS = name.derive(function (x) {
      return x[0] === "s";
    });
    var endsWithE = name.derive(function (x) {
      return x[x.length - 1] === "e";
    });

    assert.strictEqual(size6.get(), true, "has length 6");
    assert.strictEqual(startsWithS.get(), true, "starts with s");
    assert.strictEqual(endsWithE.get(), true, "ends wth e");

    var isSmithe = name.is(derivable.atom("smithe"));

    assert.strictEqual(isSmithe.get(), true, "is smithe");

    var size6orE = size6.or(endsWithE);
    var size6andE = size6.and(endsWithE);
    var sOrE = startsWithS.or(endsWithE);
    var sAndE = startsWithS.and(endsWithE);

    assert.strictEqual(size6orE.get(), true);
    assert.strictEqual(size6andE.get(), true);
    assert.strictEqual(sOrE.get(), true);
    assert.strictEqual(sAndE.get(), true);

    name.set("smithy");

    assert.strictEqual(size6.get(), true, "has length 6");
    assert.strictEqual(startsWithS.get(), true, "starts with s");
    assert.strictEqual(endsWithE.get(), false, "ends wth y");

    assert.strictEqual(isSmithe.get(), false, "is not smithe");

    assert.strictEqual(size6orE.get(), true);
    assert.strictEqual(size6andE.get(), false);
    assert.strictEqual(sOrE.get(), true);
    assert.strictEqual(sAndE.get(), false);

    assert.strictEqual(size6orE.not().get(), false);
    assert.strictEqual(size6andE.not().get(), true);
    assert.strictEqual(sOrE.not().get(), false);
    assert.strictEqual(sAndE.not().get(), true);

    assert.strictEqual(size6orE.not().not().get(), true);
    assert.strictEqual(size6andE.not().not().get(), false);
    assert.strictEqual(sOrE.not().not().get(), true);
    assert.strictEqual(sAndE.not().not().get(), false);

    assert.strictEqual(name.derive('length').get(), 6);
    assert.strictEqual(name.derive(0).get(), "s");

    var x = startsWithS.then(function () {
      return (0, assert)(true, "smithy starts with s");
    }, function () {
      return (0, assert)(false, "smithy what?");
    }).get()();

    endsWithE.then(function () {
      return (0, assert)(false, "smithy doesn't end in e?!");
    }, function () {
      return (0, assert)(true, "smithy ends in y yo");
    }).get()();

    var firstLetter = name.derive(function (x) {
      return x[0];
    });

    firstLetter.switch("a", function () {
      return (0, assert)(false, "smithy doesn't start with a");
    }, "b", function () {
      return (0, assert)(false, "smithy doesn't start with b");
    }, "s", function () {
      return (0, assert)(true, "smithy starts with s");
    }).get()();

    it("allows a default value", function (done) {
      firstLetter.switch("a", function () {
        return (0, assert)(false, "smithy doesn't start with a");
      }, "b", function () {
        return (0, assert)(false, "smithy doesn't start with b");
      }, "x", "blah", function () {
        return (0, assert)(true, "yay");
      }).get()();
    });

    var nonexistent = derivable.atom(null);
    (0, assert)(nonexistent.mThen(false, true).get(), "null doesn't exist");

    nonexistent.set(false);
    (0, assert)(nonexistent.mThen(true, false).get(), "false exists");

    nonexistent.set(void 0);
    (0, assert)(nonexistent.mThen(false, true).get(), "undefined doesn't exist");

    nonexistent.set("");
    (0, assert)(nonexistent.mThen(true, false).get(), "the empty string exists");

    nonexistent.set(0);
    (0, assert)(nonexistent.mThen(true, false).get(), "zero exists");

    var nestedStuff = derivable.atom(immutable.fromJS({ a: { b: { c: false } } }));
    var get = function get(x, y) {
      return x.get(y);
    };
    var innermost = nestedStuff.mDerive(get, 'a').mDerive(get, 'b').mDerive(get, 'c').mOr('not found');

    assert.strictEqual(innermost.get(), false);

    nestedStuff.set(immutable.fromJS({ a: { b: { c: 'found' } } }));

    assert.strictEqual(innermost.get(), 'found');

    nestedStuff.set(immutable.fromJS({ a: { b: { d: 'd' } } }));

    assert.strictEqual(innermost.get(), 'not found');

    nestedStuff.set(immutable.fromJS({ a: { d: { d: 'd' } } }));

    assert.strictEqual(innermost.get(), 'not found');

    nestedStuff.set(immutable.fromJS({ d: { d: { d: 'd' } } }));

    assert.strictEqual(innermost.get(), 'not found');

    nestedStuff.set(null);

    assert.strictEqual(innermost.get(), 'not found');

    var thingOr = nestedStuff.mOr('not there');
    assert.strictEqual(thingOr.get(), 'not there');

    nestedStuff.set(false);
    assert.strictEqual(thingOr.get(), false);

    var thingAnd = nestedStuff.mAnd('yes there');

    assert.strictEqual(thingAnd.get(), 'yes there');

    nestedStuff.set(null);

    assert.strictEqual(thingAnd.get(), null);
  });

  it('can be re-instantiated with custom equality-checking', function () {
    var a = derivable.atom(5);
    var amod2map = a.derive(function (a) {
      return { a: a % 2 };
    });

    var numReactions = 0;
    amod2map.react(function () {
      return numReactions++;
    }, { skipFirst: true });

    assert.strictEqual(numReactions, 0);
    a.set(7);
    assert.strictEqual(numReactions, 1);
    a.set(9);
    assert.strictEqual(numReactions, 2);
    a.set(11);
    assert.strictEqual(numReactions, 3);

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

    assert.strictEqual(numReactions2, 0);
    a.set(7);
    assert.strictEqual(numReactions2, 0);
    a.set(9);
    assert.strictEqual(numReactions2, 0);
    a.set(11);
    assert.strictEqual(numReactions2, 0);
  });
});

describe("the derive method", function () {
  it("'pluck's when given a string or derivable string", function () {
    var obj = derivable.atom({ nested: 'nested!', other: 'also nested!' });

    var nested = obj.derive('nested');
    assert.strictEqual(nested.get(), 'nested!');

    var prop = derivable.atom('nested');
    var item = obj.derive(prop);
    assert.strictEqual(item.get(), 'nested!');
    prop.set('other');
    assert.strictEqual(item.get(), 'also nested!');
  });
  it("also 'pluck's when given a number or derivable number", function () {
    var arr = derivable.atom([1, 2, 3]);

    var middle = arr.derive(1);
    assert.strictEqual(middle.get(), 2);

    var cursor = derivable.atom(0);
    var item = arr.derive(cursor);

    assert.strictEqual(item.get(), 1);
    cursor.set(1);
    assert.strictEqual(item.get(), 2);
    cursor.set(2);
    assert.strictEqual(item.get(), 3);
  });

  it("uses RegExp objects to do string matching", function () {
    var string = derivable.atom("this is a lovely string");
    var words = string.derive(/\w+/g);

    assert.deepEqual(words.get(), ['this', 'is', 'a', 'lovely', 'string']);

    var firstLetters = string.derive(/\b\w/g);
    assert.deepEqual(firstLetters.get(), ['t', 'i', 'a', 'l', 's']);

    string.set("you are so kind");
    assert.deepEqual(firstLetters.get(), ['y', 'a', 's', 'k']);
  });

  it("throws when given no aguments", function () {
    assert.throws(function () {
      derivable.atom(null).derive();
    });
  });

  it("destructures derivables", function () {
    var s = derivable.atom({ a: "aye", b: "bee", c: "cee" });

    var _s$derive = s.derive(['a', 'b', 'c']);

    var a = _s$derive[0];
    var b = _s$derive[1];
    var c = _s$derive[2];


    assert.strictEqual(a.get(), "aye");
    assert.strictEqual(b.get(), "bee");
    assert.strictEqual(c.get(), "cee");

    // swap a and c over

    var aKey = derivable.atom('c');
    var cKey = derivable.atom('a');

    var _s$derive3 = s.derive([aKey, 'b', cKey]);

    a = _s$derive3[0];
    b = _s$derive3[1];
    c = _s$derive3[2];


    assert.strictEqual(a.get(), "cee");
    assert.strictEqual(b.get(), "bee");
    assert.strictEqual(c.get(), "aye");

    aKey.set('a');
    cKey.set('c');

    assert.strictEqual(a.get(), "aye");
    assert.strictEqual(b.get(), "bee");
    assert.strictEqual(c.get(), "cee");

    var arr = derivable.atom(['naught', 'one', 'two']);

    var _arr$derive = arr.derive([0, 1, derivable.atom(2)]);

    var naught = _arr$derive[0];
    var one = _arr$derive[1];
    var two = _arr$derive[2];


    assert.strictEqual(naught.get(), "naught");
    assert.strictEqual(one.get(), "one");
    assert.strictEqual(two.get(), "two");

    arr.set(['love', 'fifteen', 'thirty']);

    assert.strictEqual(naught.get(), "love");
    assert.strictEqual(one.get(), "fifteen");
    assert.strictEqual(two.get(), "thirty");
  });

  it('can also do destructuring with regexps etc', function () {
    var string = derivable.atom("you are so kind");

    var _string$derive = string.derive([/\b\w/g, 'length', function (s) {
      return s.split(' ').pop();
    }, 0]);

    var firstLetters = _string$derive[0];
    var len = _string$derive[1];
    var lastWord = _string$derive[2];
    var firstChar = _string$derive[3];


    assert.deepEqual(firstLetters.get(), ['y', 'a', 's', 'k']);
    assert.strictEqual(len.get(), 15);
    assert.strictEqual(lastWord.get(), 'kind');
    assert.strictEqual(firstChar.get(), 'y');

    string.set('thank you');

    assert.deepEqual(firstLetters.get(), ['t', 'y']);
    assert.strictEqual(len.get(), 9);
    assert.strictEqual(lastWord.get(), 'you');
    assert.strictEqual(firstChar.get(), 't');
  });

  it('can derive with derivable functions', function () {
    var $Deriver = derivable.atom(function (n) {
      return n * 2;
    });

    var $A = derivable.atom(4);

    var $b = $A.derive($Deriver);

    assert.strictEqual($b.get(), 8);

    $Deriver.set(function (n) {
      return n / 2;
    });

    assert.strictEqual($b.get(), 2);
  });

  it('can derive with derivable regexps', function () {
    var $Deriver = derivable.atom(/[a-z]+/);

    var $A = derivable.atom("29892funtimes232");

    var $b = $A.derive($Deriver);

    assert.strictEqual($b.get()[0], "funtimes");

    $Deriver.set(/\d+/);

    assert.strictEqual($b.get()[0], "29892");
  });

  it('can\'t derive with some kinds of things', function () {
    assert.throws(function () {
      return derivable.atom("blah").derive(new Date());
    });
  });

  it('can\'t derive with some kinds of derivable things', function () {
    var $Deriver = derivable.atom(new Date());

    var $A = derivable.atom("29892funtimes232");

    var $b = $A.derive($Deriver);

    assert.throws(function () {
      return $b.get();
    });
  });

  function add() {
    return Array.prototype.reduce.call(arguments, function (a, b) {
      return a + b;
    }, 0);
  }
  it('can work with three args', function () {
    assert.strictEqual(derivable.atom(1).derive(add, 2, 3).get(), 6);
    assert.strictEqual(derivable.atom(1).derive(add, derivable.atom(2), derivable.atom(3)).get(), 6);
  });

  it('can work with four args', function () {
    assert.strictEqual(derivable.atom(1).derive(add, 2, 3, 4).get(), 10);
    assert.strictEqual(derivable.atom(1).derive(add, derivable.atom(2), derivable.atom(3), 4).get(), 10);
  });

  it('can work with five args', function () {
    assert.strictEqual(derivable.atom(1).derive(add, 2, 3, 4, 5).get(), 15);
    assert.strictEqual(derivable.atom(1).derive(add, derivable.atom(2), derivable.atom(3), 4, 5).get(), 15);
  });
  it('can work with six args', function () {
    assert.strictEqual(derivable.atom(1).derive(add, 2, 3, 4, 5, 6).get(), 21);
    assert.strictEqual(derivable.atom(1).derive(add, derivable.atom(2), derivable.atom(3), 4, 5, derivable.atom(6)).get(), 21);
  });
  it('can work with seven args', function () {
    assert.strictEqual(derivable.atom(1).derive(add, 2, 3, 4, 5, 6, 7).get(), 28);
    assert.strictEqual(derivable.atom(1).derive(add, derivable.atom(2), derivable.atom(3), 4, 5, derivable.atom(6), derivable.atom(7)).get(), 28);
  });
});

describe("mDerive", function () {
  it('is like derive, but propagates nulls', function () {
    var thing = derivable.atom({ prop: 'val' });
    var val = thing.mDerive('prop');

    assert.strictEqual(val.get(), 'val');
    thing.set(null);
    assert.equal(val.get(), null);

    var _thing$mDerive = thing.mDerive(['foo', 'bar']);

    var foo = _thing$mDerive[0];
    var bar = _thing$mDerive[1];


    assert.equal(foo.get(), null);
    assert.equal(bar.get(), null);

    thing.set({ foo: 'FOO!', bar: 'BAR!' });

    assert.strictEqual(foo.get(), 'FOO!');
    assert.strictEqual(bar.get(), 'BAR!');
  });
});

describe("derivations inside a transaction", function () {
  it("can take on temporary values", function () {
    var a = derivable.atom(0);
    var plusOne = a.derive(function (a) {
      return a + 1;
    });

    assert.strictEqual(plusOne.get(), 1);

    derivable.transact(function (abort) {
      a.set(1);
      assert.strictEqual(plusOne.get(), 2);
      abort();
    });

    assert.strictEqual(plusOne.get(), 1);

    var thrown = null;
    try {
      derivable.transact(function () {
        a.set(2);
        assert.strictEqual(plusOne.get(), 3);
        throw "death";
      });
    } catch (e) {
      thrown = e;
    }

    assert.strictEqual(thrown, "death");
    assert.strictEqual(plusOne.get(), 1);
  });
  it('can take on temporary values even in nested transactions', function () {
    var a = derivable.atom(0);
    var plusOne = a.derive(function (a) {
      return a + 1;
    });

    assert.strictEqual(plusOne.get(), 1);

    derivable.transact(function (abort) {
      a.set(1);
      assert.strictEqual(plusOne.get(), 2);
      derivable.transact(function (abort) {
        a.set(2);
        assert.strictEqual(plusOne.get(), 3);
        derivable.transact(function (abort) {
          a.set(3);
          assert.strictEqual(plusOne.get(), 4);
          abort();
        });
        assert.strictEqual(plusOne.get(), 3);
        abort();
      });
      assert.strictEqual(plusOne.get(), 2);
      abort();
    });
    assert.strictEqual(plusOne.get(), 1);
  });

  it('can be dereferenced in nested transactions', function () {
    var a = derivable.atom(0);
    var plusOne = a.derive(function (a) {
      return a + 1;
    });

    assert.strictEqual(plusOne.get(), 1);

    derivable.transact(function () {
      assert.strictEqual(plusOne.get(), 1);
      derivable.transact(function () {
        assert.strictEqual(plusOne.get(), 1);
        derivable.transact(function () {
          assert.strictEqual(plusOne.get(), 1);
        });
      });
    });

    a.set(1);
    derivable.transact(function () {
      derivable.transact(function () {
        derivable.transact(function () {
          assert.strictEqual(plusOne.get(), 2);
        });
      });
    });
  });

  it('can be mutated indirectly in nested transactions', function () {
    var a = derivable.atom(0);
    var plusOne = a.derive(function (a) {
      return a + 1;
    });

    assert.strictEqual(plusOne.get(), 1);

    derivable.transact(function () {
      derivable.transact(function () {
        derivable.transact(function () {
          a.set(1);
        });
      });
    });

    assert.strictEqual(plusOne.get(), 2);

    derivable.transact(function () {
      derivable.transact(function () {
        derivable.transact(function () {
          a.set(2);
        });
      });
      assert.strictEqual(plusOne.get(), 3);
    });

    derivable.transact(function () {
      derivable.transact(function () {
        derivable.transact(function () {
          a.set(3);
        });
        assert.strictEqual(plusOne.get(), 4);
      });
    });
  });
});

describe("nested derivables", function () {
  it("should work in the appropriate fashion", function () {
    var $$A = derivable.atom(null);
    var $a = $$A.mDerive(function ($a) {
      return $a.get();
    });

    (0, assert)($a.get() == null);

    var $B = derivable.atom(5);

    $$A.set($B);

    assert.strictEqual($a.get(), 5);

    var reaction_b = null;
    $a.react(function (b) {
      reaction_b = b;
    }, { skipFirst: true });

    assert.strictEqual(reaction_b, null);

    $B.set(10);
    assert.strictEqual(reaction_b, 10);

    $B.set(4);
    assert.strictEqual(reaction_b, 4);

    var $C = derivable.atom(9);
    $$A.set($C);
    assert.strictEqual(reaction_b, 9);
  });

  it("should let reactors adapt to changes in atoms", function () {
    var $$A = derivable.atom(null);
    var $a = $$A.mDerive(function ($a) {
      return $a.get();
    });

    var $B = derivable.atom('junk');

    var $isJunk = $B.is('junk');

    var isJunk = null;

    $a.react(function (a) {
      isJunk = a;
    });

    (0, assert)(isJunk == null);

    $$A.set($isJunk);

    assert.strictEqual(isJunk, true, "bad one");

    $B.set('not junk');
    assert.strictEqual(isJunk, false, "bad other");
  });

  it("should not interfere with lifecycle control", function () {
    var $$A = derivable.atom(null);
    var $a = $$A.mDerive(function ($a) {
      return $a.get();
    });

    var $B = derivable.atom('junk');

    var $isJunk = $B.is('junk');

    var isJunk = null;

    $a.react(function (a) {
      isJunk = a;
    }, { when: $a });

    (0, assert)(isJunk == null);

    $$A.set($isJunk);

    assert.strictEqual(isJunk, true);

    $B.set('not junk');
    // still junk
    assert.strictEqual(isJunk, true);
  });

  it("should not interfere with boolean casting?!", function () {
    var $$Running = derivable.atom(null);
    var $running = $$Running.mDerive(function ($a) {
      return $a.get();
    });

    var running = null;
    $running.derive(function (x) {
      return !!x;
    }).react(function (r) {
      running = r;
    });

    (0, assert)(!running);

    var $Running = derivable.atom(false);

    $$Running.set($Running);

    (0, assert)(!running);

    $Running.set(true);

    (0, assert)(running);
  });
});
