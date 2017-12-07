// @flow

import type { Atom, Derivable, Proxy } from "../derivable.js";
import {
  atom,
  proxy,
  transaction,
  atomic,
  derive,
  unpack,
  __captureDereferences,
  __Reactor
} from "../derivable.js";

const testAtom = () => {
  const a: Atom<number> = atom(1);

  a.update((d: number) => d + 1);
  // $ExpectError
  a.update((d: string) => d);
  // $ExpectError
  a.update(d => String(d));
  // $ExpectError
  a.update();

  a.update((d, x) => d + x, 1);
  // $ExpectError
  a.update((d, x) => d + x, "1");

  a.update((d, x, y) => d + x + y, 1, 2);
  // $ExpectError
  a.update((d, x, y) => d + x + y, 1, "2");

  a.update((d, x, y, z) => d + x + y + z, 1, 2, 3);
  // $ExpectError
  a.update((d, x, y, z) => d + x + y + z, 1, 2, "3");

  a.update((d, x, y, z, u) => d + x + y + z + u, 1, 2, 3, 4);
  // $ExpectError
  a.update((d, x, y, z, u) => d + x + y + z + u, 1, 2, 3, "4");

  // TODO should be an error
  a.update((d, x, y, z, u, w) => d + x + y + u + w, 1, 2, 3, 4);
  // $ExpectError
  a.update((d, x, y, z, u, w) => d + x + y + u + w, 1, 2, 3, 4, 5);
};

const testProxy = () => {
  const a: Proxy<number> = proxy({ get: () => 1, set: (d: number) => {} });
  // $ExpectError
  const b: Proxy<number> = proxy({ get: () => "1", set: (d: number) => {} });
  // $ExpectError
  const c: Proxy<number> = proxy({ get: () => 1, set: (d: string) => {} });

  const d: number = a.get();
  // $ExpectError
  const e: string = a.get();

  a.update((d: number) => d + 1);
  // $ExpectError
  a.update((d: string) => d);
  // $ExpectError
  a.update(d => String(d));
  // $ExpectError
  a.update();

  a.update((d, x) => d + x, 1);
  // $ExpectError
  a.update((d, x) => d + x, "1");

  a.update((d, x, y) => d + x + y, 1, 2);
  // $ExpectError
  a.update((d, x, y) => d + x + y, 1, "2");

  a.update((d, x, y, z) => d + x + y + z, 1, 2, 3);
  // $ExpectError
  a.update((d, x, y, z) => d + x + y + z, 1, 2, "3");

  a.update((d, x, y, z, u) => d + x + y + z + u, 1, 2, 3, 4);
  // $ExpectError
  a.update((d, x, y, z, u) => d + x + y + z + u, 1, 2, 3, "4");

  // TODO should be an error
  a.update((d, x, y, z, u, w) => d + x + y + u + w, 1, 2, 3, 4);
  // $ExpectError
  a.update((d, x, y, z, u, w) => d + x + y + u + w, 1, 2, 3, 4, 5);
};

function testDeriveMethod() {
  const a: Atom<number> = atom(21);
  const b: Atom<?number> = atom(21);

  const c = a.derive(v => v * 2);
  // $ExpectError
  const d = b.derive(v => v * 2);

  const e: number = c.get();

  // $ExpectError
  const f: string = c.get();
}

function testMaybeDeriveMethod() {
  const a: Atom<number> = atom(21);
  const b: Atom<?number> = atom(21);

  const c = a.maybeDerive(v => v * 2);
  const d = b.maybeDerive(v => v * 2);

  const e: ?number = c.get();

  // $ExpectError
  const f: string = c.get();

  const g: ?number = d.get();

  // $ExpectError
  const h: number = d.get();
}

function testOrDefaultMethod() {
  const a: Atom<?number> = atom(1);
  const b: Derivable<number> = a.orDefault(2);
  // $ExpectError
  const c: Derivable<number> = a.orDefault("2");
  // $ExpectError
  const d: Derivable<number> = a.orDefault(atom(2));
  // $ExpectError
  const e: Derivable<?number> = a.orDefault(null);
}

function testDerive() {
  const a: Atom<number> = atom(21);

  // $ExpectError
  a.set("ok");

  const b: Atom<?number> = atom(null);

  // $ExpectError
  const c: string = a.get();

  a.set(42);

  const d = derive(() => a.get() * 2);

  // $ExpectError
  const e = derive(() => a * 2);

  // $ExpectError
  const f = derive(() => b.get() * 2);

  // $ExpectError
  const d: string = d.get();

  const e: number = d.get();
}

function testReactions() {
  let c: Atom<?{ x: number }> = atom(null);
  const condition = atom(true);

  c.react(v => {
    // $ExpectError: v might be null
    console.log(v.x);
  });

  c.react(v => {}, {
    from: d => {
      const v = d.get();
      // $ExpectError: v might be null
      return Boolean(v.x);
    },
    when: d => {
      const v = d.get();
      // $ExpectError: v might be null
      return Boolean(v.x);
    },
    until: d => {
      const v = d.get();
      // $ExpectError: v might be null
      return Boolean(v.x);
    },
    skipFirst: true,
    once: false
  });

  c.maybeReact(v => {
    console.log(v.x);
  });

  c.maybeReact(v => {}, {
    from: condition,
    when: condition,
    until: condition,
    skipFirst: true,
    once: false
  });
}

function testTransaction() {
  let plusOne = (a: number) => a + 1;

  let tPlusOne = transaction(plusOne);

  let aPlusOne = atomic(plusOne);

  let twentyTwo: number = tPlusOne(21);
  let twentyThree: number = aPlusOne(22);

  let add = (a: number, b: number) => a + b;

  let tAdd = transaction(add);
  let aAdd = atomic(add);

  let four: number = tAdd(2, 2);
  let five: number = tAdd(2, 2);

  // $ExpectError: arg should be a function
  transaction(42);

  // $ExpectError: arg should be a function
  atomic("oops");
}

function testWithEquality() {
  let a: Atom<{ x: number }> = atom({ x: 42 });
  let b: Derivable<{ x: number }> = a.withEquality((a, b) => {
    return a.x === b.x;
  });
  let c: Derivable<{ x: number }> = a.withEquality((a, b) => {
    // $ExpectError: y does not exist
    return a.y === b.y;
  });
}

function testUnpack() {
  const a: number = unpack(atom(1));
  const b: number = unpack(1);
  // $ExpectError
  const c: number = unpack(atom("1"));
  // $ExpectError
  const d: number = unpack("1");
}

const testCaptureDereferences = () => {
  const captured = __captureDereferences(() => {});

  const items1: $ReadOnlyArray<mixed> = captured.map(d => d.get());
  // $ExpectError: notMethod does not exists in derivable
  const items2: $ReadOnlyArray<mixed> = captured.map(d => d.notMethod());
};

const testReactor = () => {
  const r1 = new __Reactor(atom(1), (d: number) => {});
  // $ExpectError: atom type is number
  const r2 = new __Reactor(atom(1), (d: string) => {});

  (r1.start(): void);
  (r1.stop(): void);
  (r1.force(): void);
};
