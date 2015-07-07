import imut from 'immutable';
import {atom, derive, react, foo} from '../ratom.js';
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
  function orderUp(n, order=1) {
    if (order === 0) return n;
    else return orderUp(n / 1024, order-1);
  }
  let kiloBytes, megaBytes;
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
