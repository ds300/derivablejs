'use strict';

var derivable = require('../dist/derivable');
var assert = require('assert');

describe("the humble atom", function () {

  var n;

  beforeEach(function() {
    n = derivable.atom(0);
  });

  it("can be dereferenced via .get to obtain its current state", function () {
    assert.strictEqual(n.get(), 0);
  });

  it("can be .set to change its current state", function () {
    n.set(1);
    assert.strictEqual(n.get(), 1);
  });

  it("can be .swap-ped a la clojure", function () {
    n.set(1);
    var double = function double(x) {
      return x * 2;
    };
    n.swap(double);
    assert.strictEqual(n.get(), 2);
    n.swap(double);
    assert.strictEqual(n.get(), 4);
  });

  it('can take on temporary values inside a transaction', function () {
    var a = derivable.atom("a");
    derivable.transact(function (abort) {
      a.set("b");
      assert.strictEqual(a.get(), "b", "blah and junk");
      derivable.transact(function (abort) {
        a.set("c");
        assert.strictEqual(a.get(), "c");
        abort();
      });
      assert.strictEqual(a.get(), "b");
      abort();
    });
    assert.strictEqual(a.get(), "a");
  });

  it('should be able to go back to its original value with no ill effects', function () {
    var a = derivable.atom("a");
    var reacted = false;
    a.react(function () {
      reacted = true;
    }, {skipFirst: true});

    assert.strictEqual(reacted, false, "no reaction to begin with");

    derivable.transact(function () {
      a.set("b");
      a.set("a");
    });

    assert.strictEqual(reacted, false, "no reaction should take place");
  });

  it('can keep transaction values if they are\'t aborted', function () {
    var a = derivable.atom("a");
    derivable.transact(function () {
      a.set("b");
      derivable.transact(function () {
        a.set("c");
      });
      assert.strictEqual(a.get(), "c");
    });
    assert.strictEqual(a.get(), "c");
  });

  it('can include an equality-checking function', function () {
    var a = derivable.atom(0);
    var b = a.withEquality(function () {
      return false;
    });
    it('creates a brand new atom', function () {
      assert(a !== b);
    });

    var numReactions = 0;
    a.react(function () {
      return numReactions++;
    }, { skipFirst: true });
    b.react(function () {
      return numReactions++;
    }, { skipFirst: true });

    assert.strictEqual(numReactions, 0, "0 a");
    a.set(0);
    assert.strictEqual(numReactions, 0, "0 b");
    a.set(0);
    assert.strictEqual(numReactions, 0, "0 c");

    b.set(0);
    assert.strictEqual(numReactions, 1, "0 d");
    b.set(0);
    assert.strictEqual(numReactions, 2, "0 e");
  });

  it('only likes functions or falsey things for equality functions', function () {
    derivable.atom(4).withEquality('');
    assert.throws(function () {
      derivable.atom(4).withEquality('yo');
    });
    derivable.atom(4).withEquality(0);
    assert.throws(function () {
      derivable.atom(4).withEquality(7);
    });
    derivable.atom(4).withEquality(null);
    derivable.atom(4).withEquality(void 0);
  });
});

describe('the concurrent modification of _reactors bug', function () {
  it('doesnt happen any more', function () {
    var $A = derivable.atom(false);
    var $B = derivable.atom(false);

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

    assert.strictEqual(A_success, false);
    assert.strictEqual(C_success, false);
    // used to be that this would cause the 'from' controller on C to be ignored
    // during the ._maybeReact iteration in .set
    $A.set(true);
    assert.strictEqual(A_success, true);
    assert.strictEqual(C_success, false);
    $B.set(true);

    assert.strictEqual(C_success, true, "expecting c success");
  });
});
