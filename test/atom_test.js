'use strict';

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _derivable = require('../dist/derivable');

var _derivable2 = _interopRequireDefault(_derivable);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe("the humble atom", function () {
  var n = (0, _derivable.atom)(0);

  it("can be dereferenced via .get to obtain its current state", function () {
    _assert2.default.strictEqual(n.get(), 0);
  });

  it("can be .set to change its current state", function () {
    n.set(1);
    _assert2.default.strictEqual(n.get(), 1);
  });

  it("can be .swap-ped a la clojure", function () {
    var double = function double(x) {
      return x * 2;
    };
    n.swap(double);
    _assert2.default.strictEqual(n.get(), 2);
    n.swap(double);
    _assert2.default.strictEqual(n.get(), 4);
  });

  it('can take on temporary values inside a transaction', function () {
    var a = (0, _derivable.atom)("a");
    (0, _derivable.transact)(function (abort) {
      a.set("b");
      _assert2.default.strictEqual(a.get(), "b", "blah and junk");
      (0, _derivable.transact)(function (abort) {
        a.set("c");
        _assert2.default.strictEqual(a.get(), "c");
        abort();
      });
      _assert2.default.strictEqual(a.get(), "b");
      abort();
    });
    _assert2.default.strictEqual(a.get(), "a");
  });

  it('should be able to go back to its original value with no ill effects', function () {
    var a = _derivable.atom("a");
    var reacted = false;
    a.react(function () {
      reacted = true;
    }, {skipFirst: true});

    _assert.strictEqual(reacted, false, "no reaction to begin with");

    _derivable.transact(function () {
      a.set("b");
      a.set("a");
    });

    _assert.strictEqual(reacted, false, "no reaction should take place");
  });

  it('can keep transaction values if they are\'t aborted', function () {
    var a = (0, _derivable.atom)("a");
    (0, _derivable.transact)(function () {
      a.set("b");
      (0, _derivable.transact)(function () {
        a.set("c");
      });
      _assert2.default.strictEqual(a.get(), "c");
    });
    _assert2.default.strictEqual(a.get(), "c");
  });

  it('can include an equality-checking function', function () {
    var a = (0, _derivable.atom)(0);
    var b = a.withEquality(function () {
      return false;
    });
    it('creates a brand new atom', function () {
      (0, _assert2.default)(a !== b);
    });

    var numReactions = 0;
    a.react(function () {
      return numReactions++;
    }, { skipFirst: true });
    b.react(function () {
      return numReactions++;
    }, { skipFirst: true });

    _assert2.default.strictEqual(numReactions, 0, "0 a");
    a.set(0);
    _assert2.default.strictEqual(numReactions, 0, "0 b");
    a.set(0);
    _assert2.default.strictEqual(numReactions, 0, "0 c");

    b.set(0);
    _assert2.default.strictEqual(numReactions, 1, "0 d");
    b.set(0);
    _assert2.default.strictEqual(numReactions, 2, "0 e");
  });

  it('only likes functions or falsey things for equality functions', function () {
    (0, _derivable.atom)(4).withEquality('');
    _assert2.default.throws(function () {
      (0, _derivable.atom)(4).withEquality('yo');
    });
    (0, _derivable.atom)(4).withEquality(0);
    _assert2.default.throws(function () {
      (0, _derivable.atom)(4).withEquality(7);
    });
    (0, _derivable.atom)(4).withEquality(null);
    (0, _derivable.atom)(4).withEquality(void 0);
  });
});

describe('the concurrent modification of _reactors bug', function () {
  it('doesnt happen any more', function () {
    var $A = (0, _derivable.atom)(false);
    var $B = (0, _derivable.atom)(false);

    var A_success = false;
    var C_success = false;

    $A.react(function (A) {
      A_success = true;
    }, {
      from: $A
    });

    var $C = $A.and($B);

    $C.react(function (ready) {
      C_success = true;
    }, {
      from: $C
    });

    _assert2.default.strictEqual(A_success, false);
    _assert2.default.strictEqual(C_success, false);
    // used to be that this would cause the 'from' controller on C to be ignored
    // during the ._maybeReact iteration in .set
    $A.set(true);
    _assert2.default.strictEqual(A_success, true);
    _assert2.default.strictEqual(C_success, false);
    $B.set(true);

    _assert2.default.strictEqual(C_success, true, "expecting c success");
  });
});
