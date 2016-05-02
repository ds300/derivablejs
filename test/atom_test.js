import imut from 'immutable';
import _, {atom, derive, transact} from '../dist/derivable';
import assert from 'assert';

describe("the humble atom", () => {
  const n = atom(0);

  it("can be dereferenced via .get to obtain its current state", () => {
    assert.strictEqual(n.get(), 0);
  });

  it("can be .set to change its current state", () => {
    n.set(1);
    assert.strictEqual(n.get(), 1);
  });

  it("can be .swap-ped a la clojure", () => {
    const double = x => x * 2;
    n.swap(double);
    assert.strictEqual(n.get(), 2);
    n.swap(double);
    assert.strictEqual(n.get(), 4);
  });

  it(`can take on temporary values inside a transaction`, () => {
    const a = atom("a");
    transact(abort => {
      a.set("b");
      assert.strictEqual(a.get(), "b", "blah and junk");
      transact(abort => {
        a.set("c");
        assert.strictEqual(a.get(), "c");
        abort();
      });
      assert.strictEqual(a.get(), "b");
      abort();
    });
    assert.strictEqual(a.get(), "a");
  });

  it(`can keep transaction values if they are't aborted`, () => {
    const a = atom("a");
    transact(() => {
      a.set("b");
      transact(() => {
        a.set("c");
      });
      assert.strictEqual(a.get(), "c");
    });
    assert.strictEqual(a.get(), "c");
  });

  it(`can include an equality-checking function`, () => {
    const a = atom(0);
    const b = a.withEquality(() => false);
    it('creates a brand new atom', () => {
      assert(a !== b);
    });

    let numReactions = 0;
    a.reactor(() => numReactions++).start();
    b.reactor(() => numReactions++).start();

    assert.strictEqual(numReactions, 0);
    a.set(0);
    assert.strictEqual(numReactions, 0);
    a.set(0);
    assert.strictEqual(numReactions, 0);

    b.set(0);
    assert.strictEqual(numReactions, 1);
    b.set(0);
    assert.strictEqual(numReactions, 2);
  });


  it('only likes functions or falsey things for equality functions', () => {
    atom(4).withEquality('');
    assert.throws(() => {
      atom(4).withEquality('yo');
    });
    atom(4).withEquality(0);
    assert.throws(() => {
      atom(4).withEquality(7);
    });
    atom(4).withEquality(null);
    atom(4).withEquality(void 0);
  });
});

describe('the concurrent modification of _reactors bug', () => {
  it('doesnt happen any more', () => {
    const $A = atom(false);
    const $B = atom(false);

    let success = false;

    $A.react(A => {
    }, {
      from: $A,
    });

    const $C = $A.and($B);

    $C.react(ready => {
      success = true;
    }, {
      from: $C
    });

    assert.strictEqual($B._reactors.length, 0);
    // used to be taht this would cause the from controller on C to be igored
    // during the ._maybeReact interation in .set
    $A.set(true);
    assert($B._reactors.length > 0);

  });
});
