import Set from '../src/set'
import assert from 'assert';

const uniqueThing = n => {
  return {
    _uid: Symbol("blah"),
    n
  };
}

const things = [];
for (let i=0; i<1000; i++) {
  things.push(uniqueThing(i));
}

const allTrue = a => {
  for (let i =0 ;i < a.length; i++) {
    if (!a[i]) {
      return false;
    }
  }
  return true;
}

describe('sets', () => {
  let s = new Set();
  it('can have things added to them', () => {
    for (let i=0; i<things.length; i++) {
      s.add(things[i]);

      let checklist = new Array(i);
      for (let item of s) {
        checklist[item.n] = true;
      }
      assert(allTrue(checklist), `all true ${i}`)
    }
  });
  it('can have things removed from them', () => {
    for (let i=things.length-1; i>=0; i--) {
      s.remove(things[i]);

      let checklist = new Array(i);
      for (let item of s) {
        checklist[item.n] = true;
      }
      assert(allTrue(checklist), `all true ${i}`)
    }
  });
});
