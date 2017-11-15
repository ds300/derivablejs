import { derivablePrototype } from "./derivable";
import { mutablePrototype } from "./mutable";
import { Atom, atom } from "./atom";
import { Proxy, proxy } from "./proxy";
import { Derivation, derive } from "./derivation";
import global from "./global";
import { assign, setDebugMode } from "./util";
import { deepUnpack, unpack } from "./unpack";

export { isDerivable, isAtom, isProxy, isDerivation } from "./types";
export {
  transact,
  transaction,
  ticker,
  atomic,
  atomically
} from "./transactions";
export { Reactor as __Reactor } from "./reactors";
export { captureDereferences } from "./parents";

export { atom, proxy, derive, unpack, setDebugMode };

assign(Derivation.prototype, derivablePrototype);
assign(Proxy.prototype, derivablePrototype, mutablePrototype);
assign(Atom.prototype, derivablePrototype, mutablePrototype);

if (global.__DERIVABLE_INIT_FLAG__) {
  console.warn(
    "Multiple instances of derivable have been initialized on the same page"
  );
}
global.__DERIVABLE_INIT_FLAG__ = true;

export function struct(arg) {
  if (arg.constructor === Object || Array.isArray(arg)) {
    return derive(() => deepUnpack(arg));
  } else {
    throw new Error("`struct` expects plain Object or Array");
  }
}

export function wrapPreviousState(f, init) {
  let lastState = init;
  return function(newState) {
    const result = f.call(this, newState, lastState);
    lastState = newState;
    return result;
  };
}
