/**
 *  Copyright (c) 2015, David Sheldrick.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

export default function createMutablePrototype (havelock, _) {
  return {
    swap (...args) {
      return this.set(f.apply(null, [this.get()].concat(args)));
    },
    lens (lensDescriptor) {
      havelock.lens(this, lensDescriptor);
    }
  }
};
