import imut from 'immutable';
import _, {atom, derive, derivation, transact} from '../dist/derivable';
import assert from 'assert';

describe("the `is*` fns", () => {
  it ("just work, don't worry about it", () => {
    let a = atom(0);
    let d = a.derive(x => x * 2);
    let l = a.lens({get: x => x * 2, set: (_, x) => x / 2});
    let r = d.reactor(x => console.log(x));

    assert(_.isAtom(a), "a is an atom");
    assert(!_.isAtom(d), "d is not an atom");
    assert(_.isAtom(l), "l is an atom");
    assert(!_.isAtom(r), "r is not an atom");

    assert(!_.isDerivation(a), "a is not a derivation");
    assert(_.isDerivation(d), "d is a derivation");
    assert(_.isDerivation(l), "l is a derivation");
    assert(!_.isDerivation(r), "r is not a derivation");

    assert(!_.isLensed(a), "a is not a lens");
    assert(_.isLensed(l), "l is a lens");
    assert(!_.isLensed(d), "d is not a lens");
    assert(!_.isLensed(r), "r is not a lens");

    assert(!_.isReactor(a), "a is a reactor");
    assert(!_.isReactor(d), "d is a reactor");
    assert(!_.isReactor(l), "l is a reactor");
    assert(_.isReactor(r), "r is a reactor");

    assert(_.isDerivable(a), "a is derivable");
    assert(_.isDerivable(d), "d is derivable");
    assert(_.isDerivable(l), "l is derivable");
    assert(!_.isDerivable(r), "r is not derivable");
  });
});

describe("the `struct` function", () => {
  it ("does nothing to a deriveable", () => {
    let a = atom(0);
    let b = _.struct(a);

    assert.strictEqual(b.get(), 0);
  })
  it("turns an array of derivables into a derivable", () => {
    let fib1 = atom(0),
        fib2 = atom(1),
        fib = derivation(() => fib1.get() + fib2.get());

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

  it("only accepts plain objects or arrays", () => {
    assert.throws(() => _.struct(3));
    assert.throws(() => _.struct("blah"));
    assert.throws(() => _.struct(new Error()));
    function A() {};
    assert.throws(() => _.struct(new A()));
    assert.throws(() => _.struct(/\d+/));
  });
});


describe("boolean logic", () => {
  it("is well understood", () => {
    let a = atom(true),
        b = atom(true),
        aANDb = _.and(a, b),
        aORb = _.or(a, b),
        NOTa = _.not(a);

    assert.strictEqual(aANDb.get(), true, "true & true = true");
    assert.strictEqual(aORb.get(), true, "true | true = true");
    assert.strictEqual(NOTa.get(), false, "!true = false")

    b.set(false);

    assert.strictEqual(aANDb.get(), false, "true & false = false");
    assert.strictEqual(aORb.get(), true, "true | false = true");

    a.set(false);

    assert.strictEqual(aANDb.get(), false, "false & false = false");
    assert.strictEqual(aORb.get(), false, "false | false = false");
    assert.strictEqual(NOTa.get(), true, "!false = true");
  });

  it("is mirrored for dealing with null/undefined", () => {
    let a = atom(false),
        b = atom(false),
        aANDb = _.mIfThenElse(_.mAnd(a, b), true, false),
        aORb = _.mIfThenElse(_.mOr(a, b), true, false);

    assert.strictEqual(aANDb.get(), true, "false m& false m= true");
    assert.strictEqual(aORb.get(), true, "false m| false m= true");

    a.set(null);

    assert.strictEqual(aANDb.get(), false, "null m& false m= false");
    assert.strictEqual(aORb.get(), true, "null m| false m= true");

    b.set(null);

    assert.strictEqual(aANDb.get(), false, "null m& null m= false");
    assert.strictEqual(aORb.get(), false, "null m| null m= false");
  })
});



describe("control flow", () => {
  it ("allows different paths to be taken depending on conditions", () => {
    let number = atom(0);
    let even = number.derive(n => n % 2 === 0);

    let message = _.ifThenElse(even, "even", "odd");

    assert.strictEqual(message.get(), "even");

    number.set(1);

    assert.strictEqual(message.get(), "odd");
  });

  it("doesn't evaluate untaken paths", () => {
    let number = atom(0);
    let even = number.derive(n => n % 2 === 0);

    let dideven = false;
    let didodd = false;

    let chooseAPath = _.ifThenElse(even,
      derivation(() => {
        dideven = true;
      }),
      derivation(() => {
        didodd = true;
      })
    );

    chooseAPath.get();

    assert(dideven && !didodd, "didnt eval odd path");

    dideven = false;

    assert(!dideven && !didodd, "didnt eval anything yet1");

    number.set(1);

    assert(!dideven && !didodd, "didnt eval anything yet2");

    chooseAPath.get();

    assert(!dideven && didodd, "didnt eval even path");
  });

  it("same goes for the switch statement", () => {
    let thing = atom("Tigran");

    let result = _.switchCase(thing,
      "Banana", "YUMMY",
      532,      "FiveThreeTwo",
      "Tigran", "Hamasayan"
    );

    assert.strictEqual("Hamasayan", result.get());

    thing.set("Banana");

    assert.strictEqual("YUMMY", result.get());

    thing.set(532);

    assert.strictEqual("FiveThreeTwo", result.get());

    thing.set("nonsense");

    assert(result.get() === void 0);

    let switcheroo = atom("a");

    let dida = false,
        didb = false,
        didc = false,
        didx = false;

    let conda = atom("a"),
        condb = atom("b"),
        condc = atom("c");

    let chooseAPath = _.switchCase(switcheroo,
      conda, derivation(() => dida = true),
      condb, derivation(() => didb = true),
      condc, derivation(() => didc = true),
      //else
      derivation(() => didx = true)
    );

    assert(!dida && !didb && !didc && !didx, "did nothing yet 1");

    chooseAPath.get();
    assert(dida && !didb && !didc && !didx, "did a");

    dida = false;
    switcheroo.set("b");
    assert(!dida && !didb && !didc && !didx, "did nothing yet 2");

    chooseAPath.get();
    assert(!dida && didb && !didc && !didx, "did b");

    didb = false;
    switcheroo.set("c");
    assert(!dida && !didb && !didc && !didx, "did nothing yet 3");

    chooseAPath.get();
    assert(!dida && !didb && didc && !didx, "did b");

    didc = false;
    switcheroo.set("blubr");
    assert(!dida && !didb && !didc && !didx, "did nothing yet 4");

    chooseAPath.get();
    assert(!dida && !didb && !didc && didx, "did else");
  });
});


describe("the lift function", () => {
  it("lifts a function which operates on values to operate on derivables", () => {
    let plus = (a, b) => a + b;
    let dPlus = _.lift(plus);

    let a = atom(5);
    let b = atom(10);
    let c = dPlus(a, b);

    assert.equal(15, c.get());
  });

  it("can be used in ordinary FP stuff", () => {
    const cells = [0,1,2].map(atom);

    const add = _.lift((a, b) => a + b);

    const sum = cells.reduce(add);

    let expected = 3;
    let equalsExpected = false;
    sum.react(x => equalsExpected = x === expected);
    assert(equalsExpected);

    expected = 4;
    equalsExpected = false;
    cells[0].swap(x => x+1);
    assert(equalsExpected);
  });
});

describe("the `transact` function", () => {
  it("executes a function in the context of a transaction", () => {
    const a = atom("a"),
          b = atom("b");

    let timesChanged = 0;

    _.struct({a, b}).reactor(() => timesChanged++).start();

    assert.strictEqual(timesChanged, 0);

    const setAAndB = (a_val, b_val) => {
      a.set(a_val);
      b.set(b_val);
    };

    setAAndB("aye", "bee");

    assert.strictEqual(timesChanged, 2);
    assert.strictEqual(a.get(), "aye");
    assert.strictEqual(b.get(), "bee");

    transact(() => setAAndB("a", "b"));

    assert.strictEqual(timesChanged, 3);
    assert.strictEqual(a.get(), "a");
    assert.strictEqual(b.get(), "b");

    transact(() => setAAndB(5, 6));

    assert.strictEqual(timesChanged, 4);
    assert.strictEqual(a.get(), 5);
    assert.strictEqual(b.get(), 6);
  });
});

describe("the `transaction` function", () => {
  it("wraps a function such that its body is executed in a txn", () => {
    const a = atom("a"),
          b = atom("b");

    let timesChanged = 0;

    _.struct({a, b}).reactor(() => timesChanged++).start();

    assert.strictEqual(timesChanged, 0);

    const setAAndB = (a_val, b_val) => {
      a.set(a_val);
      b.set(b_val);
      return a_val + b_val;
    };

    assert.strictEqual(setAAndB("aye", "bee"), "ayebee");

    assert.strictEqual(timesChanged, 2);
    assert.strictEqual(a.get(), "aye");
    assert.strictEqual(b.get(), "bee");

    const tSetAAndB = _.transaction(setAAndB);

    assert.strictEqual(tSetAAndB("a", "b"), "ab");

    assert.strictEqual(timesChanged, 3);
    assert.strictEqual(a.get(), "a");
    assert.strictEqual(b.get(), "b");

    assert.strictEqual(tSetAAndB(2, 3), 5);

    assert.strictEqual(timesChanged, 4);
    assert.strictEqual(a.get(), 2);
    assert.strictEqual(b.get(), 3);
  });
});

describe("defaultEquals", () => {
  it("tests whether two values are strictly equal", () => {
    assert(_.defaultEquals(5, 5));
    assert(_.defaultEquals("buns", "buns"));
    assert(!_.defaultEquals([1,2,3], [0,1,2].map(x => x+1)));
    var x = {};
    x['a'] = 'a';
    x['b'] = 'b';
    assert(!_.defaultEquals({a: "a", b: 'b'}, x));
  });
  it("delegates to a .equals method if present", () => {
    var x = {equals: () => true};
    var y = {equals: () => false};
    assert(_.defaultEquals(x, y));
    assert(!_.defaultEquals(y, x));
  })
});


describe("the mIfThenElse function", () => {
  it("branches on the existence of a value", () => {
    assert(_.mIfThenElse(atom(null), false, true), "null doesn't exist");
    assert(_.mIfThenElse(atom(void 0), false, true), "undefined doesn't exist");
    assert(_.mIfThenElse(atom(false), true, false), "false exists");
    assert(_.mIfThenElse(atom(""), true, false), "the empty string exists");
  });

  it("should also work with normal values", () => {
    assert(_.mIfThenElse(null, false, true), "null doesn't exist");
    assert(_.mIfThenElse(void 0, false, true), "undefined doesn't exist");
    assert(_.mIfThenElse(false, true, false), "false exists");
    assert(_.mIfThenElse("", true, false), "the empty string exists");
  });
});

describe("the lookup function", () => {
  it("looks up things in other things using javascript property access", () => {

  })
})

describe("the destruct function", () => {
  it("destructures derivables", () => {
    const s = atom({a: "aye", b: "bee", c: "cee"});
    let [a, b, c] = _.destruct(s, 'a', 'b', 'c');

    assert.strictEqual(a.get(), "aye");
    assert.strictEqual(b.get(), "bee");
    assert.strictEqual(c.get(), "cee");

    // swap a and c over

    const aKey = atom('c');
    const cKey = atom('a');
    [a, b, c] = _.destruct(s, aKey, 'b', cKey);
  });
});

describe("debug mode", () => {
  it("causes derivations to store the stacktraces of their instantiation", () =>{
    const d = _.derivation(() => 0);
    assert(!d._stack);
    _.setDebugMode(true);
    const e = _.derivation(() => {throw Error()});
    assert(e._stack);
  })
});
