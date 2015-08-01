import _, {atom, derive, transact} from '../dist/havelock';
import assert from 'assert';
import { label } from './util';

describe("a derivation", () => {
  const oneGigabyte = 1024 * 1024 * 1024;
  const bytes = atom(oneGigabyte);
  let kiloBytes, megaBytes;

  const orderUp = (n, order=1) => {
    return order > 0 ? orderUp(n / 1024, order-1) : n
  };

  it("can be created via the Atom.derive(f) method", () => {
    kiloBytes = bytes.derive(orderUp);
    assert.strictEqual(kiloBytes.get(), 1024 * 1024)
  });

  it("can also be created via the derive function in the ratom package", () => {
    megaBytes = derive(() => orderUp(kiloBytes.get()));
    assert.strictEqual(megaBytes.get(), 1024);
  });

  it("can derive from more than one atom", () => {
    const order = label(atom(0), "O");
    const orderName = label(order.derive(order => {
      return (["bytes", "kilobytes", "megabytes", "gigabytes"])[order];
    }), "ON");
    const size = label(derive(bytes, order, orderUp), "!size!");
    const sizeString = derive`${size} ${orderName}`;

    assert.strictEqual(size.get(), bytes.get(), "size is in bytes when order is 0");
    assert.strictEqual(sizeString.get(), bytes.get() + " bytes");
    order.set(1);
    assert.strictEqual(size.get(), kiloBytes.get(), "size is in kbs when order is 1");
    assert.strictEqual(sizeString.get(), kiloBytes.get() + " kilobytes");
    order.set(2);
    assert.strictEqual(size.get(), megaBytes.get(), "size is in mbs when order is 2");
    assert.strictEqual(sizeString.get(), megaBytes.get() + " megabytes");
    order.set(3);
    assert.strictEqual(size.get(), 1, "size is in gbs when order is 2");
    assert.strictEqual(sizeString.get(), "1 gigabytes");
  });

  it("implements the derivable interface", () => {
    let name = atom("smithe");
    let size6 = name.derive(x => x.length === 6);
    let startsWithS = name.derive(x => x[0] === "s");
    let endsWithE = name.derive(x => x[x.length-1] === "e");

    assert.strictEqual(size6.get(), true, "has length 6");
    assert.strictEqual(startsWithS.get(), true, "starts with s");
    assert.strictEqual(endsWithE.get(), true, "ends wth e");

    let isSmithe = name.is(atom("smithe"));

    assert.strictEqual(isSmithe.get(), true, "is smithe");

    let size6orE = size6.or(endsWithE);
    let size6andE = size6.and(endsWithE);
    let sOrE = startsWithS.or(endsWithE);
    let sAndE = startsWithS.and(endsWithE);

    assert.strictEqual(size6orE.get(), true);
    assert.strictEqual(size6andE.get(), true);
    assert.strictEqual(sOrE.get(), true);
    assert.strictEqual(sAndE.get(), true);

    name.set("smithy");

    assert.strictEqual(size6.get(), true, "has length 6");
    assert.strictEqual(startsWithS.get(), true, "starts with s");
    assert.strictEqual(endsWithE.get(), false, "ends wth y");

    assert.strictEqual(isSmithe.get(), false, "is not smithe");

    assert.strictEqual(size6orE.get(), true);
    assert.strictEqual(size6andE.get(), false);
    assert.strictEqual(sOrE.get(), true);
    assert.strictEqual(sAndE.get(), false);

    assert.strictEqual(size6orE.not().get(), false);
    assert.strictEqual(size6andE.not().get(), true);
    assert.strictEqual(sOrE.not().get(), false);
    assert.strictEqual(sAndE.not().get(), true);

    assert.strictEqual(size6orE.not().not().get(), true);
    assert.strictEqual(size6andE.not().not().get(), false);
    assert.strictEqual(sOrE.not().not().get(), true);
    assert.strictEqual(sAndE.not().not().get(), false);


    let x = startsWithS.then(
      () => assert(true, "smithy starts with s"),
      () => assert(false, "smithy what?")
    ).get()();


    endsWithE.then(
      () => assert(false, "smithy doesn't end in e?!"),
      () => assert(true, "smithy ends in y yo")
    ).get()();

    let firstLetter = name.derive(x => x[0]);

    firstLetter.switch(
      "a", () => assert(false, "smithy doesn't start with a"),
      "b", () => assert(false, "smithy doesn't start with b"),
      "s", () => assert(true, "smithy starts with s")
    ).get()();

    it("allows a default value", done => {
      firstLetter.switch(
        "a", () => assert(false, "smithy doesn't start with a"),
        "b", () => assert(false, "smithy doesn't start with b"),
        "x", "blah",
        () => assert(true, "yay")
      ).get()();
    });
  });
});
