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

function _type(obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
}

function _is(a, b) {
  // SameValue algorithm
  if (a === b) { // Steps 1-5, 7-10
    // Steps 6.b-6.e: +0 != -0
    return a !== 0 || 1 / a === 1 / b;
  } else {
    // Step 6.a: NaN == NaN
    return a !== a && b !== b;
  }
}

function _equals(a, b, stackA, stackB) {
  var typeA = _type(a);
  if (typeA !== _type(b)) {
    return false;
  }

  if (typeA === 'Boolean' || typeA === 'Number' || typeA === 'String') {
    return typeof a === 'object' ?
      typeof b === 'object' && equals(a.valueOf(), b.valueOf()) :
      false;
  }

  if (typeA === 'RegExp') {
    // RegExp equality algorithm: http://stackoverflow.com/a/10776635
    return (a.source === b.source) &&
           (a.global === b.global) &&
           (a.ignoreCase === b.ignoreCase) &&
           (a.multiline === b.multiline) &&
           (a.sticky === b.sticky) &&
           (a.unicode === b.unicode);
  }

  if (Object(a) === a) {
    if (typeA === 'Date' && a.getTime() !== b.getTime()) {
      return false;
    }

    var keysA = Object.keys(a);
    if (keysA.length !== Object.keys(b).length) {
      return false;
    }

    if (!stackA) {
      stackA = [];
      stackB = [];
    }

    var idx = stackA.length - 1;
    while (idx >= 0) {
      if (stackA[idx] === a) {
        return stackB[idx] === b;
      }
      idx -= 1;
    }

    stackA[stackA.length] = a;
    stackB[stackB.length] = b;
    idx = keysA.length - 1;
    while (idx >= 0) {
      var key = keysA[idx];
      if (!Object.hasOwnProperty(key, b) || !equals(b[key], a[key], stackA, stackB)) {
        return false;
      }
      idx -= 1;
    }
    stackA.pop();
    stackB.pop();
    return true;
  }
  return false;
}


export function equals (a, b, stackA, stackB) {
  if ((Object.is && Object.is(a, b)) || _is(a, b)) {
    return true;
  }
  if (!(a && b)) return false;

  return (typeof a.equals === 'function' && a.equals(b))
         || (typeof b.equals === 'function' && b.equals(a))
         || _equals(a, b, stackA, stackB)
         || false;
}

export function withPrototype (obj, proto) {
  obj.prototype = proto;
  return obj;
}
