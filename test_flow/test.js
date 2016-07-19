 /**
  * @flow
  */

import type {Atom} from 'derivable';
import {atom} from 'derivable';

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
