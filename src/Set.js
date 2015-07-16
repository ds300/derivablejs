/**
 *  Copyright (c) 2015, David Sheldrick.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { symbolValues } from './util'

/**
 *  === CUSTOM SET IMPLEMENTATION ===
 *
 * for child/parent relationships. only need to support add, remove and
 * iterate. Using identity for equality and ._id properties for map keys.

 * use an array-based set to begin with, when it gets size > 16, switch to map.
 * switch back down at size 8

 * 16/8 are educated guesses based on other implementations I've seen.
 * An empirical study on the best numbers to choose may be forthcoming if
 * perfomance turns out to be an issue. Or maybe something altogether different.
 */
const useMapAtSize = 16;
const goBackToArrayAtSize = 8;

class MapSet {
  constructor (items) {
    this._map = {};
    this._size = 0;
    for (let item of items) {
      this.add(item);
    }
  }
  add (elem) {
    this._map[elem._id] = elem;
    this._size++;
    return this;
  }
  remove (elem) {
    delete this._map[elem._id];
    if (--this._size <= goBackToArrayAtSize) {
      return new ArraySet(symbolValues(this._map));
    }
    return this;
  }
  [Symbol.iterator]: function* () {
    for (let k of this._map) {
      yield this._map[k];
    }
  }
}

class ArraySet {
  constructor (items) {
    this._array = items || [];
  }
  add (elem) {
    if (this._array.indexOf(elem) < 0) {
      this._array.push(elem);
      if (this.length === useMapAtSize) {
        return new MapSet(this._array);
      } else {
        return this;
      }
    }
  }
  remove (elem) {
    let idx = this._array.indexOf(elem);
    if (idx >= 0) {
      if (idx === this._array.length - 1) {
        this._array.pop();
      } else {
        this._array[idx] = this._array.pop();
      }
    }
    return this;
  }
  [Symbol.iterator] () {
    return this._array[Symbol.iterator]();
  }
}

export default class Set {
  constructor () {
    this._set = new ArraySet();
  }
  add (elem) {
    this._set = this._set.add(elem);
  }
  remove (elem) {
    this._set = this._set.remove(elem);
  }
  [Symbol.iterator] () {
    return this._set[Symbol.iterator]();
  }
}
