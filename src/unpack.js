import { isDerivable } from "./types";
import { derive } from "./derivation";

/**
 * dereferences a thing if it is dereferencable, otherwise just returns it.
 */

export function unpack(thing) {
  if (isDerivable(thing)) {
    return thing.get();
  } else {
    return thing;
  }
}

function deepUnpack(thing) {
  if (isDerivable(thing)) {
    return thing.get();
  } else if (Array.isArray(thing)) {
    return thing.map(deepUnpack);
  } else if (thing.constructor === Object) {
    const result = {};
    const keys = Object.keys(thing);
    for (let i = keys.length; i--; ) {
      const prop = keys[i];
      result[prop] = deepUnpack(thing[prop]);
    }
    return result;
  } else {
    return thing;
  }
}

export function struct(arg) {
  if (arg.constructor === Object || Array.isArray(arg)) {
    return derive(() => deepUnpack(arg));
  } else {
    throw new Error("`struct` expects plain Object or Array");
  }
}
