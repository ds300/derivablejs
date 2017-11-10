'use strict';

const immutable = require('immutable');

const derivable = require('../dist/derivable');

describe("proxies", () => {
  const cursor = (proxyable, ...args) => {
    const _len = args.length;
    const path = Array(_len - 1);
    for (let _key = 0; _key < _len; _key++) {
      path[_key] = args[_key];
    }

    return proxyable.proxy({
      get: state => state.getIn(path),
      set: (state, val) => state.setIn(path, val)
    });
  };

  it("makes a functional proxy over an atom", () => {
    const root = derivable.atom(immutable.fromJS({ things: ["zero", "one", "three"] }));

    const two = cursor(root, "things", 2);
    expect("three").toEqual(two.get());

    two.set("two");

    expect(immutable.fromJS({ things: ["zero", "one", "two"] }).equals(root.get())).toBeTruthy();

    const things = cursor(root, "things");

    expect(immutable.fromJS(["zero", "one", "two"]).equals(things.get())).toBeTruthy();

    const one = cursor(things, 1);

    expect("one").toEqual(one.get());

    let reactors = 0;

    one.react(() => {
      reactors++;
    });

    expect(1).toEqual(reactors);
    one.set("five");
    expect(2).toEqual(reactors);

    expect(immutable.fromJS(["zero", "five", "two"]).equals(things.get())).toBeTruthy();
  });

  it("works on numbers too", () => {
    const num = derivable.atom(3.14159);

    const afterDecimalPoint = num.proxy({
      get: number => parseInt(number.toString().split(".")[1]) || 0,
      set: (number, newVal) => {
        const beforeDecimalPoint = number.toString().split(".")[0];
        return parseFloat(beforeDecimalPoint + '.' + newVal);
      }
    });

    expect(14159).toBe(afterDecimalPoint.get());

    afterDecimalPoint.set(4567);

    expect(3.4567).toBe(num.get());

    afterDecimalPoint.update(x => x * 2);

    expect(9134).toBe(afterDecimalPoint.get());

    expect(3.9134).toBe(num.get());
  });

  it('can be re-instantiated with custom equality-checking', () => {
    const proxy = {
      get: a => ({ a: a % 2 }),
      set: (a, v) => v.a
    };
    const a = derivable.atom(5);
    const amod2map = a.proxy(proxy);

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

    amod2map.set({ a: 1 });
    expect(numReactions).toBe(4);

    const amod2map2 = a.proxy(proxy).withEquality((_ref, _ref2) => _ref.a === _ref2.a);

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

    amod2map2.set({ a: 1 });
    expect(numReactions2).toBe(0);
  });
});

describe('composite proxies', () => {
  it('allow multiple atoms to be proxied over', () => {
    const $FirstName = derivable.atom('John');
    const $LastName = derivable.atom('Steinbeck');
    const $Name = derivable.proxy({
      get: () => $FirstName.get() + ' ' + $LastName.get(),
      set: val => {
        const _val$split = val.split(' ');

        const first = _val$split[0];
        const last = _val$split[1];

        $FirstName.set(first);
        $LastName.set(last);
      }
    });

    expect($Name.get()).toBe('John Steinbeck');

    $Name.set('James Joyce');
    expect($Name.get()).toBe('James Joyce');
    expect($FirstName.get()).toBe('James');
    expect($LastName.get()).toBe('Joyce');
  });

  it('runs `set` opeartions atomically', () => {
    const $A = derivable.atom('a');
    const $B = derivable.atom('b');

    let numReactions = 0;
    $A.react(() => {
      numReactions++;
    }, { skipFirst: true });
    $B.react(() => {
      numReactions++;
    }, { skipFirst: true });

    derivable.proxy({
      get: () => {},
      set: () => {
        $A.set('A');
        expect(numReactions).toBe(0);
        $B.set('B');
        expect(numReactions).toBe(0);
      }
    }).set();
    expect(numReactions).toBe(2);
  });
});
