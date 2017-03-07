 /**
  * @flow
  */

import type {Atom, Derivable} from 'derivable';
import {atom, transaction, atomic, lift} from 'derivable';

function testDerivations() {

  let a: Atom<number> = atom(21);

  // $ExpectError
  a.set('ok');

  // $ExpectError
  let c: string = a.get();

  a.set(42);

  let b = a.derive(v => v * 2);

  // $ExpectError
  let d: string = b.get();

  let e: number = b.get();

  let maybeA: Atom<?number> = atom(null);

  // $ExpectError: value might be null
  maybeA.derive(value => value * 2);

  let maybeAx2: Derivable<?number> = maybeA.mDerive(value => value * 2);
}

function testReactions() {

  let c: Atom<?{x: number}> = atom(null);

  c.react(v => {
    // $ExpectError: v might be null
    console.log(v.x);
  });

  c.mReact(v => {
    console.log(v.x);
  });
}

function testLogicComb() {

  let a = atom(true);
  let and: Derivable<boolean> = a.and(atom(false));
  let mAnd: Derivable<boolean> = a.mAnd(atom(false));
  let or: Derivable<boolean> = a.or(atom(false));
  let mOr: Derivable<boolean> = a.mOr(atom(false));
  let not: Derivable<boolean> = a.not();

}

function testThen() {

  let a = atom(42);
  let b: Derivable<string | boolean> = a.then('ok', false);
  let c: Derivable<string | boolean> = a.mThen('ok', false);
}

function testTransaction() {

  let plusOne = (a: number) => a + 1;

  let tPlusOne = transaction(plusOne);

  let aPlusOne = atomic(plusOne);

  let twentyTwo: number = tPlusOne(21);
  let twentyThree: number = aPlusOne(22);

  let add = (a: number, b: number) => a + b;

  let tAdd = transaction(add);
  let aAdd = atomic(add);

  let four: number = tAdd(2, 2);
  let five: number = tAdd(2, 2);

  // $ExpectError: arg should be a function
  transaction(42);

  // $ExpectError: arg should be a function
  atomic('oops');

}

function testLift() {

  let plusOne = (a: number) => a + 1;
  let add = (a: number, b: number) => a + b;

  let dPlusOne = lift(plusOne);
  let dTwentyTwo: Derivable<number> = dPlusOne(atom(21));
  let dTwentyThree: Derivable<number> = dPlusOne(22);

  // $ExpectError: expected a number or Derivable<number>
  dPlusOne('oops');

  // $ExpectError: expected a number or Derivable<number>
  dPlusOne(atom('oops'));

  let dAdd = lift(add);
  let dFour: Derivable<number> = dAdd(atom(2), atom(2));
  let dFive: Derivable<number> = dAdd(2, 3);
  let dSix: Derivable<number> = dAdd(3, atom(3));

  // $ExpectError: expected a number or Derivable<number>
  dAdd(false, 21);

  // $ExpectError: expected a number or Derivable<number>
  dAdd(atom(false), 21);

}

function testWithEquality() {

  let a: Atom<{x: number}> = atom({x: 42})
  let b: Derivable<{x: number}> = a.withEquality((a, b) => {
    return a && b && typeof a === 'object' && typeof b === 'object' && a.x === b.x;
  });
}
