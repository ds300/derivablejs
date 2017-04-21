import {isDerivable} from './types';
import * as util from './util';

/**
 * dereferences a thing if it is dereferencable, otherwise just returns it.
 */

export function unpack (thing) {
  if (isDerivable(thing)) {
    return thing.get();
  } else {
    return thing;
  }
};

export function deepUnpack (thing) {
  if (isDerivable(thing)) {
    return thing.get();
  } else if (thing instanceof Array) {
    return thing.map(deepUnpack);
  } else if (thing.constructor === Object) {
    var result = {};
    var keys = util.keys(thing);
    for (var i = keys.length; i--;) {
      var prop = keys[i];
      result[prop] = deepUnpack(thing[prop]);
    }
    return result;
  } else {
    return thing;
  }
};