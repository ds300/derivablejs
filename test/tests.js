import imut from 'immutable';
import _, {atom, derive, transact} from '../ratom.js';
import assert from 'assert';

describe("the humble atom", () => {
  const n = atom(0);

  it("can be dereferenced via .get to obtain its current state", () => {
    assert.equal(n.get(), 0);
  });

  it("can be .set to change its current state", () => {
    n.set(1);
    assert.equal(n.get(), 1);
  });

  it("can be .swap-ped a la clojure", () => {
    const double = x => x * 2;
    n.swap(double);
    assert.equal(n.get(), 2);
    n.swap(double);
    assert.equal(n.get(), 4);
    n.swap(double);
    assert.equal(n.get(), 8);
  });
});

describe("a derivation", () => {
  const oneGigabyte = 1024 * 1024 * 1024;
  const bytes = atom(oneGigabyte);
  let kiloBytes, megaBytes;

  const orderUp = (n, order=1) => order > 0 ? orderUp(n / 1024, order-1) : n;

  it("can be created via the Atom.derive(f) method", () => {
    kiloBytes = bytes.derive(orderUp);
    assert.equal(kiloBytes.get(), 1024 * 1024)
  });

  it("can also be created via the derive function in the ratom package", () => {
    megaBytes = derive(() => orderUp(kiloBytes.get()));
    assert.equal(megaBytes.get(), 1024);
  });

  it("can derive from more than one atom", () => {
    const order = atom(0);
    const orderName = order.derive(order => {
      return (["bytes", "kilobytes", "megabytes", "gigabytes"])[order];
    });
    const size = derive(bytes, order, orderUp);
    const sizeString = derive`${size} ${orderName}`;

    assert.equal(size.get(), bytes.get(), "size is in bytes when order is 0");
    assert.equal(sizeString.get(), bytes.get() + " bytes");
    order.set(1);
    assert.equal(size.get(), kiloBytes.get(), "size is in kbs when order is 1");
    assert.equal(sizeString.get(), kiloBytes.get() + " kilobytes");
    order.set(2);
    assert.equal(size.get(), megaBytes.get(), "size is in mbs when order is 2");
    assert.equal(sizeString.get(), megaBytes.get() + " megabytes");
    order.set(3);
    assert.equal(size.get(), 1, "size is in gbs when order is 2");
    assert.equal(sizeString.get(), "1 gigabytes");
  });
});


describe("a reaction", () => {
  let counter = atom(0);
  let inc = n => n+1
  let history = imut.List();
  let action = null;
  let reaction = counter.react(function (n) {
    reaction && assert.equal(this, reaction, "`this` is bound to the reaction");
    history = history.push(n);
    action && action();
  });

  function checkHistory(expected, msg) {
    expected = imut.List(expected);
    if (!history.equals(expected)) {
      assert.fail(history.toString(), expected.toString(), msg);
    }
  }

  it("is like a derivation with no value, only reacting to changes", done => {
    checkHistory([0], "it is evaluated at construction time");

    action = () => {
      if (history.size === 3) {
        checkHistory(imut.List([0, 1, 2]), "history is generated sequentially");
        done();
      }
    }

    counter.swap(inc);
    counter.swap(inc);
  });

  it("can be suspended via the .stop method", () => {
    checkHistory(imut.List([0, 1, 2]), "history hasn't changed");
    // make sure it still works
    counter.swap(inc);
    checkHistory(imut.List([0, 1, 2, 3]), "history has changed");
    // now check it stops
    reaction.stop();
    counter.swap(inc); // now 4 but shouldn't get put in history

    checkHistory(imut.List([0, 1, 2, 3]), "history hasn't changud again");
  });

  it("can be restarted again via the .start method", () => {
    // check it hasn't changed
    checkHistory(imut.List([0, 1, 2, 3]), "history hasn't changed yet again");
    // check it still isn't changing
    counter.swap(inc); // now 5 but shouldn't get put in history
    checkHistory(imut.List([0, 1, 2, 3]), "history hasn't changed yet again 2");
    reaction.start(); // restart but don't force
    checkHistory(imut.List([0, 1, 2, 3]), "no history change 3");
    counter.swap(inc); // now 6 but should get put in history
    checkHistory(imut.List([0, 1, 2, 3, 6]), "history changed again!");
  });

  it("won't be evaluated in a transaction", () => {
    checkHistory(imut.List([0, 1, 2, 3, 6]), "no change 1");
    transact(() => {
      checkHistory(imut.List([0, 1, 2, 3, 6]), "no change 2");
      counter.swap(inc); // now 7
      checkHistory(imut.List([0, 1, 2, 3, 6]), "no change 3");
      counter.swap(inc); // now 8
      checkHistory(imut.List([0, 1, 2, 3, 6]), "no change 4");
    });
    // now transaction commits and 8 gets added
    checkHistory(imut.List([0, 1, 2, 3, 6, 8]), "eight");
  });
});

describe("the `struct` function", () => {
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

describe("boolean logic", () => {
  it("is well understood", () => {
    let a = atom(true),
        b = atom(true),
        aANDb = _.and(a, b),
        aORb = _.or(a, b),
        NOTa = _.not(a);

    assert.equal(aANDb.get(), true, "true & true = true");
    assert.equal(aORb.get(), true, "true | true = true");
    assert.equal(NOTa.get(), false, "!true = false")

    b.set(false);

    assert.equal(aANDb.get(), false, "true & false = false");
    assert.equal(aORb.get(), true, "true | false = true");

    a.set(false);

    assert.equal(aANDb.get(), false, "false & false = false");
    assert.equal(aORb.get(), false, "false | false = false");
    assert.equal(NOTa.get(), true, "!false = true");
  });
});

describe("control flow", () => {
  it ("allows different paths to be taken depending on conditions", () => {
    let number = atom(0);
    let even = number.derive(n => n % 2 === 0);

    let message = _.if(even, "even", "odd");

    assert.equal(message.get(), "even");

    number.set(1);

    assert.equal(message.get(), "odd");
  });

  it("doesn't evaluate untaken paths", () => {
    let number = atom(0);
    let even = number.derive(n => n % 2 === 0);

    let dideven = false;
    let didodd = false;

    let chooseAPath = _.if(even,
      derive(() => {
        dideven = true;
      }),
      derive(() => {
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

    let result = _.switch(thing,
      "Banana", "YUMMY",
      532,      "FiveThreeTwo",
      "Tigran", "Hamasayan"
    );

    assert.equal("Hamasayan", result.get());

    thing.set("Banana");

    assert.equal("YUMMY", result.get());

    thing.set(532);

    assert.equal("FiveThreeTwo", result.get());

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

    let chooseAPath = _.switch(switcheroo,
      conda, derive(() => dida = true),
      condb, derive(() => didb = true),
      condc, derive(() => didc = true),
      //else
      derive(() => didx = true)
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
