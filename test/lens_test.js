'use strict';

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _derivable = require('../dist/derivable');

var _derivable2 = _interopRequireDefault(_derivable);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe("lenses", function () {
  var cursor = function cursor(lensable) {
    for (var _len = arguments.length, path = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      path[_key - 1] = arguments[_key];
    }

    return lensable.lens({
      get: function get(state) {
        return state.getIn(path);
      },
      set: function set(state, val) {
        return state.setIn(path, val);
      }
    });
  };

  it("makes a functional lens over an atom", function () {
    var root = (0, _derivable.atom)(_immutable2.default.fromJS({ things: ["zero", "one", "three"] }));

    var two = cursor(root, "things", 2);
    _assert2.default.equal("three", two.get());

    two.set("two");

    (0, _assert2.default)(_immutable2.default.fromJS({ things: ["zero", "one", "two"] }).equals(root.get()));

    var things = cursor(root, "things");

    (0, _assert2.default)(_immutable2.default.fromJS(["zero", "one", "two"]).equals(things.get()));

    var one = cursor(things, 1);

    _assert2.default.equal("one", one.get());

    var reactors = 0;

    one.react(function () {
      return reactors++;
    });

    _assert2.default.equal(1, reactors);
    one.set("five");
    _assert2.default.equal(2, reactors);

    (0, _assert2.default)(_immutable2.default.fromJS(["zero", "five", "two"]).equals(things.get()));
  });

  it("works on numbers too", function () {
    var num = (0, _derivable.atom)(3.14159);

    var afterDecimalPoint = num.lens({
      get: function get(number) {
        return parseInt(number.toString().split(".")[1]) || 0;
      },
      set: function set(number, newVal) {
        var beforeDecimalPoint = number.toString().split(".")[0];
        return parseFloat(beforeDecimalPoint + '.' + newVal);
      }
    });

    _assert2.default.strictEqual(14159, afterDecimalPoint.get());

    afterDecimalPoint.set(4567);

    _assert2.default.strictEqual(3.4567, num.get());

    afterDecimalPoint.swap(function (x) {
      return x * 2;
    });

    _assert2.default.strictEqual(9134, afterDecimalPoint.get());

    _assert2.default.strictEqual(3.9134, num.get());
  });

  it('can be re-instantiated with custom equality-checking', function () {
    var lens = {
      get: function get(a) {
        return { a: a % 2 };
      },
      set: function set(a, v) {
        return v.a;
      }
    };
    var a = (0, _derivable.atom)(5);
    var amod2map = a.lens(lens);

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

    amod2map.set({ a: 1 });
    _assert2.default.strictEqual(numReactions, 4);

    var amod2map2 = a.lens(lens).withEquality(function (_ref, _ref2) {
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

    amod2map2.set({ a: 1 });
    _assert2.default.strictEqual(numReactions2, 0);
  });
});

describe('composite lenses', function () {
  it('allow multiple atoms to be lensed over', function () {
    var $FirstName = (0, _derivable.atom)('John');
    var $LastName = (0, _derivable.atom)('Steinbeck');
    var $Name = _derivable2.default.lens({
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

    _assert2.default.strictEqual($Name.get(), 'John Steinbeck');

    $Name.set('James Joyce');
    _assert2.default.strictEqual($Name.get(), 'James Joyce');
    _assert2.default.strictEqual($FirstName.get(), 'James');
    _assert2.default.strictEqual($LastName.get(), 'Joyce');
  });

  it('runs `set` opeartions atomically', function () {
    var $A = (0, _derivable.atom)('a');
    var $B = (0, _derivable.atom)('b');

    var numReactions = 0;
    $A.react(function () {
      return numReactions++;
    }, { skipFirst: true });
    $B.react(function () {
      return numReactions++;
    }, { skipFirst: true });

    _derivable2.default.lens({
      get: function get() {},
      set: function set() {
        $A.set('A');
        _assert2.default.strictEqual(numReactions, 0);
        $B.set('B');
        _assert2.default.strictEqual(numReactions, 0);
      }
    }).set();
    _assert2.default.strictEqual(numReactions, 2);
  });
});
