/**
 *  Copyright (c) 2015, David Sheldrick.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import Set from './set'

/*== Parents Capturing ==*/
const parentsStack = [];

export function capturingParents(f) {
  parentsStack.push(new Set());
  f();
  return parentsStack.pop();
}

export function maybeCaptureParent(p) {
  if (parentsStack.length > 0) {
    parentsStack[parentsStack.length - 1].add(p);
  }
}
