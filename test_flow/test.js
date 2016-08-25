 /**
  * @flow
  */

import type {Atom, Derivable} from 'derivable';
import {atom} from 'derivable';

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
