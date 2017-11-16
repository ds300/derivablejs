"use strict";

const derivable = require("../dist/derivable");

describe("the humble atom", () => {
  let n;

  beforeEach(() => {
    n = derivable.atom(0);
  });

  it("can be dereferenced via .get to obtain its current state", () => {
    expect(n.get()).toBe(0);
  });

  it("can be .set to change its current state", () => {
    n.set(1);
    expect(n.get()).toBe(1);
  });

  it("can .update (a la swap in clojure)", () => {
    n.set(1);
    const double = x => x * 2;
    n.update(double);
    expect(n.get()).toBe(2);
    n.update(double);
    expect(n.get()).toBe(4);
  });

  it("can take on temporary values inside a transaction", () => {
    const a = derivable.atom("a");
    derivable.transact(abort1 => {
      a.set("b");
      expect(a.get()).toBe("b");
      derivable.transact(abort2 => {
        a.set("c");
        expect(a.get()).toBe("c");
        abort2();
      });
      expect(a.get()).toBe("b");
      abort1();
    });
    expect(a.get()).toBe("a");
  });

  it("should be able to go back to its original value with no ill effects", () => {
    const a = derivable.atom("a");
    let reacted = false;
    a.react(
      () => {
        reacted = true;
      },
      { skipFirst: true }
    );

    // no reaction to begin with
    expect(reacted).toBe(false);

    derivable.transact(() => {
      a.set("b");
      a.set("a");
    });

    // no reaction should take place
    expect(reacted).toBe(false);
  });

  it("can keep transaction values if they are't aborted", () => {
    const a = derivable.atom("a");
    derivable.transact(() => {
      a.set("b");
      derivable.transact(() => {
        a.set("c");
      });
      expect(a.get()).toBe("c");
    });
    expect(a.get()).toBe("c");
  });

  it("can include an equality-checking function", () => {
    const a = derivable.atom(0);
    const b = a.withEquality(() => false);
    // creates a brand new atom
    expect(a).not.toBe(b);

    let numReactions = 0;
    a.react(
      () => {
        numReactions++;
      },
      { skipFirst: true }
    );
    b.react(
      () => {
        numReactions++;
      },
      { skipFirst: true }
    );

    expect(numReactions).toBe(0);
    a.set(0);
    expect(numReactions).toBe(0);
    a.set(0);
    expect(numReactions).toBe(0);

    b.set(0);
    expect(numReactions).toBe(1);
    b.set(0);
    expect(numReactions).toBe(2);
  });

  it("only likes functions or falsey things for equality functions", () => {
    derivable.atom(4).withEquality("");
    expect(() => {
      derivable.atom(4).withEquality("yo");
    }).toThrow();
    derivable.atom(4).withEquality(0);
    expect(() => {
      derivable.atom(4).withEquality(7);
    }).toThrow();
    derivable.atom(4).withEquality(null);
    derivable.atom(4).withEquality(void 0);
  });
});

describe("the concurrent modification of _reactors bug", () => {
  it("doesnt happen any more", () => {
    const $A = derivable.atom(false);
    const $B = derivable.atom(false);

    let A_success = false;
    let C_success = false;

    $A.react(
      () => {
        A_success = true;
      },
      { from: $A }
    );

    const $C = $A.derive(a => a && $B.get());

    $C.react(
      () => {
        C_success = true;
      },
      { from: $C }
    );

    expect(A_success).toBe(false);
    expect(C_success).toBe(false);
    // used to be that this would cause the 'from' controller on C to be ignored
    // during the ._maybeReact iteration in .set
    $A.set(true);
    expect(A_success).toBe(true);
    expect(C_success).toBe(false);
    $B.set(true);

    expect(C_success).toBe(true);
  });
});
