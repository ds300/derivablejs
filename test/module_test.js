'use strict';

const derivable = require('../dist/derivable');

describe("the `is*` fns", () => {
  it("just work, don't worry about it", () => {
    const a = derivable.atom(0);
    const d = a.derive(x => x * 2);
    const p = a.proxy({ get: x => x * 2, set: (_, x) => x / 2 });

    expect(derivable.isAtom(a)).toBeTruthy();
    expect(derivable.isAtom(d)).toBeFalsy();
    expect(derivable.isAtom(p)).toBeTruthy();

    expect(derivable.isDerivation(a)).toBeFalsy();
    expect(derivable.isDerivation(d)).toBeTruthy();
    expect(derivable.isDerivation(p)).toBeTruthy();

    expect(derivable.isProxy(a)).toBeFalsy();
    expect(derivable.isProxy(p)).toBeTruthy();
    expect(derivable.isProxy(d)).toBeFalsy();

    expect(derivable.isDerivable(a)).toBeTruthy();
    expect(derivable.isDerivable(d)).toBeTruthy();
    expect(derivable.isDerivable(p)).toBeTruthy();
  });
});

describe("the `struct` function", () => {
  it("expects a plain object or a plain array", () => {
    expect(() => {
      derivable.struct();
    }).toThrow();
    expect(() => {
      derivable.struct(53);
    }).toThrow();
    expect(() => {
      derivable.struct(new Date());
    }).toThrow();
    expect(() => {
      derivable.struct(derivable.atom(4));
    }).toThrow();
    derivable.struct({});
    derivable.struct([]);
    expect(() => {
      derivable.struct(derivable.struct({}));
    }).toThrow();
  });

  it("turns an array of derivables into a derivable", () => {
    const fib1 = derivable.atom(0);
    const fib2 = derivable.atom(1);
    const fib = derivable.derive(() => fib1.get() + fib2.get());

    const grouped = derivable.struct([fib1, fib2, fib]);
    expect([0, 1, 1]).toEqual(grouped.get());

    fib1.set(1);
    expect([1, 1, 2]).toEqual(grouped.get());
  });

  it("turns a map of derivables into a derivable", () => {
    const name = derivable.atom("wilbur");
    const telephone = derivable.atom("0987654321");

    const grouped = derivable.struct({ name, telephone });

    expect({ name: "wilbur", telephone: "0987654321" }).toEqual(grouped.get());

    name.set("Jemimah");
    telephone.set("n/a");

    expect({ name: "Jemimah", telephone: "n/a" }).toEqual(grouped.get());
  });

  it("actually turns any arbitrarily nested structure of" + " maybe-derivables into a derivable", () => {
    const name = derivable.atom("wilbur");
    const telephone = derivable.atom("0987654321");
    const friend1Name = derivable.atom("Sylvester");
    const friend1Telephone = derivable.atom("blub");

    const grouped = derivable.struct({
      name,
      telephone,
      blood_type: "AB Negative",
      age: 75,
      friends: [{ name: friend1Name, telephone: friend1Telephone }, "others"]
    });

    expect({
      name: "wilbur",
      telephone: "0987654321",
      blood_type: "AB Negative",
      age: 75,
      friends: [{ name: "Sylvester", telephone: "blub" }, "others"]
    }).toEqual(grouped.get());

    friend1Name.set("Brittany");

    expect({
      name: "wilbur",
      telephone: "0987654321",
      blood_type: "AB Negative",
      age: 75,
      friends: [{ name: "Brittany", telephone: "blub" }, "others"]
    }).toEqual(grouped.get());
  });

  it("only accepts plain objects or arrays", () => {
    expect(() => {
      derivable.struct(3);
    }).toThrow();
    expect(() => {
      derivable.struct("blah");
    }).toThrow();
    expect(() => {
      derivable.struct(new Error());
    }).toThrow();
    function A() {}
    expect(() => {
      derivable.struct(new A());
    }).toThrow();
    expect(() => {
      derivable.struct(/\d+/);
    }).toThrow();
  });
});

describe("the `transact` function", () => {
  it("executes a function in the context of a transaction", () => {
    const a = derivable.atom("a");
    const b = derivable.atom("b");

    let timesChanged = 0;

    derivable.struct({ a, b }).react(() => {
      timesChanged++;
    }, { skipFirst: true });

    expect(timesChanged).toBe(0);

    const setAAndB = (a_val, b_val) => {
      a.set(a_val);
      b.set(b_val);
    };

    setAAndB("aye", "bee");

    expect(timesChanged).toBe(2);
    expect(a.get()).toBe("aye");
    expect(b.get()).toBe("bee");

    derivable.transact(() => {
      setAAndB("a", "b");
    });

    expect(timesChanged).toBe(3);
    expect(a.get()).toBe("a");
    expect(b.get()).toBe("b");

    derivable.transact(() => {
      setAAndB(5, 6);
    });

    expect(timesChanged).toBe(4);
    expect(a.get()).toBe(5);
    expect(b.get()).toBe(6);
  });
});

describe("the `transaction` function", () => {
  it("wraps a function such that its body is executed in a txn", () => {
    const a = derivable.atom("a");
    const b = derivable.atom("b");

    let timesChanged = 0;

    derivable.struct({ a, b }).react(() => {
      timesChanged++;
    }, { skipFirst: true });

    expect(timesChanged).toBe(0);

    const setAAndB = (a_val, b_val) => {
      a.set(a_val);
      b.set(b_val);
      return a_val + b_val;
    };

    expect(setAAndB("aye", "bee")).toBe("ayebee");

    expect(timesChanged).toBe(2);
    expect(a.get()).toBe("aye");
    expect(b.get()).toBe("bee");

    const tSetAAndB = derivable.transaction(setAAndB);

    expect(tSetAAndB("a", "b")).toBe("ab");

    expect(timesChanged).toBe(3);
    expect(a.get()).toBe("a");
    expect(b.get()).toBe("b");

    expect(tSetAAndB(2, 3)).toBe(5);

    expect(timesChanged).toBe(4);
    expect(a.get()).toBe(2);
    expect(b.get()).toBe(3);
  });
});

describe("debug mode", () => {
  it("causes derivations and reactors to store the stacktraces of their" + " instantiation points", () => {
    const d = derivable.derive(() => 0);
    expect(!d.stack).toBeTruthy();
    derivable.setDebugMode(true);
    const e = derivable.derive(() => {
      throw Error();
    });
    expect(e.stack).toBeTruthy();
    derivable.setDebugMode(false);
  });

  it("causes stack traces to be printed when things derivations and reactors throw errors", () => {
    const d = derivable.derive(() => 0);
    expect(!d.stack).toBeTruthy();
    derivable.setDebugMode(true);
    const error = derivable.derive(() => {
      throw "cheese";
    });
    try {
      const err = console.error;
      let stack = void 0;
      console.error = _stack => {
        stack = _stack;
      };
      error.get();
      expect(stack).toBe(error.stack);
      console.error = err;
    } catch (e) {
      expect(e).toBe('cheese');
    }
    derivable.setDebugMode(false);
  });
});

describe('the atomically function', () => {
  it('creates a transaction if not already in a transaction', () => {
    const $A = derivable.atom('a');
    let numReactions = 0;
    $A.react(() => {
      numReactions++;
    }, { skipFirst: true });
    expect(numReactions).toBe(0);

    derivable.atomically(() => {
      $A.set('b');
      expect(numReactions).toBe(0);
    });
    expect(numReactions).toBe(1);
  });

  it("doesn't create new transactions if already in a transaction", () => {
    const $A = derivable.atom('a');

    derivable.transact(() => {
      try {
        derivable.atomically(() => {
          $A.set('b');
          expect($A.get()).toBe('b');
          throw new Error();
        });
      } catch (ignored) {}
      // no transaction created so change to $A persists
      expect($A.get()).toBe('b');
    });
    expect($A.get()).toBe('b');
  });
});

describe('the atomic function', () => {
  it('creates a transaction if not already in a transaction', () => {
    const $A = derivable.atom('a');
    let numReactions = 0;
    $A.react(() => {
      return numReactions++;
    }, { skipFirst: true });
    expect(numReactions).toBe(0);

    const res = derivable.atomic(() => {
      $A.set('b');
      expect(numReactions).toBe(0);
      return 3;
    })();

    expect(numReactions).toBe(1);

    expect(res).toBe(3);
  });

  it("doesn't create new transactions if already in a transaction", () => {
    const $A = derivable.atom('a');

    derivable.transact(() => {
      try {
        derivable.atomic(() => {
          $A.set('b');
          expect($A.get()).toBe('b');
          throw new Error();
        })();
      } catch (ignored) {}
      // no transaction created so change to $A persists
      expect($A.get()).toBe('b');
    });
    expect($A.get()).toBe('b');
  });
});

describe('the wrapPreviousState function', () => {
  it('wraps a function of one argument, passing in previous arguments', () => {
    const f = derivable.wrapPreviousState((a, b) => a + b , 0);

    expect(f(1)).toBe(1);
    expect(f(2)).toBe(3);
    expect(f(3)).toBe(5);
    expect(f(4)).toBe(7);
    expect(f(5)).toBe(9);
    expect(f(6)).toBe(11);
  });

  it('the init arg is optional', () => {
    const f = derivable.wrapPreviousState((a, b) => a + (b || 10));

    expect(f(1)).toBe(11);
    expect(f(2)).toBe(3);
  });
});

describe('the captureDereferences function', () => {
  it('executes the given function, returning an array of captured dereferences', () => {
    const a = derivable.atom("a");
    const b = derivable.atom("b");
    const c = a.derive(d => d.length);

    const _a = derivable.captureDereferences(() => {
      a.get();
    });
    expect(_a).toEqual([a]);

    const _ab = derivable.captureDereferences(() => {
      a.get();
      b.get();
    });
    expect(_ab).toEqual([a, b]);

    const _ba = derivable.captureDereferences(() => {
      b.get();
      a.get();
    });
    expect(_ba).toEqual([b, a]);

    const _c = derivable.captureDereferences(() => {
      c.get();
    });
    expect(_c).toEqual([c]);

    const _ca = derivable.captureDereferences(() => {
      c.get();
      a.get();
    });
    expect(_ca).toEqual([c, a]);

    const _cab = derivable.captureDereferences(() => {
      c.get();
      a.get();
      b.get();
    });
    expect(_cab).toEqual([c, a, b]);
  });
});
