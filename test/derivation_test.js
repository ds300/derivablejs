import _, {atom, derive, transact} from '../src/havelock';
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
});
