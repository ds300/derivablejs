export const assign = Object.assign;

export function equals(a, b) {
  return (
    Object.is(a, b) || (a && typeof a.equals === "function" && a.equals(b))
  );
}

export function addToArray(a, b) {
  const i = a.indexOf(b);
  if (i === -1) {
    a.push(b);
  }
}

export function removeFromArray(a, b) {
  const i = a.indexOf(b);
  if (i !== -1) {
    a.splice(i, 1);
  }
}

let _nextId = 0;
export function nextId() {
  return _nextId++;
}

export const unique = Object.freeze({ equals: () => false });

export function some(x) {
  return x !== null && x !== void 0;
}

let DEBUG_MODE = false;

export function setDebugMode(val) {
  DEBUG_MODE = !!val;
}

export function isDebug() {
  return DEBUG_MODE;
}

export function setEquals(derivable, eq) {
  derivable._equals = eq;
  return derivable;
}
