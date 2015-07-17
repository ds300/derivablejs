/**
 *  Copyright (c) 2015, David Sheldrick.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { ATOM, DERIVATION, LENS, REACTION } from './gc'
import { createAtomPrototype, createAtom } from './atom'
import { createDerivationPrototype, createDerivation } from './derivation'
import { createLensPrototype, createLens } from './lens'
import { createDerivablePrototype } from './derivable'
import { createMutablePrototype } from './mutable'
import { equals, extend, withPrototype } from './util'
import { Reaction } from './reaction'

const defaultConfig = { equals };

export default function havelock (config={}) {
  config = extend({}, defaultConfig, config);

  const Havelock = {};

  Havelock.isAtom       = x => x && x._type === ATOM;
  Havelock.isDerivation = x => x && (x._type === DERIVATION || x._type === LENS);
  Havelock.isLens       = x => x && x._type === LENS;
  Havelock.isReaction   = x => x && x._type === REACTION;
  Havelock.isDerivable  = x => Havelock.isDerivation(x) || Havelock.isAtom(x);

  let Derivable  = createDerivablePrototype(Havelock, config);
  let Mutable    = createMutablePrototype(Havelock, config);

  let Atom       = extend({}, Mutable, Derivable,
                          createAtomPrototype(Havelock, config));

  let Derivation = extend({}, Derivable,
                          createDerivationPrototype(Havelock, config));

  let Lens       = extend({}, Mutable, Derivation
                          createLensPrototype(Havelock, config));

  Havelock.Reaction = Reaction;

  /**
   * Constructs a new atom whose state is the given value
   */
  Havelock.atom = val => withPrototype(createAtom(val), Atom);

  /**
   * Sets the e's state to be f applied to e's current state and args
   */
  Havelock.swap = (e, f, args) => e.set(f.apply(null, [e.get()].concat(args)));

  /**
   * Creates a new derivation. Can also be used as a template string tag.
   */
  Havelock.derive = (a, b, c, d, e) => {
    if (a instanceof Array) {
      return deriveString.apply(null, arguments);
    }
    var n = arguments.length;
    switch (n) {
      case 0:
        throw new Error("Wrong arity for derive. Expecting 1+ args");
      case 1:
        return withPrototype(createDerivation(a), Derivation);
      case 2:
        return Havelock.derive(() => b(a.get()));
      case 3:
        return Havelock.derive(() => c(a.get(), b.get()));
      case 4:
        return Havelock.derive(() => d(a.get(), b.get(), c.get()));
      case 5:
        return Havelock.derive(() => e(a.get(), b.get(), c.get(), d.get()));
      default:
        var args = Array.prototype.slice.call(arguments, 0, n-1);
        var f = arguments[n-1];
        return Havelock.derive(() => f.apply(null, args.map(a => a.get())));
    }
  };

  function deriveString (parts, ...args) {
    return derive(() => {
      let s = "";
      for (let i=0; i<parts.length; i++) {
        s += parts[i];
        if (i < args.length) {
          s += Havelock.unpack(args[i]);
        }
      }
      return s;
    });
  }

  /**
   * creates a new lens
   */
  Havelock.lens = (parent, descriptor) => {
    let derivation = parent.derive(descriptor.get);
    let lens = createLens(derivation, parent, descriptor);
    lens.prototype = Lens;
    return lens;
  };

  /**
   * dereferences a thing if it is dereferencable, otherwise just returns it.
   */
  Havelock.unpack = thing => {
    if (Havelock.isDerivable(thing)) {
      return thing.get();
    } else {
      return thing;
    }
  };

  /**
   * lifts a non-monadic function to work on derivables
   */
  Havelock.lift = f => {
    return function () {
      let args = arguments;
      return derive(function () {
        return f.apply(this, Array.prototype.map.call(args, Havelock.unpack));
      });
    }
  };

  /**
   * sets a to v, returning v
   */
  Havelock.set = (a, v) => a.set(v);

  Havelock.get = d => d.get();

  function deepUnpack (thing) {
    if (thing instanceof Array) {
      return thing.map(deepUnpack);
    } else if (thing.constructor === Object || thing.constructor === void 0) {
      let result = {};
      for (let prop of Object.keys(thing)) {
        result[prop] = deepUnpack(thing[prop]);
      }
      return result;
    } else {
      return Havelock.unpack(thing);
    }
  }

  Havelock.struct = arg => Havelock.derive(() => deepUnpack(arg));

  Havelock.ifThenElse = (a, b, c) => a.then(b, c);

  Havelock.or = (...args) => Havelock.derive(() => {
    for (i = 0; i<args.length; i++) {
      let x = Havelock.unpack(args[i]);
      if (x) {
        return x;
      }
    }
  });

  Havelock.and = (...args) => Havelock.derive(() => {
    let val;
    for (let arg of args) {
      val = Havelock.unpack(arg);
      if (!val) {
        break;
      }
    }
    return val;
  })

  Havelock.not = x => x.not();

  Havelock.switchCase = (x, ...args) => Derivable.switch.apply(x, args);

  return Havelock;
}
