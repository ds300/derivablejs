/**
 *  Copyright (c) 2015, David Sheldrick.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

export function extend(obj, ...others) {
  for (let other of others) {
    for (let prop of Object.keys(other)) {
      obj[prop] = other[prop];
    }
  }
  return obj;
}

export function symbolValues (obj) {
  return Object.getOwnPropertySymbols(obj).map(s => obj[s]);
}

export function equals (a, b) {
  return a === b
         || Object.is && Object.is(a, b)
         || (a && a.equals && a.equals(b));
}

export function withPrototype (obj, proto) {
  obj.prototype = proto;
  return obj;
}
