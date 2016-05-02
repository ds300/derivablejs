import imut from 'immutable';
import _, {atom, transact, Reactor} from '../dist/derivable';
import assert from 'assert';

describe("anonymous reactors", () => {
  it('are created with the .react method', () => {
    const a = atom('a');
    let val = null;
    a.react(a => { val = a; });

    assert.strictEqual(val, 'a');

    a.set('b');

    assert.strictEqual(val, 'b');
  });

  it('can start when the `from` condition becomes truthy', () => {
    const cond = atom(false);
    const a = atom('a');
    let val = null;
    a.react(a => { val = a; }, {from: cond});

    assert.strictEqual(val, null);

    cond.set('truthy value');

    assert.strictEqual(val, 'a');

    a.set('b');

    assert.strictEqual(val, 'b');
  });

  it('can stop (forever) when the `until` condition becomes truthy', () => {
    const cond = atom(false);
    const a = atom('a');
    let val = null;
    a.react(a => { val = a; }, {until: cond});

    assert.strictEqual(val, 'a');

    a.set('b');

    assert.strictEqual(val, 'b');

    cond.set('truthy value');

    a.set('c');

    assert.strictEqual(val, 'b');

    cond.set(false);

    a.set('d');

    assert.strictEqual(val, 'b');
  });

  it('can start and stop when the `when` condition becomes truthy and falsey respectively',  () => {
    const cond = atom(false);
    const a = atom('a');
    let val = null;
    a.react(a => { val = a; }, {when: cond});

    assert.strictEqual(val, null);

    cond.set('truthy value');

    assert.strictEqual(val, 'a');

    a.set('b');

    assert.strictEqual(val, 'b');

    cond.set(0); //falsey value

    a.set('c');

    assert.strictEqual(val, 'b');

    cond.set(1); //truthy value

    assert.strictEqual(val, 'c');
  });

  it('can have `from`, `when`, and `until` conditions all at once', () => {
    {
      // normal usage
      const from = atom(false);
      const when = atom(false);
      const until = atom(false);

      const a = atom('a');
      let val = null;
      a.react(a => { val = a; }, {from, when, until});

      assert.strictEqual(val, null);

      from.set(true);
      // when is still false
      assert.strictEqual(val, null);
      when.set(true);
      assert.strictEqual(val, 'a');
      a.set('b');
      assert.strictEqual(val, 'b');
      when.set(false);
      a.set('c');
      assert.strictEqual(val, 'b');
      when.set(true);
      assert.strictEqual(val, 'c');
      until.set(true);
      a.set('d');
      assert.strictEqual(val, 'c');
    }
    {
      // until already true
      const from = atom(false);
      const when = atom(false);
      const until = atom(true);

      const a = atom('a');
      let val = null;
      a.react(a => { val = a; }, {from, when, until});

      assert.strictEqual(val, null);
      from.set(true);
      // when is still false
      assert.strictEqual(val, null);
      when.set(true);
      assert.strictEqual(val, null);
    }
    {
      // until already true
      const from = atom(false);
      const when = atom(false);
      const until = atom(true);

      const a = atom('a');
      let val = null;
      a.react(a => { val = a; }, {from, when, until});

      assert.strictEqual(val, null);
      from.set(true);
      // when is still false
      assert.strictEqual(val, null);
      when.set(true);
      assert.strictEqual(val, null);
    }
    {
      // when already true
      const from = atom(false);
      const when = atom(true);
      const until = atom(false);

      const a = atom('a');
      let val = null;
      a.react(a => { val = a; }, {from, when, until});

      assert.strictEqual(val, null);
      from.set(true);
      assert.strictEqual(val, 'a');
    }
    {
      // from and when already true
      const from = atom(true);
      const when = atom(true);
      const until = atom(false);

      const a = atom('a');
      let val = null;
      a.react(a => { val = a; }, {from, when, until});

      assert.strictEqual(val, 'a');
    }
    {
      // from and until already true
      const from = atom(true);
      const when = atom(false);
      const until = atom(true);

      const a = atom('a');
      let val = null;
      a.react(a => { val = a; }, {from, when, until});

      assert.strictEqual(val, null);
      when.set(true);
      assert.strictEqual(val, null);
    }
    {
      // until and when already true
      const from = atom(false);
      const when = atom(true);
      const until = atom(true);

      const a = atom('a');
      let val = null;
      a.react(a => { val = a; }, {from, when, until});

      assert.strictEqual(val, null);
      from.set(true);
      assert.strictEqual(val, null);
    }
    {
      // when and until become true atomically
      const when = atom(false);
      const until = atom(false);

      const a = atom('a');
      let val = null;
      a.react(a => { val = a; }, {when, until});

      assert.strictEqual(val, null);
      _.atomically(() => {
        when.set(true);
        until.set(true);
      });

      assert.strictEqual(val, null);
    }
  });

  it('can specify that the first reaction should be skipped', () => {
    const when = atom(false);
    const a = atom('a');
    let val = null;
    a.react(a => { val = a; }, {skipFirst: true, when});

    assert.strictEqual(val, null);
    when.set(true);
    assert.strictEqual(val, null);
    a.set('b');
    assert.strictEqual(val, 'b');
  });

  it('can specify that a reaction should only happen once', () => {
    {
      // without skipFirst
      const a = atom('a');
      let val = null;
      a.react(a => { val = a; }, {once: true});

      assert.strictEqual(val, 'a');

      a.set('b');
      assert.strictEqual(val, 'a');
    }
    {
      // with skipFirst
      const a = atom('a');
      let val = null;
      a.react(a => { val = a; }, {skipFirst: true, once: true});

      assert.strictEqual(val, null);

      a.set('b');
      assert.strictEqual(val, 'b');
      a.set('c');
      assert.strictEqual(val, 'b');
    }
    {
      // with when
      const when = atom(false);
      const a = atom('a');
      let val = null;
      a.react(a => { val = a; }, {when, once: true});

      assert.strictEqual(val, null);

      a.set('b');

      assert.strictEqual(val, null);
      when.set(true);

      assert.strictEqual(val, 'b');

      a.set('c');
      assert.strictEqual(val, 'b');
    }
  });

  it('has .onStart and .onStop lifecycle hooks', () => {
    const from = atom(false);
    const when = atom(false);
    const until = atom(false);

    const a = atom('a');
    let starts = 0;
    let stops = 0;

    a.react(() => {}, {
      from,
      when,
      until,
      onStart: () => starts++,
      onStop: () => stops++
    });

    assert.strictEqual(starts, 0);
    assert.strictEqual(stops, 0);

    from.set(true);
    assert.strictEqual(starts, 0);
    assert.strictEqual(stops, 0);
    when.set(true);
    assert.strictEqual(starts, 1);
    assert.strictEqual(stops, 0);
    when.set(false);
    assert.strictEqual(starts, 1);
    assert.strictEqual(stops, 1);
    when.set(true);
    assert.strictEqual(starts, 2);
    assert.strictEqual(stops, 1);
    until.set(true);
    assert.strictEqual(starts, 2);
    assert.strictEqual(stops, 2);
    when.set(false);
    assert.strictEqual(starts, 2);
    assert.strictEqual(stops, 2);
  });
});

describe("a tangible reactor", () => {
  let counter = atom(0);
  let inc = n => n+1
  let history = imut.List();
  let action = null;
  let reactor = counter.reactor(function (n) {
    reactor && assert.strictEqual(this, reactor,
                                   "`this` is bound to the reactor");
    history = history.push(n);
    action && action();
  }).start().force();

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
    reactor.stop();
    counter.swap(inc); // now 4 but shouldn't get put in history

    checkHistory(imut.List([0, 1, 2, 3]), "history hasn't changud again");
  });

  it("can be restarted again via the .start method", () => {
    // check it hasn't changed
    checkHistory(imut.List([0, 1, 2, 3]), "history hasn't changed yet again");
    // check it still isn't changing
    counter.swap(inc); // now 5 but shouldn't get put in history
    checkHistory(imut.List([0, 1, 2, 3]), "history hasn't changed yet again 2");
    reactor.start(); // restart but don't force
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

  it("can be exteded via the Reactor class", () => {
    class NTimesReactor extends Reactor {
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
    const reactor = new NTimesReactor(5, x => things = things.push(x));

    assert.strictEqual(false, reactor.running, "reactor should be stopped");
    thing.reactor(reactor);
    assert.strictEqual(false, reactor.running, "reactor should be stopped 2");
    reactor.start();
    assert.strictEqual(true, reactor.running, "reactor should be started");
    assert(things.equals(imut.List()), "things is empty");

    reactor.force();
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
    assert.strictEqual(reactor.running, false, "reactor should have stopped");
    thing.set("six");
    assert(things.equals(imut.List(["one", "two", "three", "four", "five"])),
          "not six");

    reactor.reset(1);

    assert.strictEqual(reactor.running, true,
                       "reactor should have restarted");

    reactor.force();

    assert(things.equals(imut.List(["one", "two", "three",
                                    "four", "five", "six"])),
          "yes six");

    assert.strictEqual(reactor.running, false, "reactor should have stopped");
  });

  it(`can bre created by anonymous classes`, () => {
    let a = atom(5);
    let b = null;
    let started = false;
    let stopped = false;

    let r = a.reactor({
      onStart () {
        started = true;
      },
      onStop () {
        stopped = true;
      },
      react (val) {
        b = val;
      }
    }).start().force();

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

    // derivable disallows
    assert.throws(() => b.react(b => a.set(b)));
  });

  it("is not allowed if the atom in question is upstream of the reactor", () => {
    const n = atom(3);

    // currently 1
    const nmod2 = n.derive(x => x % 2);

    const double = n => n * 2;

    const r = nmod2.reactor(_ => n.swap(double)).start();

    assert.throws(() => n.set(2));
    // nmod2 becomes 0, reactor triggers n being set to 4
    // reactor caught up in sweep again, identified as cycle
  });
});

describe("tickers", () => {
  it("allow reacting at custom intervals", () => {
    const a = atom("a");

    const ticker = _.ticker();

    let b = "b";

    a.reactor(a => b = a).start();

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

    a.reactor(a => b = a).start();
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

    a.reactor(a => b = a).start();

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

  it('can reset the global state to the last tick', () => {
    const a = atom('a');
    const b = atom('b');

    const t = _.ticker();

    a.set('b');
    b.set('a');

    assert.strictEqual(a.get(), 'b');
    assert.strictEqual(b.get(), 'a');

    t.reset();

    assert.strictEqual(a.get(), 'a');
    assert.strictEqual(b.get(), 'b');

    t.release();
    assert.throws(() => t.reset());
  });

  it("cannot be used after being released", () => {
    let t1 = _.ticker();
    let t2 = _.ticker();

    t1.release();

    assert.throws(() => t1.release());

    t2.release();

    assert.throws(() => t2.tick());
  });

  it("should not cause parents to be investigated in the wrong order", () => {
    const a = atom(null);
    const b = a.derive(a => a.toString());
    const c = a.then(b, 'a is null');

    let expecting = 'a is null';

    c.react(c => assert.strictEqual(c, expecting));

    expecting = 'some other string';

    a.set('some other string');

    expecting = 'a is null';
    // this would throw if subject to wrong-order bug
    a.set(null);
  });

  it("can be created in reactors", () => {
    const a = atom('a');

    _.transact(() => {
      a.set('b');
      a.react(a => console.log(a));
    });
  });
});

describe("dependent reactors", () => {
  it("are invoked after their parent reactors", () => {
    const arr = atom([0, 1, 2]);

    // set up reactor to print 3rd elem of arr, but don't start it
    const A = arr.reactor(arr => assert.strictEqual('2', arr[2].toString()));

    // instead control it by reacting to the length of the array
    const B = arr.derive(a => a.length).reactor(len => {
      if (len >= 3) {
        if (!A.isActive()) A.start().force();
      } else {
        A.stop();
      }
    }).start().force();
    // $> 2

    // should not throw
    arr.set([0,1]);
  });

  it("are not stopped before their parent reactors", () => {
    const state = atom('a');
    const A = state.reactor({
      react: () => null,
      onStop: () => null
    });
    const B = state.reactor(() => A.start()).start().force();

    B.stop();

    assert(A.isActive());
  });

  it("can't invole cyclical dependencies", () => {
    const state = atom('a');

    let A;
    const B = state.reactor(state => {
      A.stop();
      A.start().force();
    });

    A = state.reactor(state => {
      B.stop();
      B.start().force();
    });

    assert.throws(() => B.start().force());
  });

  it("can't invole cyclical dependencies", () => {
    const state = atom('a');

    const A = state.reactor(() => null);
    const B = state.reactor(() => null);

    A.adopt(B);
    B.adopt(A);

    A.start();
    B.start();

    assert.throws(() => state.set('b'));
  });
});

describe('the `when` optons to the `react` method', () => {
  it('allows one to tie the lifecycle of a reactor to some piece of state anonymously', () => {
    const $Cond = atom(false);
    const $N = atom(0);
    const inc = x => x + 1;

    let i = 0;
    $N.react(n => i++, {when: $Cond});

    assert.strictEqual(i, 0);

    $N.swap(inc);

    assert.strictEqual(i, 0);

    $Cond.set(true);

    assert.strictEqual(i, 1);

    $N.swap(inc);

    assert.strictEqual(i, 2);

    $N.swap(inc);
    $N.swap(inc);

    assert.strictEqual(i, 4);

    // it uses truthy/falsiness
    $Cond.set(0);

    $N.swap(inc);
    $N.swap(inc);

    assert.strictEqual(i, 4);
  });

  it('casts the condition to a boolean', () => {
    const $Cond = atom("blub");
    const $N = atom(0);
    const inc = x => x + 1;

    let i = 0;

    $N.react(n => i++, {when: $Cond});

    assert.strictEqual(i, 1);

    $N.swap(inc);
    assert.strictEqual(i, 2);
    $N.swap(inc);
    $N.swap(inc);
    $N.swap(inc);
    assert.strictEqual(i, 5);
    $Cond.set("steve");
    // sould cause .force() if not casting to boolean, which would inc i
    assert.strictEqual(i, 5);
  });
});
