'use strict';

const derivable = require('../dist/derivable');

const util = require('./util');

describe("a derivation", () => {
  const oneGigabyte = 1024 * 1024 * 1024;
  const bytes = derivable.atom(oneGigabyte);
  let kiloBytes = void 0;
  let megaBytes = void 0;

  const orderUp = (n, ...args) => {
    const order = args.length === 0 || args[0] === undefined ? 1 : args[0];
    return order > 0 ? orderUp(n / 1024, order - 1) : n;
  };

  it("can be created via the Atom.derive(f) method", () => {
    kiloBytes = bytes.derive(orderUp);
    expect(kiloBytes.get()).toBe(1024 * 1024);
  });

  it("can also be created via the derive function in the derivable package", () => {
    megaBytes = derivable.derive(() => orderUp(kiloBytes.get()));
    expect(megaBytes.get()).toBe(1024);
  });

  it("can derive from more than one atom", () => {
    const order = util.label(derivable.atom(0), "O");
    const orderName = util.label(order.derive(d => ["bytes", "kilobytes", "megabytes", "gigabytes"][d]), "ON");
    const size = util.label(bytes.derive(d => orderUp(d, order.get())), "!size!");
    const sizeString = derivable.derive(() => `${size.get()} ${orderName.get()}`);

    // size is in bytes when order is 0
    expect(size.get()).toBe(bytes.get());
    expect(sizeString.get()).toBe(bytes.get() + " bytes");
    order.set(1);
    // size is in kbs when order is 1
    expect(size.get()).toBe(kiloBytes.get());
    expect(sizeString.get()).toBe(kiloBytes.get() + " kilobytes");
    order.set(2);
    // size is in mbs when order is 2
    expect(size.get()).toBe(megaBytes.get());
    expect(sizeString.get()).toBe(megaBytes.get() + " megabytes");
    order.set(3);
    // size is in gbs when order is 2
    expect(size.get()).toBe(1);
    expect(sizeString.get()).toBe("1 gigabytes");
  });

  it('can be re-instantiated with custom equality-checking', () => {
    const a = derivable.atom(5);
    const amod2map = a.derive(d => ({ a: d % 2 }));

    let numReactions = 0;
    amod2map.react(() => {
      numReactions++;
    }, { skipFirst: true });

    expect(numReactions).toBe(0);
    a.set(7);
    expect(numReactions).toBe(1);
    a.set(9);
    expect(numReactions).toBe(2);
    a.set(11);
    expect(numReactions).toBe(3);

    const amod2map2 = a
      .derive(d => ({ a: d % 2 }))
      .withEquality((_ref, _ref2) => _ref.a === _ref2.a);

    let numReactions2 = 0;
    amod2map2.react(() => {
      numReactions2++;
    }, { skipFirst: true });

    expect(numReactions2).toBe(0);
    a.set(7);
    expect(numReactions2).toBe(0);
    a.set(9);
    expect(numReactions2).toBe(0);
    a.set(11);
    expect(numReactions2).toBe(0);
  });
});

describe("the derive method", () => {
  it("throws when given no aguments", () => {
    expect(() => {
      derivable.atom(null).derive();
    }).toThrow();
  });

  it('can\'t derive with some kinds of things', () => {
    expect(() => {
      derivable.atom("blah").derive(new Date());
    }).toThrow();
  });
});

describe("maybeDerive", () => {
  it('is like derive, but propagates nulls', () => {
    const thing = derivable.atom({ prop: 'val' });
    const val = thing.maybeDerive(d => d.prop);

    expect(val.get()).toBe('val');
    thing.set(null);
    expect(val.get() == null).toBeTruthy();

    const foo = thing.maybeDerive(d => d.foo);
    const bar = thing.maybeDerive(d => d.bar);

    expect(foo.get()).toBe(null);
    expect(bar.get()).toBe(null);

    thing.set({ foo: 'FOO!', bar: 'BAR!' });

    expect(foo.get()).toBe('FOO!');
    expect(bar.get()).toBe('BAR!');
  });
});

describe("derivations inside a transaction", () => {
  it("can take on temporary values", () => {
    const a = derivable.atom(0);
    const plusOne = a.derive(d => d + 1);

    expect(plusOne.get()).toBe(1);

    derivable.transact(abort => {
      a.set(1);
      expect(plusOne.get()).toBe(2);
      abort();
    });

    expect(plusOne.get()).toBe(1);

    let thrown = null;
    try {
      derivable.transact(() => {
        a.set(2);
        expect(plusOne.get()).toBe(3);
        throw "death";
      });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBe("death");
    expect(plusOne.get()).toBe(1);
  });
  it('can take on temporary values even in nested transactions', () => {
    const a = derivable.atom(0);
    const plusOne = a.derive(d => d + 1);

    expect(plusOne.get()).toBe(1);

    derivable.transact(abort1 => {
      a.set(1);
      expect(plusOne.get()).toBe(2);
      derivable.transact(abort2 => {
        a.set(2);
        expect(plusOne.get()).toBe(3);
        derivable.transact(abort3 => {
          a.set(3);
          expect(plusOne.get()).toBe(4);
          abort3();
        });
        expect(plusOne.get()).toBe(3);
        abort2();
      });
      expect(plusOne.get()).toBe(2);
      abort1();
    });
    expect(plusOne.get()).toBe(1);
  });

  it('can be dereferenced in nested transactions', () => {
    const a = derivable.atom(0);
    const plusOne = a.derive(d => d + 1);

    expect(plusOne.get()).toBe(1);

    derivable.transact(() => {
      expect(plusOne.get()).toBe(1);
      derivable.transact(() => {
        expect(plusOne.get()).toBe(1);
        derivable.transact(() => {
          expect(plusOne.get()).toBe(1);
        });
      });
    });

    a.set(1);
    derivable.transact(() => {
      derivable.transact(() => {
        derivable.transact(() => {
          expect(plusOne.get()).toBe(2);
        });
      });
    });
  });

  it('can be mutated indirectly in nested transactions', () => {
    const a = derivable.atom(0);
    const plusOne = a.derive(d => d + 1);

    expect(plusOne.get()).toBe(1);

    derivable.transact(() => {
      derivable.transact(() => {
        derivable.transact(() => {
          a.set(1);
        });
      });
    });

    expect(plusOne.get()).toBe(2);

    derivable.transact(() => {
      derivable.transact(() => {
        derivable.transact(() => {
          a.set(2);
        });
      });
      expect(plusOne.get()).toBe(3);
    });

    derivable.transact(() => {
      derivable.transact(() => {
        derivable.transact(() => {
          a.set(3);
        });
        expect(plusOne.get()).toBe(4);
      });
    });
  });
});

describe("nested derivables", () => {
  it("should work in the appropriate fashion", () => {
    const $$A = derivable.atom(null);
    const $a = $$A.maybeDerive(d => d.get());

    expect($a.get() == null).toBeTruthy();

    const $B = derivable.atom(5);

    $$A.set($B);

    expect($a.get()).toBe(5);

    let reaction_b = null;
    $a.react(b => {
      reaction_b = b;
    }, { skipFirst: true });

    expect(reaction_b).toBe(null);

    $B.set(10);
    expect(reaction_b).toBe(10);

    $B.set(4);
    expect(reaction_b).toBe(4);

    const $C = derivable.atom(9);
    $$A.set($C);
    expect(reaction_b).toBe(9);
  });

  it("should let reactors adapt to changes in atoms", () => {
    const $$A = derivable.atom(null);
    const $a = $$A.maybeDerive(d => d.get());

    const $B = derivable.atom('junk');

    const $isJunk = $B.is('junk');

    let isJunk = null;

    $a.react(a => {
      isJunk = a;
    });

    expect(isJunk == null).toBeTruthy();

    $$A.set($isJunk);

    expect(isJunk).toBe(true);

    $B.set('not junk');
    expect(isJunk).toBe(false);
  });

  it("should not interfere with lifecycle control", () => {
    const $$A = derivable.atom(null);
    const $a = $$A.maybeDerive(d => d.get());

    const $B = derivable.atom('junk');

    const $isJunk = $B.is('junk');

    let isJunk = null;

    $a.react(a => {
      isJunk = a;
    }, { when: $a });

    expect(isJunk == null).toBeTruthy();

    $$A.set($isJunk);

    expect(isJunk).toBe(true);

    $B.set('not junk');
    // still junk
    expect(isJunk).toBe(true);
  });

  it("should not interfere with boolean casting?!", () => {
    const $$Running = derivable.atom(null);
    const $running = $$Running.maybeDerive(d => d.get());

    let running = null;
    $running.derive(x => Boolean(x)).react(r => {
      running = r;
    });

    expect(!running).toBeTruthy();

    const $Running = derivable.atom(false);

    $$Running.set($Running);

    expect(!running).toBeTruthy();

    $Running.set(true);

    expect(running).toBeTruthy();
  });
});

test('derive derivable value with function', () => {
  const a = derivable.atom(1);
  const q = derivable.atom(10);
  const b = a.derive(d => d + q.get());
  const c = b.derive(d => d * q.get());
  expect([b.get(), c.get()]).toEqual([11, 110]);

  q.set(20);
  expect([b.get(), c.get()]).toEqual([21, 420]);

  a.set(null);
  expect([b.get(), c.get()]).toEqual([20, 400]);

  expect(() => {
    derivable.map();
  }).toThrow();
});

test('maybe derive derivable (non-null) value with function', () => {
  const a = derivable.atom(1);
  const q = derivable.atom(10);
  const b = a.maybeDerive(d => d + q.get());
  const c = b.maybeDerive(d => d * q.get());
  expect([b.get(), c.get()]).toEqual([11, 110]);

  q.set(20);
  expect([b.get(), c.get()]).toEqual([21, 420]);

  a.set(null);
  expect([b.get(), c.get()]).toEqual([null, null]);

  expect(() => {
    derivable.map();
  }).toThrow();
});

test('is method', () => {
  const a = derivable.atom(1);
  const b = derivable.atom(1);
  const fst = a.is(b);
  const snd = b.is(a);
  expect(fst.get()).toBeTruthy();
  expect(snd.get()).toBeTruthy();

  a.set({ equals: () => true });
  b.set({ equals: () => false });
  expect(fst.get()).toBeTruthy();
  expect(snd.get()).toBeFalsy();
});

test('maybe default prefers passed value or derivable over null or undefined', () => {
  const a = derivable.atom(null);
  const r = a.orDefault(2);
  expect(r.get()).toBe(2);

  a.set(1);
  expect(r.get()).toBe(1);
});
