import imut from 'immutable';
import _, {atom, transact, Reaction} from '../dist/havelock';
import assert from 'assert';

describe("a reaction", () => {
  let counter = atom(0);
  let inc = n => n+1
  let history = imut.List();
  let action = null;
  let reaction = counter.react(function (n) {
    reaction && assert.strictEqual(this, reaction,
                                   "`this` is bound to the reaction");
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
    reaction.start(); // restart but don't force
    checkHistory(imut.List([0, 1, 2, 3]), "no history change 3");
    counter.swap(inc); // now 6 but should get put in history
    checkHistory(imut.List([0, 1, 2, 3, 6]), "history changed again!");
  });

  it("won't be evaluated in a transaction", () => {
    checkHistory(imut.List([0, 1, 2, 3, 6]), "no change 1");
    transact(() => {
      checkHistory(imut.List([0, 1, 2, 3, 6]), "no change 2");
      counter.swap(inc); // now 7
      checkHistory(imut.List([0, 1, 2, 3, 6]), "no change 3");
      counter.swap(inc); // now 8
      checkHistory(imut.List([0, 1, 2, 3, 6]), "no change 4");
    });
    // now transaction commits and 8 gets added
    checkHistory(imut.List([0, 1, 2, 3, 6, 8]), "eight");
  });

  it("can be exteded via the Reaction class", () => {
    class NTimesReaction extends Reaction {
      constructor (n, f) {
        super();
        this.n = n;
        this.f = f;
        this.running = false;
      }
      reset (n) {
        this.n = n;
        this.start();
      }
      onStart() {
        this.running = true;
      }
      onStop () {
        this.running = false;
      }
      react (v) {
        this.f(v)
        this.n--;
        if (this.n === 0) {
          this.stop();
        }
      }
    }

    const thing = atom("one");
    let things = imut.List();
    const reaction = new NTimesReaction(5, x => things = things.push(x));

    assert.strictEqual(false, reaction.running, "reaction should be stopped");
    thing.reaction(reaction);
    assert.strictEqual(false, reaction.running, "reaction should be stopped 2");
    reaction.start();
    assert.strictEqual(true, reaction.running, "reaction should be started");
    assert(things.equals(imut.List()), "things is empty");

    reaction.force();
    assert(things.equals(imut.List(["one"])), "one");
    thing.set("two");
    assert(things.equals(imut.List(["one", "two"])), "two");
    thing.set("three");
    assert(things.equals(imut.List(["one", "two", "three"])), "three");
    thing.set("four");
    assert(things.equals(imut.List(["one", "two", "three", "four"])), "four");
    thing.set("five");
    assert(things.equals(imut.List(["one", "two", "three", "four", "five"])),
          "five");
    assert.strictEqual(reaction.running, false, "reaction should have stopped");
    thing.set("six");
    assert(things.equals(imut.List(["one", "two", "three", "four", "five"])),
          "not six");

    reaction.reset(1);

    assert.strictEqual(reaction.running, true,
                       "reaction should have restarted");

    reaction.force();

    assert(things.equals(imut.List(["one", "two", "three",
                                    "four", "five", "six"])),
          "yes six");

    assert.strictEqual(reaction.running, false, "reaction should have stopped");
  });

  it(`can't be initialized twice`, () => {

    let a = atom(0);
    let reaction = a.reaction(n => console.log(n));
    assert.throws(() => {
      atom(0).react(reaction);
    });
    reaction = a.reaction(n => console.log(n));
    assert.throws(() => {
      a.react(reaction);
    });
  });

  it(`can bre created by anonymous classes`, () => {
    let a = atom(5);
    let b = null;
    let started = false;
    let stopped = false;

    let r = a.react({
      onStart () {
        started = true;
      },
      onStop () {
        stopped = true;
      },
      react (val) {
        b = val;
      }
    });

    assert(started, "it started");
    assert(!stopped, "it didn't stopped yet");
    assert.strictEqual(5, b, "b is 5");

    a.set("blub");
    assert.strictEqual("blub", b, "b is blub");

    r.stop();

    assert(stopped, "it stopped");
    a.set("jesuit");

    assert.strictEqual("blub", b, "b is still blub");
  });
});

describe("setting the values of atoms in a reaction phase", () => {
  it("is ok as long as no cycles are created", () => {
    const a = atom("a");

    const b = atom("b");

    a.react(a => b.set(b.get() + a));

    assert.strictEqual(b.get(), "ba");

    a.set("aa");

    assert.strictEqual(b.get(), "baaa");

    // havelock disallows
    assert.throws(() => b.react(b => a.set(b)));
  });
});

describe("tickers", () => {
  it("allow reacting at custom intervals", () => {
    const a = atom("a");

    const ticker = _.ticker();

    let b = "b";

    a.reaction(a => b = a).start();

    assert.strictEqual(b, "b");

    a.set("c");

    assert.strictEqual(b, "b");

    a.set("d");

    assert.strictEqual(b, "b");

    ticker.tick();

    assert.strictEqual(b, "d");

    a.set("e");

    assert.strictEqual(b, "d");

    a.set("f");

    assert.strictEqual(b, "d");

    ticker.tick();

    assert.strictEqual(b, "f");

    ticker.release();
  });

  it("can be used by more than one piece of the stack", () => {
    const a = atom("a");
    const ticker1 = _.ticker();
    const ticker2 = _.ticker();
    const ticker3 = _.ticker();

    assert(ticker1 !== ticker2);
    assert(ticker1 !== ticker3);
    assert(ticker2 !== ticker3);

    let b = "b";

    a.reaction(a => b = a).start();
    assert.strictEqual(b, "b");
    a.set("c");
    assert.strictEqual(b, "b");
    a.set("d");
    assert.strictEqual(b, "b");
    ticker1.tick();
    assert.strictEqual(b, "d");
    a.set("e");
    assert.strictEqual(b, "d");
    a.set("f");
    assert.strictEqual(b, "d");
    ticker2.tick();
    assert.strictEqual(b, "f");
    a.set("g");
    ticker3.tick();
    assert.strictEqual(b, "g");

    ticker1.release();
    ticker2.release();
    ticker3.release();
  });

  it("are reference counted", () => {
    const a = atom(null);
    let b = "b";

    a.reaction(a => b = a).start();

    a.set("a");

    assert.strictEqual(b, "a");

    const ticker1 = _.ticker();
    const ticker2 = _.ticker();
    const ticker3 = _.ticker();

    a.set("b");

    assert.strictEqual(b, "a");

    ticker1.release();
    assert.strictEqual(b, "a");
    ticker2.release();
    assert.strictEqual(b, "a");
    ticker3.release();
    assert.strictEqual(b, "b");

    a.set("c");

    assert.strictEqual(b, "c");

  });

  it("cannot be used after being released", () => {
    let t1 = _.ticker();
    let t2 = _.ticker();

    t1.release();

    assert.throws(() => t1.release());

    t2.release();

    assert.throws(() => t2.tick());
  });
});
