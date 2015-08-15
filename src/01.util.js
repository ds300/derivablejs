var util_keys = Object.keys;

function util_extend(obj) {
  for (var i = 1; i < arguments.length; i++) {
    var other = arguments[i];
    util_keys(other).forEach(function (prop) {
      obj[prop] = other[prop];
    });
  }
  return obj;
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
      typeof b === 'object' && util_equals(a.valueOf(), b.valueOf()) :
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
      if (!Object.hasOwnProperty(key, b) ||
          !util_equals(b[key], a[key], stackA, stackB)) {
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

function util_equals (a, b, stackA, stackB) {
  if ((Object.is && Object.is(a, b)) || _is(a, b)) {
    return true;
  }
  if (!(a && b)) return false;

  return (typeof a.equals === 'function' && a.equals(b)) ||
         (typeof b.equals === 'function' && b.equals(a)) ||
         _equals(a, b, stackA, stackB) ||
         false;
}

function util_addToArray (a, b) {
  var i = a.indexOf(b);
  if (i < 0) {
    a.push(b);
  }
}

function util_removeFromArray (a, b) {
  var i = a.indexOf(b);
  if (i >= 0) {
    a.splice(i, 1);
  }
}

function util_arrayContains (a, b) {
  return a.indexOf(b) >= 0;
}

var nextId = 0;
function util_nextId () {
  return nextId++;
}

function util_slice (a, i) {
  return Array.prototype.slice.call(a, i);
}
