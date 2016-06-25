'use strict';

var _util = require('../../src/util');

var util = _interopRequireWildcard(_util);

var _chai = require('chai');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

describe('the assign function polyfill', function () {
  it('merges objects together', function () {
    var caps = { a: "A", b: "B" };
    var lower = { a: "a", b: "b", c: "c" };
    var init = {};
    (0, _chai.expect)(util.assignPolyfill(init, lower, caps)).to.equal(init);
    (0, _chai.expect)(init).to.deep.equal({
      a: "A", b: "B", c: "c"
    });
  });
  it('doesn\'t care about nulls', function () {
    var caps = { a: "A", b: "B" };
    (0, _chai.expect)(util.assignPolyfill({}, caps, null)).to.deep.equal(caps);
    (0, _chai.expect)(util.assignPolyfill({}, caps, null)).to.not.equal(caps);

    (0, _chai.expect)(util.assignPolyfill({}, null, caps, null)).to.deep.equal(caps);
    (0, _chai.expect)(util.assignPolyfill({}, null, caps, null)).to.not.equal(caps);
  });
});

describe('the equals function', function () {
  it('checks equality for primitives', function () {
    (0, _chai.expect)(util.equals(NaN, NaN)).to.be.true;
    (0, _chai.expect)(util.equals(4, 2 + 2)).to.be.true;
    (0, _chai.expect)(util.equals(0, 0)).to.be.true;
    (0, _chai.expect)(util.equals("blah", "bl" + "ah")).to.be.true;
  });
  it('checks identity but not equality for objects', function () {
    (0, _chai.expect)(util.equals({}, {})).to.be.false;
    (0, _chai.expect)(util.equals([], [])).to.be.false;
    var arr = [];
    var obj = {};
    (0, _chai.expect)(util.equals(arr, arr)).to.be.true;
    (0, _chai.expect)(util.equals(obj, obj)).to.be.true;
  });
  it('uses .equals methods if present', function () {
    (0, _chai.expect)(util.equals({ equals: function equals() {
        return false;
      } }, { equals: function equals() {
        return true;
      } })).to.be.false;

    (0, _chai.expect)(util.equals({ equals: function equals() {
        return true;
      } }, { equals: function equals() {
        return false;
      } })).to.be.true;
  });
});

describe('the addToArray function', function () {
  it('adds elements to arrays if they aren\'t already in there', function () {
    var arr = [];
    util.addToArray(arr, 4);
    (0, _chai.expect)(arr.length).to.equal(1);
    (0, _chai.expect)(arr[0]).to.equal(4);

    // should not add it again
    util.addToArray(arr, 4);
    (0, _chai.expect)(arr.length).to.equal(1);
    (0, _chai.expect)(arr[0]).to.equal(4);

    util.addToArray(arr, 5);
    (0, _chai.expect)(arr.length).to.equal(2);
    (0, _chai.expect)(arr).to.deep.equal([4, 5]);
  });
});

describe('the removeFromArray function', function () {
  it('removes elements from arrays if they are in there', function () {
    var arr = [4, 5, 6];

    util.removeFromArray(arr, 5);
    (0, _chai.expect)(arr).to.deep.equal([4, 6]);

    util.removeFromArray(arr, 5);
    (0, _chai.expect)(arr).to.deep.equal([4, 6]);

    util.removeFromArray(arr, 6);
    (0, _chai.expect)(arr).to.deep.equal([4]);

    util.removeFromArray(arr, 4);
    (0, _chai.expect)(arr).to.deep.equal([]);

    util.removeFromArray(arr, 4);
    (0, _chai.expect)(arr).to.deep.equal([]);
  });
});

describe('the nextId function', function () {
  it('returns a succession of integers', function () {
    var last = util.nextId();
    (0, _chai.expect)(last).to.be.a('number');
    for (var i = 0; i < 1000; i++) {
      var next = util.nextId();
      (0, _chai.expect)(next).to.be.a('number');
      (0, _chai.expect)(next).to.be.above(last);
      last = next;
    }
  });
});

describe('the slice function', function () {
  it('is an alias for Array.prototype.slice', function () {
    (0, _chai.expect)(util.slice([0, 1, 2], 0)).to.deep.equal([0, 1, 2]);
    (0, _chai.expect)(util.slice([0, 1, 2], 1)).to.deep.equal([1, 2]);
    (0, _chai.expect)(util.slice([0, 1, 2], 2)).to.deep.equal([2]);
    (0, _chai.expect)(util.slice([0, 1, 2], 3)).to.deep.equal([]);
    (0, _chai.expect)(util.slice([0, 1, 2], 4)).to.deep.equal([]);
    (0, _chai.expect)(util.slice([0, 1, 2], -1)).to.deep.equal([2]);
    (0, _chai.expect)(util.slice([0, 1, 2], -2)).to.deep.equal([1, 2]);
    (0, _chai.expect)(util.slice([0, 1, 2], -3)).to.deep.equal([0, 1, 2]);
    (0, _chai.expect)(util.slice([0, 1, 2], -4)).to.deep.equal([0, 1, 2]);
  });
});

describe('the unique object', function () {
  it('is not equal to anything according to its .equals method', function () {
    (0, _chai.expect)(util.unique.equals(util.unique)).to.be.false;
  });
});

describe('the some function', function () {
  it('checks whether something is not (null or undefined)', function () {
    (0, _chai.expect)(util.some(null)).to.be.false;
    (0, _chai.expect)(util.some(void 0)).to.be.false;

    (0, _chai.expect)(util.some(0)).to.be.true;
    (0, _chai.expect)(util.some("")).to.be.true;
    (0, _chai.expect)(util.some([])).to.be.true;
    (0, _chai.expect)(util.some(false)).to.be.true;
  });
});

describe('the DEBUG_MODE flag', function () {
  it('should be false by default', function () {
    (0, _chai.expect)(util.DEBUG_MODE).to.be.false;
  });
});

describe('the setDebugMode function', function () {
  it('sets the DEBUG_MODE flag', function () {
    util.setDebugMode(true);
    (0, _chai.expect)(util.DEBUG_MODE).to.be.true;
  });
  it('casts its argument to boolean', function () {
    util.setDebugMode("haha");
    (0, _chai.expect)(util.DEBUG_MODE).to.be.true;

    util.setDebugMode(null);
    (0, _chai.expect)(util.DEBUG_MODE).to.be.false;

    util.setDebugMode(3);
    (0, _chai.expect)(util.DEBUG_MODE).to.be.true;

    util.setDebugMode(0);
    (0, _chai.expect)(util.DEBUG_MODE).to.be.false;
  });
});

describe('the setEquals function', function () {
  it('sets the _equals property of an object and returns the object', function () {
    var obj = {};

    var res = util.setEquals(obj, function () {
      return "hey!";
    });

    (0, _chai.expect)(obj).to.equal(res);
    (0, _chai.expect)(obj._equals).to.be.a('function');
    (0, _chai.expect)(obj._equals()).to.equal('hey!');
  });
});
