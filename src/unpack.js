import {isDerivable} from './types';

/**
 * dereferences a thing if it is dereferencable, otherwise just returns it.
 */

export function unpack (thing) {
  if (isDerivable(thing)) {
    return thing.get();
  } else {
    return thing;
  }
}

export function deepUnpack (thing) {
  if (isDerivable(thing)) {
    return thing.get();
  } else if (thing instanceof Array) {
    return thing.map(deepUnpack);
  } else if (thing.constructor === Object) {
    const result = {};
    const keys = Object.keys(thing);
    for (let i = keys.length; i--;) {
      const prop = keys[i];
      result[prop] = deepUnpack(thing[prop]);
    }
    return result;
  } else {
    return thing;
  }
}
