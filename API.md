```
type Derivable<T> = {
  derive<E>(f: (value: T) => E): Derivable<E>;
  maybeDerive<E>(f: $NonMaybeType<T> => E): Derivable<E>;
  orDefault<E>(value: $NonMaybeType<E>): Derivable<$NonMaybeType<T> | E>;
  react(f: (value: T) => void, options?: Lifecycle<T>): void;
  maybeReact(f: (value: $NonMaybeType<T>) => void, options?: Lifecycle<T>): void;
  get(): T;
  is(other: mixed): Derivable<boolean>;
  withEquality(equals: (a: T, b: T) => *): Derivable<T>;
};

type CompositeProxy<T> = {
  get(): T;
  set(value: T): void;
};

type Lifecycle<T> = {
  +from?: (((d: Derivable<T>) => boolean) | Derivable<boolean>);
  +when?: (((d: Derivable<T>) => boolean) | Derivable<boolean>);
  +until?: (((d: Derivable<T>) => boolean) | Derivable<boolean>);
  +skipFirst?: boolean;
  +once?: boolean;
};

function atom<T>(value: T): Atom<T>;

type Atom<T> = Derivable<T> & {
  set(value: T): void;
  update(f: (value: T, ...args: Array<mixed>) => T, ...args: Array<mixed>): void;
  proxy<E>(proxy: Proxy<T, E>): Atom<E>;
};

proxy(descriptor: Proxy): CompositeProxy

type Proxy<ParentType, ChildType> = {
  get(source: ParentType): ChildType;
  set(source: ParentType, value: ChildType): ParentType;
};

function derive<T>(f: () => T): Derivable<T>;
```

### Transaction

#### transact(fn)

Executes passed function in the context of a transaction.

In a transactional context, changes to atoms do not have side effects. All
changes made during the transaction are propagated for side effects when the
transaction commits.

```js
const firstName = `Joe`,
      lastName = `Schmoe`;

derive`My name is ${firstName} ${lastName}`.react(
  x => console.log(x);
);
// $> My name is Joe Schmoe
```

All good, but now we want to change the name to Tigran Hamasayan.

```js
firstName.set(`Tigran`);
// $> My name is Tigran Schmoe
```

Doh! Tigran Schmoe isn't a person! We certainly don't want reactors to think he
is, that could be totally confusing for someone.

`transact` to the rescue! Let's abort the previous mission and try changing the
name to William Blake without ever having a William Schmoe.

```js
transact(() => {
  firstName.set(`William`);
  lastName.set(`Blake`);
});
// $> My name is William Blake
```

#### transaction(fn): Function

Wraps passed function such that its body is executed in a transaction. Preserves
its input and output semantics.

```js
const firstName = `Joe`,
lastName = `Schmoe`;

derive`My name is ${firstName} ${lastName}`.react(
  x => console.log(x);
);
// $> My name is Joe Schmoe

setTimeout(transaction(() => {
  firstName.set(`William`);
  lastName.set(`Blake`);
}), 1000);

// ... 1 second later ...
// $> My name is William Blake
```

#### atomically(fn)

As `transact` but will not create a (nested) transaction if already in a
transaction.

#### atomic(fn): Function

As `transaction` but will not create a (nested) transaction if the returned
function is invoked within a transaction.

#### ticker(): t

Creates a new ticker

**t.tick()**

Runs all pending reactions

**t.release()**

Releases this ticker, rendering it useless

### Utils

#### setDebugMode(debugMode: boolean)

Enable or disable debug mode.

This causes Errors to be created (but not thrown) alongside derivations in order
to capture the stack trace at their point of instantiation. In case a derivation
throws an error itself when being computed, its instantiation stack trace is
logged such that it becomes easy to determine exactly which derivation is
throwing. Creating errors is quite slow, so you probably should not keep this
enabled for production.

#### isAtom(value): boolean

Returns true if passed value is an Atom.

#### isDerivation(value): boolean

Returns true if passed value is a derivation, i.e. a derivable which is not an
atom.

#### isProxy(value): boolean

Returns true if passed value is a proxy of atoms.

#### isDerivable(value): boolean

Returns true if passed value is any of atoms or derivations.

#### struct(objectOrArray): Derivable

Given some plain JavaScript `Object` or `Array` (or some nested combination
thereof) containing one or more derivable things, returns a new derivable
representing the input collection with unpacked values. e.g.

```js
const a = atom(`Andrew`),
  b = atom(`Bernice`),
  c = atom(`Charlie`);

const together = struct({ a: a, bandc: [b, c] });

together.react(names => {
  console.log(`A stands for ${names.a}`);
  console.log(`B stands for ${names.bandc[0]}`);
  console.log(`C stands for ${names.bandc[1]}`);
});
// $> A stands for Andrew
// $> B stands for Bernice
// $> C stands for Charlie

c.set(`Chris`);
// $> A stands for Andrew
// $> B stands for Bernice
// $> C stands for Chris
```

#### unpack(value): any

If passed value is derivable, returns value.get(), otherwise returns value.

#### captureDereferences(fn): Array

<Derivable>

Returns array of all changed derivables with reactions inside passed function.
e.g.

```js
const captured = captureDereferences(() => {
  const a = atom(1);
  const b = atom(2);
  const sum = derive(() => a.get() + b.get());

  sum.react(d => {
    console.log(d);
  });

  a.react(d => {
    console.log(d);
  });
});
/*
  Atom(1)
  Derivation(3)
  and a few internal derivations
*/
```
