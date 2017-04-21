export var ATOM = "ATOM";
export var DERIVATION = "DERIVATION";
export var PROXY = "PROXY";
export var REACTOR = "REACTOR";

export function isDerivable(x) {
  return x &&
         (x._type === DERIVATION ||
          x._type === ATOM ||
          x._type === PROXY);
}

export function isAtom (x) {
  return x && (x._type === ATOM || x._type === PROXY);
}

export function isDerivation (x) {
  return x && (x._type === DERIVATION || x._type === PROXY);
}

export function isProxy (x) {
  return x && x._type === PROXY;
}
