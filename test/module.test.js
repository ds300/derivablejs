"use strict";

const derivable = require("../dist/derivable");
const { atom, derive, lens } = derivable;

describe("the `is*` fns", () => {
  it("just work, don't worry about it", () => {
    const a = atom(0);
    const d = derive(() => a.get() * 2);
    const p = lens({ get: () => a.get() * 2, set: x => a.set(x / 2) });

    expect(derivable.isAtom(a)).toBeTruthy();
    expect(derivable.isAtom(d)).toBeFalsy();
    expect(derivable.isAtom(p)).toBeTruthy();

    expect(derivable.isDerivation(a)).toBeFalsy();
    expect(derivable.isDerivation(d)).toBeTruthy();
    expect(derivable.isDerivation(p)).toBeTruthy();

    expect(derivable.isLens(a)).toBeFalsy();
    expect(derivable.isLens(p)).toBeTruthy();
    expect(derivable.isLens(d)).toBeFalsy();

    expect(derivable.isDerivable(a)).toBeTruthy();
    expect(derivable.isDerivable(d)).toBeTruthy();
    expect(derivable.isDerivable(p)).toBeTruthy();
  });
});

describe.skip("the `transact` function", () => {
  it("executes a function in the context of a transaction", () => {
    const a = derivable.atom("a");
    const b = derivable.atom("b");

    let timesChanged = 0;

    derivable.struct({ a, b }).react(
      () => {
        timesChanged++;
      },
      { skipFirst: true }
    );

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

describe.skip("the `transaction` function", () => {
  it("wraps a function such that its body is executed in a txn", () => {
    const a = derivable.atom("a");
    const b = derivable.atom("b");

    let timesChanged = 0;

    derivable.struct({ a, b }).react(
      () => {
        timesChanged++;
      },
      { skipFirst: true }
    );

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
  it(
    "causes derivations and reactors to store the stacktraces of their" +
      " instantiation points",
    () => {
      const d = derivable.derive(() => 0);
      expect(!d.stack).toBeTruthy();
      derivable.setDebugMode(true);
      const e = derivable.derive(() => {
        throw Error();
      });
      expect(e.stack).toBeTruthy();
      derivable.setDebugMode(false);
    }
  );

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
      expect(e).toBe("cheese");
    }
    derivable.setDebugMode(false);
  });
});

describe("the atomically function", () => {
  it("creates a transaction if not already in a transaction", () => {
    const $A = derivable.atom("a");
    let numReactions = 0;
    $A.react(
      () => {
        numReactions++;
      },
      { skipFirst: true }
    );
    expect(numReactions).toBe(0);

    derivable.atomically(() => {
      $A.set("b");
      expect(numReactions).toBe(0);
    });
    expect(numReactions).toBe(1);
  });

  it.skip("doesn't create new transactions if already in a transaction", () => {
    const $A = derivable.atom("a");

    derivable.transact(() => {
      try {
        derivable.atomically(() => {
          $A.set("b");
          expect($A.get()).toBe("b");
          throw new Error();
        });
      } catch (ignored) {}
      // no transaction created so change to $A persists
      expect($A.get()).toBe("b");
    });
    expect($A.get()).toBe("b");
  });
});

describe("the atomic function", () => {
  it("creates a transaction if not already in a transaction", () => {
    const $A = derivable.atom("a");
    let numReactions = 0;
    $A.react(
      () => {
        return numReactions++;
      },
      { skipFirst: true }
    );
    expect(numReactions).toBe(0);

    const res = derivable.atomic(() => {
      $A.set("b");
      expect(numReactions).toBe(0);
      return 3;
    })();

    expect(numReactions).toBe(1);

    expect(res).toBe(3);
  });

  it.skip("doesn't create new transactions if already in a transaction", () => {
    const $A = derivable.atom("a");

    derivable.transact(() => {
      try {
        derivable.atomic(() => {
          $A.set("b");
          expect($A.get()).toBe("b");
          throw new Error();
        })();
      } catch (ignored) {}
      // no transaction created so change to $A persists
      expect($A.get()).toBe("b");
    });
    expect($A.get()).toBe("b");
  });
});
