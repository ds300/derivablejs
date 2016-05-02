import * as util from '../../src/util';
import {expect} from 'chai';

describe('the assign function polyfill', () => {
  it('merges objects together', () => {
    const caps = {a: "A", b: "B"};
    const lower = {a: "a", b: "b", c: "c"};
    const init = {};
    expect(util.assignPolyfill(init, lower, caps)).to.equal(init);
    expect(init).to.deep.equal({
      a: "A", b: "B", c: "c"
    });
  });
  it(`doesn't care about nulls`, () => {
    const caps = {a: "A", b: "B"};
    expect(util.assignPolyfill({}, caps, null)).to.deep.equal(caps);
    expect(util.assignPolyfill({}, caps, null)).to.not.equal(caps);

    expect(util.assignPolyfill({}, null, caps, null)).to.deep.equal(caps);
    expect(util.assignPolyfill({}, null, caps, null)).to.not.equal(caps);
  });
});

describe('the equals function', () => {
  it('checks equality for primitives', () => {
    expect(util.equals(NaN, NaN)).to.be.true;
    expect(util.equals(4, 2 + 2)).to.be.true;
    expect(util.equals(0, 0)).to.be.true;
    expect(util.equals("blah", "bl" + "ah")).to.be.true;
  });
  it('checks identity but not equality for objects', () => {
    expect(util.equals({}, {})).to.be.false;
    expect(util.equals([], [])).to.be.false;
    const arr = [];
    const obj = {};
    expect(util.equals(arr, arr)).to.be.true;
    expect(util.equals(obj, obj)).to.be.true;
  });
  it('uses .equals methods if present', () => {
    expect(util.equals({equals: () => false}, {equals: () => true}))
      .to.be.false;

    expect(util.equals({equals: () => true}, {equals: () => false}))
      .to.be.true;
  });
});

describe('the addToArray function', () => {
  it(`adds elements to arrays if they aren't already in there`, () => {
    const arr = [];
    util.addToArray(arr, 4);
    expect(arr.length).to.equal(1);
    expect(arr[0]).to.equal(4);

    // should not add it again
    util.addToArray(arr, 4);
    expect(arr.length).to.equal(1);
    expect(arr[0]).to.equal(4);

    util.addToArray(arr, 5);
    expect(arr.length).to.equal(2);
    expect(arr).to.deep.equal([4,5]);
  });
});

describe('the removeFromArray function', () => {
  it(`removes elements from arrays if they are in there`, () => {
    const arr = [4,5,6];

    util.removeFromArray(arr, 5);
    expect(arr).to.deep.equal([4,6]);

    util.removeFromArray(arr, 5);
    expect(arr).to.deep.equal([4,6]);

    util.removeFromArray(arr, 6);
    expect(arr).to.deep.equal([4]);

    util.removeFromArray(arr, 4);
    expect(arr).to.deep.equal([]);

    util.removeFromArray(arr, 4);
    expect(arr).to.deep.equal([]);
  });
});

describe('the nextId function', () => {
  it('returns a succession of integers', () => {
    let last = util.nextId();
    expect(last).to.be.a('number');
    for (var i = 0; i < 1000; i++) {
      const next = util.nextId();
      expect(next).to.be.a('number');
      expect(next).to.be.above(last);
      last = next;
    }
  });
});

describe('the slice function', () => {
  it('is an alias for Array.prototype.slice', () => {
    expect(util.slice([0,1,2], 0)).to.deep.equal([0,1,2]);
    expect(util.slice([0,1,2], 1)).to.deep.equal([1,2]);
    expect(util.slice([0,1,2], 2)).to.deep.equal([2]);
    expect(util.slice([0,1,2], 3)).to.deep.equal([]);
    expect(util.slice([0,1,2], 4)).to.deep.equal([]);
    expect(util.slice([0,1,2], -1)).to.deep.equal([2]);
    expect(util.slice([0,1,2], -2)).to.deep.equal([1, 2]);
    expect(util.slice([0,1,2], -3)).to.deep.equal([0,1,2]);
    expect(util.slice([0,1,2], -4)).to.deep.equal([0,1,2]);
  });
});

describe('the unique object', () => {
  it('is not equal to anything according to its .equals method', () => {
    expect(util.unique.equals(util.unique)).to.be.false;
  });
});

describe('the some function', () => {
  it('checks whether something is not (null or undefined)', () => {
    expect(util.some(null)).to.be.false;
    expect(util.some(void 0)).to.be.false;

    expect(util.some(0)).to.be.true;
    expect(util.some("")).to.be.true;
    expect(util.some([])).to.be.true;
    expect(util.some(false)).to.be.true;
  });
});

describe('the DEBUG_MODE flag', () => {
  it('should be false by default', () => {
    expect(util.DEBUG_MODE).to.be.false;
  });
});

describe('the setDebugMode function', () => {
  it('sets the DEBUG_MODE flag', () => {
    util.setDebugMode(true);
    expect(util.DEBUG_MODE).to.be.true;
  });
  it('casts its argument to boolean', () => {
    util.setDebugMode("haha");
    expect(util.DEBUG_MODE).to.be.true;

    util.setDebugMode(null);
    expect(util.DEBUG_MODE).to.be.false;

    util.setDebugMode(3);
    expect(util.DEBUG_MODE).to.be.true;

    util.setDebugMode(0);
    expect(util.DEBUG_MODE).to.be.false;
  });
});

describe('the setEquals function', () => {
  it('sets the _equals property of an object and returns the object', () => {
    const obj = {};

    const res = util.setEquals(obj, () => "hey!");

    expect(obj).to.equal(res);
    expect(obj._equals).to.be.a('function');
    expect(obj._equals()).to.equal('hey!');
  });
});
