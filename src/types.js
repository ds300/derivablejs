export const ATOM = "ATOM";
export const DERIVATION = "DERIVATION";
export const LENS = "LENS";
export const REACTOR = "REACTOR";

export function isDerivable(x) {
  return x && (x._type === DERIVATION || x._type === ATOM || x._type === LENS);
}

export function isAtom(x) {
  return x && (x._type === ATOM || x._type === LENS);
}

export function isDerivation(x) {
  return x && (x._type === DERIVATION || x._type === LENS);
}

export function isLens(x) {
  return x && x._type === LENS;
}
