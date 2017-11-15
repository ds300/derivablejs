'use strict';

const derivable = require('../dist/derivable');

test('map derivable value with function', () => {
  {
    const a = derivable.atom(1);
    const q = derivable.atom(10);
    const b = derivable.map(d => d + q.get(), a);
    const c = derivable.map(d => d * q.get(), b);
    expect([b.get(), c.get()]).toEqual([11, 110]);

    q.set(20);
    expect([b.get(), c.get()]).toEqual([21, 420]);

    a.set(null);
    expect([b.get(), c.get()]).toEqual([20, 400]);

    expect(() => {
      derivable.atom().map();
    }).toThrow();
  }

  {
    const a = derivable.atom(1);
    const q = derivable.atom(10);
    const b = a.map(d => d + q.get());
    const c = b.map(d => d * q.get());
    expect([b.get(), c.get()]).toEqual([11, 110]);

    q.set(20);
    expect([b.get(), c.get()]).toEqual([21, 420]);

    a.set(null);
    expect([b.get(), c.get()]).toEqual([20, 400]);

    expect(() => {
      derivable.map();
    }).toThrow();
  }
});

test('maybe map derivable (non-null) value with function', () => {
  {
    const a = derivable.atom(1);
    const q = derivable.atom(10);
    const b = derivable.mMap(d => d + q.get(), a);
    const c = derivable.mMap(d => d * q.get(), b);
    expect([b.get(), c.get()]).toEqual([11, 110]);

    q.set(20);
    expect([b.get(), c.get()]).toEqual([21, 420]);

    a.set(null);
    expect([b.get(), c.get()]).toEqual([null, null]);

    expect(() => {
      derivable.atom().map();
    }).toThrow();
  }

  {
    const a = derivable.atom(1);
    const q = derivable.atom(10);
    const b = a.mMap(d => d + q.get());
    const c = b.mMap(d => d * q.get());
    expect([b.get(), c.get()]).toEqual([11, 110]);

    q.set(20);
    expect([b.get(), c.get()]).toEqual([21, 420]);

    a.set(null);
    expect([b.get(), c.get()]).toEqual([null, null]);

    expect(() => {
      derivable.map();
    }).toThrow();
  }
});

test('is method', () => {
  const a = derivable.atom(1);
  const b = derivable.atom(1);
  const fst = a.is(b);
  const snd = b.is(a);
  expect(fst.get()).toBeTruthy();
  expect(snd.get()).toBeTruthy();

  a.set({ equals: () => true });
  b.set({ equals: () => false });
  expect(fst.get()).toBeTruthy();
  expect(snd.get()).toBeFalsy();
});
