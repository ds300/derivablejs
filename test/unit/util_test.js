'use strict';

require('source-map-support');
require('babel-register');
const util = require('../../src/util');

test('the equals function checks equality for primitives', () => {
  expect(util.equals(NaN, NaN)).toEqual(true);
  expect(util.equals(4, 2 + 2)).toEqual(true);
  expect(util.equals(0, 0)).toEqual(true);
  expect(util.equals("blah", "bl" + "ah")).toEqual(true);
});

test('the equals function checks identity but not equality for objects', () => {
  expect(util.equals({}, {})).toEqual(false);
  expect(util.equals([], [])).toEqual(false);
  var arr = [];
  var obj = {};
  expect(util.equals(arr, arr)).toEqual(true);
  expect(util.equals(obj, obj)).toEqual(true);
});

test('the equals function uses .equals methods if present', () => {
  expect(
    util.equals({ equals: () => false }, { equals: () => true })
  ).toEqual(false);

  expect(
    util.equals({ equals: () => true }, { equals: () => false })
  ).toEqual(true);
});

test('the addToArray function adds elements to arrays if they aren\'t already in there', () => {
  const arr = [];
  util.addToArray(arr, 4);
  expect(arr.length).toEqual(1);
  expect(arr[0]).toEqual(4);

  // should not add it again
  util.addToArray(arr, 4);
  expect(arr.length).toEqual(1);
  expect(arr[0]).toEqual(4);

  util.addToArray(arr, 5);
  expect(arr.length).toEqual(2);
  expect(arr).toEqual([4, 5]);
});

test('the removeFromArray function removes elements from arrays if they are in there', function () {
  const arr = [4, 5, 6];

  util.removeFromArray(arr, 5);
  expect(arr).toEqual([4, 6]);

  util.removeFromArray(arr, 5);
  expect(arr).toEqual([4, 6]);

  util.removeFromArray(arr, 6);
  expect(arr).toEqual([4]);

  util.removeFromArray(arr, 4);
  expect(arr).toEqual([]);

  util.removeFromArray(arr, 4);
  expect(arr).toEqual([]);
});

test('the nextId function returns a succession of integers', function () {
  let last = util.nextId();
  expect(typeof last).toEqual('number');
  for (var i = 0; i < 1000; i++) {
    var next = util.nextId();
    expect(typeof next).toEqual('number');
    expect(next).toBeGreaterThan(last);
    last = next;
  }
});

test('slice function is an alias for Array.prototype.slice', function () {
  expect(util.slice([0, 1, 2], 0)).toEqual([0, 1, 2]);
  expect(util.slice([0, 1, 2], 1)).toEqual([1, 2]);
  expect(util.slice([0, 1, 2], 2)).toEqual([2]);
  expect(util.slice([0, 1, 2], 3)).toEqual([]);
  expect(util.slice([0, 1, 2], 4)).toEqual([]);
  expect(util.slice([0, 1, 2], -1)).toEqual([2]);
  expect(util.slice([0, 1, 2], -2)).toEqual([1, 2]);
  expect(util.slice([0, 1, 2], -3)).toEqual([0, 1, 2]);
  expect(util.slice([0, 1, 2], -4)).toEqual([0, 1, 2]);
});

test('the unique object is not equal to anything according to its .equals method', function () {
  expect(util.unique.equals(util.unique)).toEqual(false);
});

test('the some function checks whether something is not (null or undefined)', function () {
  expect(util.some(null)).toEqual(false);
  expect(util.some(void 0)).toEqual(false);

  expect(util.some(0)).toEqual(true);
  expect(util.some("")).toEqual(true);
  expect(util.some([])).toEqual(true);
  expect(util.some(false)).toEqual(true);
});

test('the DEBUG_MODE flag should be false by default', function () {
  expect(util.DEBUG_MODE).toEqual(false);
});

test('the setDebugMode function sets the DEBUG_MODE flag', function () {
  util.setDebugMode(true);
  expect(util.DEBUG_MODE).toEqual(true);
});

test('the setDebugMode function casts its argument to boolean', function () {
  util.setDebugMode("haha");
  expect(util.DEBUG_MODE).toEqual(true);

  util.setDebugMode(null);
  expect(util.DEBUG_MODE).toEqual(false);

  util.setDebugMode(3);
  expect(util.DEBUG_MODE).toEqual(true);

  util.setDebugMode(0);
  expect(util.DEBUG_MODE).toEqual(false);
});

test('the setEquals function sets the _equals property of an object and returns the object', function () {
  const obj = {};

  const res = util.setEquals(obj, () => "hey!");

  expect(obj).toEqual(res);
  expect(typeof obj._equals).toEqual('function');
  expect(obj._equals()).toEqual('hey!');
});
