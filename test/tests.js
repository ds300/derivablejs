import imut from 'immutable';
import {atom, derive, react, transact} from '../ratom.js';
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
    reaction.start(); // 5 does get put in the history now
    checkHistory(imut.List([0, 1, 2, 3, 5]), "history changed! at last!");
    counter.swap(inc); // now 6 but should get put in history
    checkHistory(imut.List([0, 1, 2, 3, 5, 6]), "history changed again!");
  });

  it("won't be evaluated in a transaction", () => {
    checkHistory(imut.List([0, 1, 2, 3, 5, 6]), "no change 1");
    transact(() => {
      checkHistory(imut.List([0, 1, 2, 3, 5, 6]), "no change 2");
      counter.swap(inc); // now 7
      checkHistory(imut.List([0, 1, 2, 3, 5, 6]), "no change 3");
      counter.swap(inc); // now 8
      checkHistory(imut.List([0, 1, 2, 3, 5, 6]), "no change 4");
    });
    // now transaction commits and 8 gets added
    checkHistory(imut.List([0, 1, 2, 3, 5, 6, 8]), "eight");
  });

  // TODO
  // note to self: the issue of quietly beginning a reaction is a thorny one.
  // The reaction needs to know about it's parents a priori for it to work.
  // This can be done easily with .react methods, but not the react(f) function.
  // It is actually just an api issue. I can sort it out.
});
