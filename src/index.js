import { derivablePrototype } from "./derivable";
import { mutablePrototype } from "./mutable";
import { Atom, atom } from "./atom";
import { Proxy, proxy } from "./proxy";
import { Derivation, derive } from "./derivation";
import global from "./global";
import { assign, setDebugMode } from "./util";

export { isDerivable, isAtom, isProxy, isDerivation } from "./types";
export { unpack, struct } from "./unpack.js";
export {
  transact,
  transaction,
  ticker,
  atomic,
  atomically
} from "./transactions";
export { Reactor as __Reactor } from "./reactors";
export { captureDereferences } from "./parents";

export { atom, proxy, derive, setDebugMode };

assign(Derivation.prototype, derivablePrototype);
assign(Proxy.prototype, derivablePrototype, mutablePrototype);
assign(Atom.prototype, derivablePrototype, mutablePrototype);

if (global.__DERIVABLE_INIT_FLAG__) {
  console.warn(
    "Multiple instances of derivable have been initialized on the same page"
  );
}
global.__DERIVABLE_INIT_FLAG__ = true;
