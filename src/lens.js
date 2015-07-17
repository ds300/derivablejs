/**
 *  Copyright (c) 2015, David Sheldrick.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import Set from './set'
import { LENS, NEW } from './gc'

export function createLensPrototype(havelock, _) {
  return {
    _type: LENS,

    _clone () {
      return havelock.lens(this._parent, {get: this._getter, set: this._setter});
    },

    set (value) {
      this._parent.set(this._setter(this._parent._get(), value));
      return this.get();
    }
  }
}

export function createLens(derivation, parent, descriptor) {
  derivation._getter = descriptor.get;
  derivation._setter = descriptor.set;
  derivation._parent = parent;

  return derivation;
}
