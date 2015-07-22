/**
 *  Copyright (c) 2015, David Sheldrick.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import Havelock from './havelock-module'

const havelock = Havelock();

export function withEquality (equals) {
  return Havelock({equals});
}

const r = havelock.Reaction;

export { r as Reaction };

const {
  isAtom,
  isDerivation,
  isLens,
  isReaction,
  isDerivable,
  transact,
  atom,
  swap,
  derive,
  lens,
  unpack,
  lift,
  set,
  get,
  struct,
  ifThenElse,
  or,
  and,
  not,
  switchCase
} = havelock;

export {
  isAtom,
  isDerivation,
  isLens,
  isReaction,
  isDerivable,
  transact,
  atom,
  swap,
  derive,
  lens,
  unpack,
  lift,
  set,
  get,
  struct,
  ifThenElse,
  or,
  and,
  not,
  switchCase
};

export default havelock;
