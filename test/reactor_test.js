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

  it('can have `from`, `when`, and `until` specified as functions', () => {
    {
      const cond = atom(false);
      const a = atom('a');
      let val = null;
      a.react(a => { val = a; }, {when: () => cond.get()});

      assert.strictEqual(val, null);

      cond.set('truthy value');

      assert.strictEqual(val, 'a');
    }
    {
      const cond = atom(false);
      const a = atom('a');
      let val = null;
      a.react(a => { val = a; }, {from: () => cond.get()});

      assert.strictEqual(val, null);

      cond.set('truthy value');

      assert.strictEqual(val, 'a');
    }
    {
      const a = atom('a');
      let val = null;
      a.react(a => { val = a; }, {until: () => a.is('b').get()});

      assert.strictEqual(val, 'a');

      a.set('c');

      assert.strictEqual(val, 'c');

      a.set('b');

      assert.strictEqual(val, 'c');

      a.set('a');

      assert.strictEqual(val, 'c');
    }
  });

  it('doesnt like it when `from`, `when`, and `until` are other things', () => {
    const a = atom('a');
    assert.throws(() => a.react(() => null, {from: 'a string'}));
    assert.throws(() => a.react(() => null, {when: 3}));
    assert.throws(() => a.react(() => null, {until: new Date()}));
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

describe("the .react method", () => {
  it("must have a function as the first argument", () => {
    assert.throws(() => atom(5).react());
    assert.throws(() => atom(5).react(4));
    assert.throws(() => atom(5).react(''));
    assert.throws(() => atom(5).react({}));
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

describe('the `oprhan` and `adopt` methods', () => {
  it('allow one to change the parent-child relationships manually', () => {
    const state = atom('a');

    const A = state.reactor(() => null);
    const B = state.reactor(() => null);

    A.adopt(B);
    B.adopt(A);

    A.start();
    B.start();

    assert.throws(() => state.set('b'));

    A.orphan();

    state.set('c');
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
