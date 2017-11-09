 /**
  * @flow
  */

import type {Atom, Derivable} from 'derivable';
import {atom, transaction, atomic, derive} from 'derivable';

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
}

function testMaybeDerivations() {

  const maybeA: Atom<?number> = atom(null);

  const maybeB: Derivable<number> = maybeA.mDerive(value => value * 2);

  const maybeC: Derivable<[number]> = maybeA.mDerive([
    value => value * 1
  ]);

  const maybeD: Derivable<[number, boolean]> = maybeA.mDerive([
    value => value * 1,
    value => Boolean(value)
  ]);

  const maybeE: Derivable<[number, boolean, string]> = maybeA.mDerive([
    value => value * 1,
    value => Boolean(value),
    value => String(value)
  ]);

  const maybeF: Derivable<[number, boolean, string, number]> = maybeA.mDerive([
    value => value * 1,
    value => Boolean(value),
    value => String(value),
    value => value * 2
  ]);

  const maybeG: Derivable<[number, boolean, string, number, number]> = maybeA.mDerive([
    value => value * 1,
    value => Boolean(value),
    value => String(value),
    value => value * 2,
    value => value * 3
  ]);

  // $ExpectError: value is a number
  const maybeH: Derivable<number> = maybeA.mDerive(value => value + '');
}

function testReactions() {

  let c: Atom<?{x: number}> = atom(null);
  const condition = atom(true);

  c.react(v => {
    // $ExpectError: v might be null
    console.log(v.x);
  });

  c.react(v => {}, {
    from: d => {
      const v = d.get();
      // $ExpectError: v might be null
      return Boolean(v.x);
    },
    when: d => {
      const v = d.get();
      // $ExpectError: v might be null
      return Boolean(v.x);
    },
    until: d => {
      const v = d.get();
      // $ExpectError: v might be null
      return Boolean(v.x);
    },
    skipFirst: true,
    once: false,
  });

  c.mReact(v => {
    console.log(v.x);
  });

  c.mReact(v => {}, {
    from: condition,
    when: condition,
    until: condition,
    skipFirst: true,
    once: false,
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

function testDerive() {

  let plusOne = (a: number) => a + 1;
  let add = (a: number, b: number) => a + b;

  let dTwentyTwo: Derivable<number> = derive(plusOne, atom(21));
  let dTwentyThree: Derivable<number> = derive(plusOne, 22);

  // $ExpectError: expected a number or Derivable<number>
  derive(plusOne, 'oops');

  // $ExpectError: expected a number or Derivable<number>
  derive(plusOne, atom('oops'));

  let dFour: Derivable<number> = derive(add, atom(2), atom(2));
  let dFive: Derivable<number> = derive(add, 2, 3);
  let dSix: Derivable<number> = derive(add, 3, atom(3));

  // $ExpectError: expected a number or Derivable<number>
  derive(add, false, 21);

  // $ExpectError: expected a number or Derivable<number>
  derive(add, atom(false), 21);

}

function testWithEquality() {

  let a: Atom<{x: number}> = atom({x: 42})
  let b: Derivable<{x: number}> = a.withEquality((a, b) => {
    return a.x === b.x;
  });
  let c: Derivable<{x: number}> = a.withEquality((a, b) => {
    // $ExpectError: y does not exist
    return a.y === b.y;
  });
}
