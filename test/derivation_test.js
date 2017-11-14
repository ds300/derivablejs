'use strict';

const immutable = require('immutable');

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

  describe("can be created using the 'derive' function", () => {
    const add = (...args) => args.reduce((a, b) => a + b, 0);

    it('needs one argument', () => {
      expect(() => {
        derivable.derive();
      }).toThrow();
    });

    it('using one arg', () => {
      expect(derivable.derive(() => 0).get()).toBe(0);
    });

    it('using two args', () => {
      expect(derivable.derive(add, 1).get()).toBe(1);
      expect(derivable.derive(add, derivable.atom(1)).get()).toBe(1);
    });

    it('using three args', () => {
      expect(derivable.derive(add, 1, 2).get()).toBe(3);
      expect(derivable.derive(add, derivable.atom(1), derivable.atom(2)).get()).toBe(3);
    });

    it('using four args', () => {
      expect(derivable.derive(add, 1, 2, 3).get()).toBe(6);
      expect(
        derivable.derive(add, derivable.atom(1), derivable.atom(2), derivable.atom(3)).get()
      ).toBe(6);
    });

    it('using five args', () => {
      expect(derivable.derive(add, 1, 2, 3, 4).get()).toBe(10);
      expect(
        derivable.derive(add, derivable.atom(1), derivable.atom(2), derivable.atom(3), 4).get()
      ).toBe(10);
    });

    it('using six args', () => {
      expect(derivable.derive(add, 1, 2, 3, 4, 5).get()).toBe(15);
      expect(
        derivable.derive(add, derivable.atom(1), derivable.atom(2), derivable.atom(3), 4, 5).get()
      ).toBe(15);
    });

    it('using seven args', () => {
      expect(derivable.derive(add, 1, 2, 3, 4, 5, 6).get()).toBe(21);
      expect(derivable.derive(add, derivable.atom(1), derivable.atom(2),
        derivable.atom(3), 4, 5, derivable.atom(6)).get()).toBe(21);
    });

    it('with a template string', () => {
      const a = derivable.atom('a');
      const b = 'b';
      const derivation = derivable.derive`a: ${a}, b: ${b}`;

      expect(derivation.get()).toBe('a: a, b: b');
    });

  });

  it("can derive from more than one atom", () => {
    const order = util.label(derivable.atom(0), "O");
    const orderName = util.label(order.derive(d => ["bytes", "kilobytes", "megabytes", "gigabytes"][d]), "ON");
    const size = util.label(bytes.derive(orderUp, order), "!size!");
    const sizeString = derivable.derive`${size} ${orderName}`;

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

  it("implements the derivable interface", () => {
    const name = derivable.atom("smithe");
    const size6 = name.derive(x => x.length === 6);
    const startsWithS = name.derive(x => x[0] === "s");
    const endsWithE = name.derive(x => x[x.length - 1] === "e");

    expect(size6.get()).toBe(true);
    expect(startsWithS.get()).toBe(true);
    expect(endsWithE.get()).toBe(true);

    name.set("smithy");

    expect(size6.get()).toBe(true);
    expect(startsWithS.get()).toBe(true);
    expect(endsWithE.get()).toBe(false);

    const nestedStuff = derivable.atom(immutable.fromJS({ a: { b: { c: false } } }));
    const get = (x, y) => x.get(y);
    const innermost = nestedStuff.mDerive(get, 'a').mDerive(get, 'b').mDerive(get, 'c').derive(d => d == null ? 'not found' : d);

    expect(innermost.get()).toBe(false);

    nestedStuff.set(immutable.fromJS({ a: { b: { c: 'found' } } }));

    expect(innermost.get()).toBe('found');

    nestedStuff.set(immutable.fromJS({ a: { b: { d: 'd' } } }));

    expect(innermost.get()).toBe('not found');

    nestedStuff.set(immutable.fromJS({ a: { d: { d: 'd' } } }));

    expect(innermost.get()).toBe('not found');

    nestedStuff.set(immutable.fromJS({ d: { d: { d: 'd' } } }));

    expect(innermost.get()).toBe('not found');

    nestedStuff.set(null);

    expect(innermost.get()).toBe('not found');
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

  it('can derive with derivable functions', () => {
    const $Deriver = derivable.atom(n => n * 2);

    const $A = derivable.atom(4);

    const $b = $A.derive($Deriver);

    expect($b.get()).toBe(8);

    $Deriver.set(n => n / 2);

    expect($b.get()).toBe(2);
  });

  it('can\'t derive with some kinds of things', () => {
    expect(() => {
      derivable.atom("blah").derive(new Date());
    }).toThrow();
  });

  it('can\'t derive with some kinds of derivable things', () => {
    const $Deriver = derivable.atom(new Date());

    const $A = derivable.atom("29892funtimes232");

    const $b = $A.derive($Deriver);

    expect(() => {
      $b.get();
    }).toThrow();
  });

  const add = (...args) => args.reduce((a, b) => a + b, 0);

  it('can work with three args', () => {
    expect(derivable.atom(1).derive(add, 2, 3).get()).toBe(6);
    expect(derivable.atom(1).derive(add, derivable.atom(2), derivable.atom(3)).get()).toBe(6);
  });

  it('can work with four args', () => {
    expect(derivable.atom(1).derive(add, 2, 3, 4).get()).toBe(10);
    expect(
      derivable.atom(1).derive(add, derivable.atom(2), derivable.atom(3), 4).get()
    ).toBe(10);
  });

  it('can work with five args', () => {
    expect(derivable.atom(1).derive(add, 2, 3, 4, 5).get()).toBe(15);
    expect(
      derivable.atom(1).derive(add, derivable.atom(2), derivable.atom(3), 4, 5).get()
    ).toBe(15);
  });
  it('can work with six args', () => {
    expect(derivable.atom(1).derive(add, 2, 3, 4, 5, 6).get()).toBe(21);
    expect(
      derivable.atom(1).derive(add, derivable.atom(2), derivable.atom(3), 4, 5, derivable.atom(6)).get()
    ).toBe(21);
  });
  it('can work with seven args', () => {
    expect(derivable.atom(1).derive(add, 2, 3, 4, 5, 6, 7).get()).toBe(28);
    expect(
      derivable.atom(1).derive(add, derivable.atom(2), derivable.atom(3), 4, 5, derivable.atom(6), derivable.atom(7)).get()
    ).toBe(28);
  });
});

describe("mDerive", () => {
  it('is like derive, but propagates nulls', () => {
    const thing = derivable.atom({ prop: 'val' });
    const val = thing.mDerive(d => d.prop);

    expect(val.get()).toBe('val');
    thing.set(null);
    expect(val.get() == null).toBeTruthy();

    const _thing$mDerive = thing.mDerive([d => d.foo, d => d.bar]);

    const foo = _thing$mDerive[0];
    const bar = _thing$mDerive[1];

    expect(foo.get() == null).toBeTruthy();
    expect(bar.get() == null).toBeTruthy();

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
    const $a = $$A.mDerive(d => d.get());

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
    const $a = $$A.mDerive(d => d.get());

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
    const $a = $$A.mDerive(d => d.get());

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
    const $running = $$Running.mDerive(d => d.get());

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
