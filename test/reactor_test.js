'use strict';

const derivable = require('../dist/derivable');

describe("anonymous reactors", () => {
  it('are created with the .react method', () => {
    const a = derivable.atom('a');
    let val = null;
    a.react(d => {
      val = d;
    });

    expect(val).toBe('a');

    a.set('b');

    expect(val).toBe('b');
  });

  it('can start when the `from` condition becomes truthy', () => {
    const from = derivable.atom(false);
    const a = derivable.atom('a');
    let val = null;
    a.react(d => {
      val = d;
    }, { from });

    expect(val).toBe(null);

    from.set('truthy value');

    expect(val).toBe('a');

    a.set('b');

    expect(val).toBe('b');
  });

  it('can stop (forever) when the `until` condition becomes truthy', () => {
    const until = derivable.atom(false);
    const a = derivable.atom('a');
    let val = null;
    a.react(d => {
      val = d;
    }, { until });

    expect(val).toBe('a');

    a.set('b');

    expect(val).toBe('b');

    until.set('truthy value');

    a.set('c');

    expect(val).toBe('b');

    until.set(false);

    a.set('d');

    expect(val).toBe('b');
  });

  it('can start and stop when the `when` condition becomes truthy and falsey respectively', () => {
    const when = derivable.atom(false);
    const a = derivable.atom('a');
    let val = null;
    a.react(d => {
      val = d;
    }, { when });

    expect(val).toBe(null);

    when.set('truthy value');

    expect(val).toBe('a');

    a.set('b');

    expect(val).toBe('b');

    when.set(0); //falsey value

    a.set('c');

    expect(val).toBe('b');

    when.set(1); //truthy value

    expect(val).toBe('c');
  });

  it('can have `from`, `when`, and `until` specified as functions', () => {
    {
      const cond = derivable.atom(false);
      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { when: () => cond.get() });

      expect(val).toBe(null);

      cond.set('truthy value');

      expect(val).toBe('a');
    }

    {
      const cond = derivable.atom(false);
      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { from: () => cond.get() });

      expect(val).toBe(null);

      cond.set('truthy value');

      expect(val).toBe('a');
    }

    {
      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { until: () => a.is('b').get() });

      expect(val).toBe('a');

      a.set('c');

      expect(val).toBe('c');

      a.set('b');

      expect(val).toBe('c');

      a.set('a');

      expect(val).toBe('c');
    }
  });

  it('can have `from`, `when`, and `until` specified as functions that use the derivable itself', () => {
    {
      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { when: d => d.get() > 'c' });

      expect(val).toBe(null);

      a.set('x');

      expect(val).toBe('x');
    }

    {
      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { from: d => d.get() > 'c' });

      expect(val).toBe(null);

      a.set('x');

      expect(val).toBe('x');
    }
    {
      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { until: d => d.is('b').get() });

      expect(val).toBe('a');

      a.set('c');

      expect(val).toBe('c');

      a.set('b');

      expect(val).toBe('c');

      a.set('a');

      expect(val).toBe('c');
    }
  });

  it('doesnt like it when `from`, `when`, and `until` are other things', () => {
    const a = derivable.atom('a');
    expect(() => {
      a.react(() => {
        return null;
      }, { from: 'a string' });
    }).toThrow();
    expect(() => {
      a.react(() => {
        return null;
      }, { when: 3 });
    }).toThrow();
    expect(() => {
      a.react(() => {
        return null;
      }, { until: new Date() });
    }).toThrow();
  });

  it('can have `from`, `when`, and `until` conditions all at once', () => {
    {
      // normal usage
      const from = derivable.atom(false);
      const when = derivable.atom(false);
      const until = derivable.atom(false);

      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { from: from, when: when, until: until });

      expect(val).toBe(null);

      from.set(true);
      // when is still false
      expect(val).toBe(null);
      when.set(true);
      expect(val).toBe('a');
      a.set('b');
      expect(val).toBe('b');
      when.set(false);
      a.set('c');
      expect(val).toBe('b');
      when.set(true);
      expect(val).toBe('c');
      until.set(true);
      a.set('d');
      expect(val).toBe('c');
    }

    {
      // until already true
      const from = derivable.atom(false);
      const when = derivable.atom(false);
      const until = derivable.atom(true);

      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { from, when, until });

      expect(val).toBe(null);
      from.set(true);
      // when is still false
      expect(val).toBe(null);
      when.set(true);
      expect(val).toBe(null);
    }

    {
      // until already true
      const from = derivable.atom(false);
      const when = derivable.atom(false);
      const until = derivable.atom(true);

      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { from, when, until });

      expect(val).toBe(null);
      from.set(true);
      // when is still false
      expect(val).toBe(null);
      when.set(true);
      expect(val).toBe(null);
    }

    {
      // when already true
      const from = derivable.atom(false);
      const when = derivable.atom(true);
      const until = derivable.atom(false);

      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { from, when, until });

      expect(val).toBe(null);
      from.set(true);
      expect(val).toBe('a');
    }

    {
      // from and when already true
      const from = derivable.atom(true);
      const when = derivable.atom(true);
      const until = derivable.atom(false);

      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { from, when, until });

      expect(val).toBe('a');
    }

    {
      // from and until already true
      const from = derivable.atom(true);
      const when = derivable.atom(false);
      const until = derivable.atom(true);

      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { from, when, until });

      expect(val).toBe(null);
      when.set(true);
      expect(val).toBe(null);
    }

    {
      // until and when already true
      const from = derivable.atom(false);
      const when = derivable.atom(true);
      const until = derivable.atom(true);

      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { from, when, until });

      expect(val).toBe(null);
      from.set(true);
      expect(val).toBe(null);
    }

    {
      // when and until become true atomically
      const when = derivable.atom(false);
      const until = derivable.atom(false);

      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { when, until });

      expect(val).toBe(null);
      derivable.atomically(() => {
        when.set(true);
        until.set(true);
      });

      expect(val).toBe(null);
    }
  });

  it('can specify that the first reaction should be skipped', () => {
    const when = derivable.atom(false);
    const a = derivable.atom('a');
    let val = null;
    a.react(d => {
      val = d;
    }, { skipFirst: true, when });

    expect(val).toBe(null);
    when.set(true);
    expect(val).toBe(null);
    a.set('b');
    expect(val).toBe('b');
  });

  it('can specify that a reaction should only happen once', () => {
    {
      // without skipFirst
      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { once: true });

      expect(val).toBe('a');

      a.set('b');
      expect(val).toBe('a');
    }

    {
      // with skipFirst
      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { skipFirst: true, once: true });

      expect(val).toBe(null);

      a.set('b');
      expect(val).toBe('b');
      a.set('c');
      expect(val).toBe('b');
    }

    {
      // with when
      const when = derivable.atom(false);
      const a = derivable.atom('a');
      let val = null;
      a.react(d => {
        val = d;
      }, { when, once: true });

      expect(val).toBe(null);

      a.set('b');

      expect(val).toBe(null);
      when.set(true);

      expect(val).toBe('b');

      a.set('c');
      expect(val).toBe('b');
    }
  });

});

describe("the .react method", () => {
  it("must have a function as the first argument", () => {
    expect(() => {
      derivable.atom(5).react();
    }).toThrow();
    expect(() => {
      derivable.atom(5).react(4);
    }).toThrow();
    expect(() => {
      derivable.atom(5).react('');
    }).toThrow();
    expect(() => {
      derivable.atom(5).react({});
    }).toThrow();
  });
});

describe("setting the values of atoms in a reaction phase", () => {
  it("is ok as long as no cycles are created", () => {
    const a = derivable.atom("a");

    const b = derivable.atom("b");

    a.react(d => {
      b.set(b.get() + d);
    });

    expect(b.get()).toBe("ba");

    a.set("aa");

    expect(b.get()).toBe("baaa");

    // derivable disallows
    expect(() => {
      b.react(d => {
        a.set(d);
      });
    }).toThrow();
  });

  it("is not allowed if the atom in question is upstream of the reactor", () => {
    const n = derivable.atom(3);

    // currently 1
    const nmod2 = n.derive(x => x % 2);

    const double = d => d * 2;

    nmod2.react(() => {
      n.update(double);
    }, { skipFirst: true });

    expect(() => {
      n.set(2);
    }).toThrow();
    // nmod2 becomes 0, reactor triggers n being set to 4
    // reactor caught up in sweep again, identified as cycle
  });
});

describe("tickers", () => {
  it("allow reacting at custom intervals", () => {
    const a = derivable.atom("a");

    const ticker = derivable.ticker();

    let b = "b";

    a.react(d => {
      b = d;
    }, { skipFirst: true });

    expect(b).toBe("b");

    a.set("c");

    expect(b).toBe("b");

    a.set("d");

    expect(b).toBe("b");

    ticker.tick();

    expect(b).toBe("d");

    a.set("e");

    expect(b).toBe("d");

    a.set("f");

    expect(b).toBe("d");

    ticker.tick();

    expect(b).toBe("f");

    ticker.release();
  });

  it("can be used by more than one piece of the stack", () => {
    const a = derivable.atom("a");
    const ticker1 = derivable.ticker();
    const ticker2 = derivable.ticker();
    const ticker3 = derivable.ticker();

    expect(ticker1).not.toBe(ticker2);
    expect(ticker1).not.toBe(ticker3);
    expect(ticker2).not.toBe(ticker3);

    let b = "b";

    a.react(d => {
      b = d;
    }, { skipFirst: true });
    expect(b).toBe("b");
    a.set("c");
    expect(b).toBe("b");
    a.set("d");
    expect(b).toBe("b");
    ticker1.tick();
    expect(b).toBe("d");
    a.set("e");
    expect(b).toBe("d");
    a.set("f");
    expect(b).toBe("d");
    ticker2.tick();
    expect(b).toBe("f");
    a.set("g");
    ticker3.tick();
    expect(b).toBe("g");

    ticker1.release();
    ticker2.release();
    ticker3.release();
  });

  it("are reference counted", () => {
    const a = derivable.atom(null);
    let b = "b";

    a.react(d => {
      b = d;
    }, { skipFirst: true });

    a.set("a");

    expect(b).toBe("a");

    const ticker1 = derivable.ticker();
    const ticker2 = derivable.ticker();
    const ticker3 = derivable.ticker();

    a.set("b");

    expect(b).toBe("a");

    ticker1.release();
    expect(b).toBe("a");
    ticker2.release();
    expect(b).toBe("a");
    ticker3.release();
    expect(b).toBe("b");

    a.set("c");

    expect(b).toBe("c");
  });

  it('can reset the global state to the last tick', () => {
    const a = derivable.atom('a');
    const b = derivable.atom('b');

    const t = derivable.ticker();

    a.set('b');
    b.set('a');

    expect(a.get()).toBe('b');
    expect(b.get()).toBe('a');

    t.reset();

    expect(a.get()).toBe('a');
    expect(b.get()).toBe('b');

    t.release();
    expect(() => {
      t.reset();
    }).toThrow();
  });

  it("cannot be used after being released", () => {
    const t1 = derivable.ticker();
    const t2 = derivable.ticker();

    t1.release();

    expect(() => {
      t1.release();
    }).toThrow();

    t2.release();

    expect(() => {
      t2.tick();
    }).toThrow();
  });

  it("should not cause parents to be investigated in the wrong order", () => {
    const a = derivable.atom(null);
    const b = a.map(d => d.toString());
    const c = a.map(_c => _c ? b.get() :  'a is null');

    let expecting = 'a is null';

    c.react(d => {
      expect(d).toBe(expecting);
    });

    expecting = 'some other string';

    a.set('some other string');

    expecting = 'a is null';
    // this would throw if subject to wrong-order bug
    a.set(null);
  });

  it("can be created in reactors", () => {
    const a = derivable.atom('a');

    derivable.transact(() => {
      a.set('b');
      a.react(d => {
        console.log(d);
      });
    });
  });
});


describe('the `when` optons to the `react` method', () => {
  it('allows one to tie the lifecycle of a reactor to some piece of state anonymously', () => {
    const $Cond = derivable.atom(false);
    const $N = derivable.atom(0);
    const inc = x => x + 1;

    let i = 0;
    $N.react(() => {
      i++;
    }, { when: $Cond });

    expect(i).toBe(0);

    $N.update(inc);

    expect(i).toBe(0);

    $Cond.set(true);

    expect(i).toBe(1);

    $N.update(inc);

    expect(i).toBe(2);

    $N.update(inc);
    $N.update(inc);

    expect(i).toBe(4);

    // it uses truthy/falsiness
    $Cond.set(0);

    $N.update(inc);
    $N.update(inc);

    expect(i).toBe(4);
  });

  it('casts the condition to a boolean', () => {
    const $Cond = derivable.atom("blub");
    const $N = derivable.atom(0);
    const inc = x => x + 1;

    let i = 0;

    $N.react(() => {
      i++;
    }, { when: $Cond });

    expect(i).toBe(1);

    $N.update(inc);
    expect(i).toBe(2);
    $N.update(inc);
    $N.update(inc);
    $N.update(inc);
    expect(i).toBe(5);
    $Cond.set("steve");
    // sould cause .force() if not casting to boolean, which would inc i
    expect(i).toBe(5);
  });
});

describe('the .mReact method', () => {
  it('only reacts when the thing in the derivable is not null or undefined', () => {
    const a = derivable.atom(null);

    let _a = "Tree";

    a.mReact(d => {
      _a = d;
    });

    expect(_a).toBe("Tree");

    a.set("House");

    expect(_a).toBe("House");

    a.set(void 0);

    expect(_a).toBe("House");
  });

  it.only('merges any given when condition', () => {
    const a = derivable.atom(null);
    const when = derivable.atom(true);

    let _a = "Tree";

    a.mReact(d => {
      _a = d;
    }, { when });

    expect(_a).toBe("Tree");

    a.set("House");

    expect(_a).toBe("House");

    a.set(void 0);

    expect(_a).toBe("House");

    a.set("Tree");

    expect(_a).toBe("Tree");

    when.set(false);

    a.set("House");

    expect(_a).toBe("Tree");
  });

  it("shouldn't touch any other conditions", () => {
    const a = derivable.atom(null);
    const when = derivable.atom(true);
    const from = derivable.atom(false);
    const until = derivable.atom(false);

    let _a = "Tree";

    a.mReact(d => {
      _a = d;
    }, { when , from, until });

    expect(_a).toBe("Tree");

    a.set("House");

    expect(_a).toBe("Tree");

    from.set(true);

    expect(_a).toBe("House");

    a.set(void 0);

    expect(_a).toBe("House");

    when .set(false);

    a.set("Tree");

    expect(_a).toBe("House");

    when .set(true);

    expect(_a).toBe("Tree");

    until.set(true);

    a.set("House");

    expect(_a).toBe("Tree");

  });
});
