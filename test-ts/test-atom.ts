import {Atom, Derivation} from '../src-ts/atom'

const a = new Atom(5);

console.log("a is 5:", a.get());

const twoa = a.derive(a => a * 2);

console.log("twoa is 10:", twoa.get());

console.log("a is still 5:", a.get());

const r = twoa.reactor(a2 => console.log("twoa is now: ", a2));
const r2 = a.reactor(a => console.log("oh a is totally: ", a));

r2.start();

r.start();

a.set(10);

setInterval(() => {
  if (Math.random() < 0.5) {
    a.set(Math.round(Math.random() * 500));
  }
}, 1000);

// two atoms a and b
// derivation c depends on a and b
// reactor x depends on c
// reactor y depends on a
// a can be null, and if so, x should be stopped
// without dependent reactors, i.e. relying only on start order:
//   if reactor y starts before reactor x
//      if atoms b and a are changed in a transaction but b's reactors
//      are processed first, nullpointerexception
{
  const a = new Atom(null), b = new Atom(4);
  const c = new Derivation(() => a.get() + b.get());
  const x = c.reactor(c => console.log(c));
  const y = a.reactor(a => {
    if (a !== null) {
      x.start();
    } else {
      x.stop();
    }
  });
}
