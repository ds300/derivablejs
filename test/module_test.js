import imut from 'immutable';
import _, {atom, derive, transact} from '../src/havelock';
import assert from 'assert';

describe("the `is*` fns", () => {
  it ("just work, don't worry about it", () => {
    let a = atom(0);
    let d = a.derive(x => x * 2);
    let l = a.lens({get: x => x * 2, set: (_, x) => x / 2});
    let r = d.reaction(x => console.log(x));

    assert(_.isAtom(a), "a is an atom");
    assert(!_.isAtom(d), "d is not an atom");
    assert(!_.isAtom(l), "l is not an atom");
    assert(!_.isAtom(r), "r is not an atom");

    assert(!_.isDerivation(a), "a is not a derivation");
    assert(_.isDerivation(d), "d is a derivation");
    assert(_.isDerivation(l), "l is a derivation");
    assert(!_.isDerivation(r), "r is not a derivation");

    assert(!_.isLens(a), "a is not a lens");
    assert(_.isLens(l), "l is a lens");
    assert(!_.isLens(d), "d is not a lens");
    assert(!_.isLens(r), "r is not a lens");

    assert(!_.isReaction(a), "a is a reaction");
    assert(!_.isReaction(d), "d is a reaction");
    assert(!_.isReaction(l), "l is a reaction");
    assert(_.isReaction(r), "r is a reaction");

    assert(_.isDerivable(a), "a is derivable");
    assert(_.isDerivable(d), "d is derivable");
    assert(_.isDerivable(l), "l is derivable");
    assert(!_.isDerivable(r), "r is not derivable");
  });
});

describe("the `struct` function", () => {
  it ("does nothing to a deriveable", () => {
    let a = atom(0);
    console.log("jambouree");
    let b = _.struct(a);

    assert.strictEqual(b.get(), 0);
  })
  it("turns an array of derivables into a derivable", () => {
    let fib1 = atom(0),
        fib2 = atom(1),
        fib = derive(() => fib1.get() + fib2.get());

    let grouped = _.struct([fib1, fib2, fib]);
    assert.deepEqual([0,1,1], grouped.get());

    fib1.set(1);
    assert.deepEqual([1,1,2], grouped.get());
  });

  it("turns a map of derivables into a derivable", () => {
    let name = atom("wilbur"),
        telephone = atom("0987654321");

    let grouped = _.struct({name, telephone});

    assert.deepEqual({name: "wilbur", telephone: "0987654321"}, grouped.get());

    name.set("Jemimah");
    telephone.set("n/a");

    assert.deepEqual({name: "Jemimah", telephone: "n/a"}, grouped.get());
  });

  it("actually turns any arbitrarily nested structure of"
     +" maybe-derivables into a derivable", () => {
    let name = atom("wilbur"),
        telephone = atom("0987654321"),
        friend1Name = atom("Sylvester"),
        friend1Telephone = atom("blub");

    let grouped = _.struct({
      name, telephone,
      blood_type: "AB Negative",
      age: 75,
      friends: [{name: friend1Name, telephone: friend1Telephone}, "others"]
    });

    let expected1 = {
      name: "wilbur",
      telephone: "0987654321",
      blood_type: "AB Negative",
      age: 75,
      friends: [{name: "Sylvester", telephone: "blub"}, "others"]
    };

    assert.deepEqual(expected1, grouped.get());

    friend1Name.set("Brittany");

    let expected2 = {
      name: "wilbur",
      telephone: "0987654321",
      blood_type: "AB Negative",
      age: 75,
      friends: [{name: "Brittany", telephone: "blub"}, "others"]
    };

    assert.deepEqual(expected2, grouped.get());
  });
});
