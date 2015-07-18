/**
 *  Copyright (c) 2015, David Sheldrick.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { StandardReaction, anonymousReaction, Reaction} from './reaction'
import { maybeCaptureParent } from './parents'

export function createDerivablePrototype (havelock, { equals }) {
  return {
    withValidator (f) {
      if (f == null || (typeof f === 'function')) {
        let result = this._clone();
        let existing = this._validator;
        if (existing) {
          result._validator = x => f(x) && existing(x)
        } else {
          result._validator = f;
        }
        return result;
      } else {
        throw new Error(".withValidator expects function or null");
      }
    },

    validate () {
      this._validate(this.get());
    },

    _validate (value) {
      let validationResult = this._validator && this._validator(value);
      if (this._validator && validationResult !== true) {
        throw new Error(`Failed validation with value: '${value}'.`
                        +` Validator returned '${validationResult}' `);
      }
    },

    /**
     * Creates a derived value whose state will always be f applied to this
     * value
     */
    derive (f) {
      return havelock.derive(this, f);
    },

    reaction (f) {
      if (typeof f === 'function') {
        return new StandardReaction(f)._createBase(this);
      } else if (f instanceof Reaction) {
        return f._createBase(this);
      } else if (f && f.react) {
        return anonymousReaction(f)._createBase(this);
      } else {
        throw new Error("Unrecognized type for reaction " + f);
      }
    },

    react (f) {
      return this.reaction(f).start().force();
    },

    get () {
      maybeCaptureParent(this);
      return this._get(); // abstract protected method, in Java parlance
    },

    is (other) {
      return havelock.lift(equals)(this, other);
    },

    and (other) {
      return this.derive(x => x && havelock.unpack(other));
    },

    or (other) {
      return this.derive(x => x || havelock.unpack(other));
    },

    then (thenClause, elseClause) {
      return this.derive(x => havelock.unpack(x ? thenClause : elseClause));
    },

    not () {
      return this.derive(x => !x);
    },

    ["switch"] (...args) {
      return this.derive(x => {
        for (let i = 0; i < args.length-2; i+=2) {
          if (equals(x, havelock.unpack(args[i]))) {
            return havelock.unpack(args[i+1]);
          }
        }
        if (i === args.length - 1) {
          return havelock.unpack(args[i]);
        }
      });
    }
  };
}
