import Havelock from './havelock-module'

const havelock = Havelock();

export function withEquality (equals) {
  return Havelock({equals});
};

const {
  isAtom,
  isDerivation,
  isLens,
  isReaction,
  isDerivable,
  Reaction,
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
  switchCase,
} = havelock;

export {
  isAtom,
  isDerivation,
  isLens,
  isReaction,
  isDerivable,
  Reaction,
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
  switchCase,
};

export default havelock;
