'use strict';

var immutable = require('immutable');

var derivable = require('../dist/derivable');

var assert = require('assert');

describe("proxies", function () {
  var cursor = function cursor(proxyable) {
    for (var _len = arguments.length, path = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      path[_key - 1] = arguments[_key];
    }

    return proxyable.proxy({
      get: function get(state) {
        return state.getIn(path);
      },
      set: function set(state, val) {
        return state.setIn(path, val);
      }
    });
  };

  it("makes a functional proxy over an atom", function () {
    var root = derivable.atom(immutable.fromJS({ things: ["zero", "one", "three"] }));

    var two = cursor(root, "things", 2);
    assert.equal("three", two.get());

    two.set("two");

    assert(immutable.fromJS({ things: ["zero", "one", "two"] }).equals(root.get()));

    var things = cursor(root, "things");

    assert(immutable.fromJS(["zero", "one", "two"]).equals(things.get()));

    var one = cursor(things, 1);

    assert.equal("one", one.get());

    var reactors = 0;

    one.react(function () {
      return reactors++;
    });

    assert.equal(1, reactors);
    one.set("five");
    assert.equal(2, reactors);

    assert(immutable.fromJS(["zero", "five", "two"]).equals(things.get()));
  });

  it("works on numbers too", function () {
    var num = derivable.atom(3.14159);

    var afterDecimalPoint = num.proxy({
      get: function get(number) {
        return parseInt(number.toString().split(".")[1]) || 0;
      },
      set: function set(number, newVal) {
        var beforeDecimalPoint = number.toString().split(".")[0];
        return parseFloat(beforeDecimalPoint + '.' + newVal);
      }
    });

    assert.strictEqual(14159, afterDecimalPoint.get());

    afterDecimalPoint.set(4567);

    assert.strictEqual(3.4567, num.get());

    afterDecimalPoint.update(function (x) {
      return x * 2;
    });

    assert.strictEqual(9134, afterDecimalPoint.get());

    assert.strictEqual(3.9134, num.get());
  });

  it('can be re-instantiated with custom equality-checking', function () {
    var proxy = {
      get: function get(a) {
        return { a: a % 2 };
      },
      set: function set(a, v) {
        return v.a;
      }
    };
    var a = derivable.atom(5);
    var amod2map = a.proxy(proxy);

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

    amod2map.set({ a: 1 });
    assert.strictEqual(numReactions, 4);

    var amod2map2 = a.proxy(proxy).withEquality(function (_ref, _ref2) {
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

    amod2map2.set({ a: 1 });
    assert.strictEqual(numReactions2, 0);
  });
});

describe('composite proxies', function () {
  it('allow multiple atoms to be proxied over', function () {
    var $FirstName = derivable.atom('John');
    var $LastName = derivable.atom('Steinbeck');
    var $Name = derivable.proxy({
      get: function get() {
        return $FirstName.get() + ' ' + $LastName.get();
      },
      set: function set(val) {
        var _val$split = val.split(' ');

        var first = _val$split[0];
        var last = _val$split[1];

        $FirstName.set(first);
        $LastName.set(last);
      }
    });

    assert.strictEqual($Name.get(), 'John Steinbeck');

    $Name.set('James Joyce');
    assert.strictEqual($Name.get(), 'James Joyce');
    assert.strictEqual($FirstName.get(), 'James');
    assert.strictEqual($LastName.get(), 'Joyce');
  });

  it('runs `set` opeartions atomically', function () {
    var $A = derivable.atom('a');
    var $B = derivable.atom('b');

    var numReactions = 0;
    $A.react(function () {
      return numReactions++;
    }, { skipFirst: true });
    $B.react(function () {
      return numReactions++;
    }, { skipFirst: true });

    derivable.proxy({
      get: function get() {},
      set: function set() {
        $A.set('A');
        assert.strictEqual(numReactions, 0);
        $B.set('B');
        assert.strictEqual(numReactions, 0);
      }
    }).set();
    assert.strictEqual(numReactions, 2);
  });
});
