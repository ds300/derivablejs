/**
 *  Copyright (c) 2015, David Sheldrick.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */
import { NEW, CHANGED, UNCHANGED, ORPHANED, UNSTABLE,
         STABLE, REACTION} from './gc'

import { extend } from './util'

class ReactionBase {
  constructor (parent, control) {
    this.control = control;
    this.parent = parent;
    this._mode = STABLE;
    this._uid = Symbol("my_uid");
    this.active = false;
  }
  _type: REACTION

  stop () {
   this.parent._children.remove(this);
   this.active = false;
   this.control.onStop && this.control.onStop();
  }

  start () {
   this.parent._children.add(this);
   this.active = true;
   this.control.onStart && this.control.onStart();
   this.parent._get(); // set up bi-directional link
  }

  maybeReact () {
    if (this._mode === UNSTABLE) {
      if (this.parent._mode === UNSTABLE
          || this.parent._mode === ORPHANED
          || this.parent._mode === NEW) {
        this.parent._get();
      }

      switch (this.parent._mode) {
      case UNCHANGED:
        this._mode = STABLE;
        break;
      case CHANGED:
        this.force();
        break;
      // should never be STABLE, as this only gets called during react phase
      default:
        throw new Error(`invalid mode for parent: ${this.parent._mode}`);
      }
    }
  }

  force () {
    if (this.control.react) {
      this._mode = STABLE;
      this.control.react(this.parent._get());
    } else {
      throw new Error("No reaction function available.");
    }
  }
}

export class Reaction {
  _createBase (parent) {
    this._base = new ReactionBase(parent, this);
    return this;
  }
  start () {
    this._base.start();
    return this;
  }
  stop () {
    this._base.stop();
    return this;
  }
  force () {
    this._base.force();
    return this;
  }
  isRunning () {
    return this._base.active;
  }
  // lifecycle methods go here
  // onStart, onStop
}

export class StandardReaction extends Reaction {
  constructor (f) {
    super();
    this.react = f;
  }
}

export function anonymousReaction (descriptor) {
  return Object.create(extend({}, descriptor, Reaction.prototype));
}
