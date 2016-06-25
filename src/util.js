export var keys = Object.keys;

export function assign (obj) {
  for (var i = 1; i < arguments.length; i++) {
    var other = arguments[i];
    var ks = keys(other || {});
    for (var j = ks.length; j--;) {
      var prop = ks[j];
      obj[prop] = other[prop];
    }
  }
  return obj;
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

export function equals (a, b) {
  return _is(a, b) || (a && typeof a.equals === 'function' && a.equals(b));
};

export function addToArray (a, b) {
  var i = a.indexOf(b);
  if (i < 0) {
    a.push(b);
  }
};

export function removeFromArray (a, b) {
  var i = a.indexOf(b);
  if (i >= 0) {
    a.splice(i, 1);
  }
};

var _nextId = 0;
export function nextId () {
  return _nextId++;
};

export function slice (a, i) {
  return Array.prototype.slice.call(a, i);
};

export var unique = Object.freeze({equals: function () { return false; }});

export function some (x) {
  return (x !== null) && (x !== void 0);
};

export var DEBUG_MODE = false;
export function setDebugMode (val) {
  DEBUG_MODE = !!val;
};

export function setEquals (derivable, equals) {
  derivable._equals = equals;
  return derivable;
};
