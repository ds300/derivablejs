import {Atom} from '../src-ts/atom'

const a = new Atom(5);

console.log("a is 5:", a.get());

const twoa = a.derive(a => a * 2);

console.log("twoa is 10:", twoa.get());

console.log("a is still 5:", a.get());
