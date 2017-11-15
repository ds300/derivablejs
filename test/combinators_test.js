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

test('or function', () => {
  const a = derivable.atom(1);
  const b = derivable.atom(2);
  const c = derivable.atom(3);
  const result = derivable.or(a, b, c);
  expect(result.get()).toBe(1);

  a.set(1);
  b.set(0);
  c.set(0);
  expect(result.get()).toBe(1);

  a.set(0);
  b.set(2);
  c.set(0);
  expect(result.get()).toBe(2);

  a.set(0);
  b.set(0);
  c.set(3);
  expect(result.get()).toBe(3);

  a.set(null);
  b.set(0);
  c.set(false);
  expect(result.get()).toBe(false);
});

test('or method', () => {
  const a = derivable.atom(1);
  const b = derivable.atom(2);
  expect(a.or(b).get()).toBe(1);
});

test('mOr function', () => {
  const a = derivable.atom(null);
  const b = derivable.atom(0);
  const c = derivable.atom(false);
  const result = derivable.mOr(a, b, c);
  expect(result.get()).toBe(0);

  c.set(false);
  a.set(null);
  b.set(null);
  expect(result.get()).toBe(false);
});

test('mOr method', () => {
  const a = derivable.atom(null);
  const b = derivable.atom(0);
  expect(a.mOr(b).get()).toBe(0);
});

test('and function', () => {
  const a = derivable.atom(1);
  const b = derivable.atom(2);
  const c = derivable.atom(3);
  const result = derivable.and(a, b, c);
  expect(result.get()).toBe(3);

  c.set(0);
  expect(result.get()).toBe(0);

  b.set(false);
  expect(result.get()).toBe(false);

  a.set(null);
  expect(result.get()).toBe(null);
});

test('and method', () => {
  const a = derivable.atom(1);
  const b = derivable.atom(2);
  expect(a.and(b).get()).toBe(2);
});

test('mAnd function', () => {
  const a = derivable.atom(1);
  const b = derivable.atom(2);
  const c = derivable.atom(3);
  const result = derivable.mAnd(a, b, c);
  expect(result.get()).toBe(3);

  b.set(null);
  expect(result.get()).toBe(null);

  a.set(false);
  b.set(false);
  c.set(0);
  expect(result.get()).toBe(0);
});

test('mAnd method', () => {
  const a = derivable.atom(0);
  const b = derivable.atom(null);
  expect(a.mAnd(b).get()).toBe(null);
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
