/**
 *  Copyright (c) 2015, David Sheldrick.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

// node modes
export const NEW = 0;
export const CHANGED = 1;
export const UNCHANGED = 2;
export const ORPHANED = 3;
export const UNSTABLE = 4;
export const STABLE = 5;
export const DISOWNED = 6;

// core types
export const ATOM = Symbol("ATOM");
export const DERIVATION = Symbol("DERIVATION");
export const LENS = Symbol("LENS");
export const REACTION = Symbol("REACTION");


export function mark(node, reactions) {
  if (node._type === REACTION) {
    reactions.push(node);
  } else {
    for (let child of node._children) {
      if (child._mode !== UNSTABLE) {
        child._mode = UNSTABLE;
        mark(child, reactions);
      }
    }
  }
}

export function sweep(node) {
  switch (node._mode) {
  case CHANGED:
  case UNCHANGED:
    for (let child of node._children) {
      sweep(child);
    }
    node._mode = STABLE;
    break;
  case UNSTABLE:
    let stashedParentStates = [];
    for (let parent of node._parents) {
      if (parent._mode === CHANGED) {
        node._mode = ORPHANED;
      }
      parent._children.remove(node);
      stashedParentStates.push([parent, parent._state]);
    }
    if (node._mode !== ORPHANED) {
      node._mode = DISOWNED;
      node._parents = stashedParentStates;
    }
    break;
  case STABLE:
    break;
  default:
    throw new Error(`It should be impossible tosweep nodes with mode: ${node._mode}`);
  }
}
