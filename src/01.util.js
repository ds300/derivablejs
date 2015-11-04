var util_keys = Object.keys;

function util_extend(obj) {
  for (var i = 1; i < arguments.length; i++) {
    var other = arguments[i];
    var keys = util_keys(other);
    for (var j = keys.length; j--;) {
      var prop = keys[j];
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

function util_equals (a, b) {
  return _is(a, b) || (a && typeof a.equals === 'function' && a.equals(b));
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

var util_unique = Object.freeze({equals: function () { return false; }});

function util_some (x) {
  return (x !== null) && (x !== void 0);
}
