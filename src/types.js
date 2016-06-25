export var ATOM = "ATOM";
export var DERIVATION = "DERIVATION";
export var LENS = "LENS";
export var REACTOR = "REACTOR";

export function isDerivable(x) {
  return x &&
         (x._type === DERIVATION ||
          x._type === ATOM ||
          x._type === LENS);
}

export function isAtom (x) {
  return x && (x._type === ATOM || x._type === LENS);
}

export function isDerivation (x) {
  return x && (x._type === DERIVATION || x._type === LENS);
}

export function isLensed (x) {
  return x && x._type === LENS;
}

export function isReactor (x) {
  return x && x._type === REACTOR;
}
