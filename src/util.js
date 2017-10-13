export var keys = Object.keys;

export var assign = Object.assign;

export function equals (a, b) {
  return Object.is(a, b) || (a && typeof a.equals === 'function' && a.equals(b));
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
