import Havelock from './havelock-module'

const havelock = Havelock();

const {
  isAtom,
  isDerivation,
  isLens,
  isReaction,
  isDerivable,
  Reaction,
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
