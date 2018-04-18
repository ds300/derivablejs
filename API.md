## API

### Atom

Atoms are simple mutable references to immutable values. They represent the
ground truth from which all else is derived.

```js
const myAtom = atom(`a string`);

myAtom.get();
// => `a string`

myAtom.set("the string");

myAtom.get();
// => `the string`
```

#### `atom(value: mixed): Atom`

Returns a new `Atom` containing `value`.

#### `.set(value: mixed): void`

Sets the value of this atom to be `value`.

#### `.get(): mixed`

Returns the current value of the atom.

#### `.update((value: mixed, ...args) => mixed, ...args): void`

Sets the value of this atom to be the value returned when `f` is applied to the
current value of this and `...args`.

#### `.proxy(descriptor): Proxy`

Coming soon...

#### `.derive(mixed => mixed): Derivation`

See [Derivation](#derivation)

#### `.maybeDerive(mixed => mixed): Derivation`

See [Derivation](#derivation)

#### `.orDefault(mixed | Atom | Derivation | Proxy): Derivation`

See [Derivation](#derivation)

#### `.react(mixed => void, opts: Lifecycle): void`

See [Reactions](#reactions).

#### `.maybeReact(mixed => void, opts: Lifecycle): void`

See [Reactions](#reactions).

### Derivation

Derivations are declarative transformations of values held in atoms. Unlike
atoms, derivations cannot be modified in-place with a '.set' method. Their
values change only when one or more of the values that they depend upon change.

#### `derive(() => mixed): Derivation`

Returns a new derivable encapsulating the result returned by `f` which should be
pure aside from dereferencing one or more Derivables.

```js
const x = atom(1);
const y = atom(2);

const z = derive(() => x.get() + y.get());

z.get();
// => 3

x.set(2);
z.get();
// => 4
```

#### `.derive(mixed => mixed): Derivation`

Creates a new derivation based on the application of `f` to the current value of
this derivable. e.g.

```js
const x = atom(4);
const twice = x.derive(d => d * 2);

twice.get();
// => 8
```

#### `.maybeDerive(mixed => mixed): Derivation`

Creates a new derivation based on the application of `f` to the current non-null
value of this derivable.

```js
const x = atom(null);
const twice = x.derive(d => d * 2);
const maybeTwice = x.maybeDerive(d => d * 2);

maybeTwice.get();
// => null

twice.get();
// throws error because we try to multiply null by 2
```

#### `.orDefault(value: mixed | Derivable): Derivation`

Creates a new derivation with non-null value of base derivable or `value` if
base is `null` or `undefined`. Perfect combination with `maybeDerive` method.

```js
const x = atom(null);

const twice = x.maybeDerive(d => d * 2).orDefault(2);

twice.get();
// => 2

x.set(3);
twice.get();
// => 6
```

#### `.react(mixed => void, opts: Lifecycle): void`

See [Reactions](#reactions).

#### `.maybeReact(mixed => void, opts: Lifecycle): void`

See [Reactions](#reactions).

### Proxy

Coming soon...

### Reactions

Reaction allows you to react on changes happend in any derivable item (atom,
derivation or proxy). Reaction method accepts callback and lifecycle options

#### Lifecycle

**from: Derivable<boolean> | (Derivable => boolean)**

Used to determine the start of the reactor's lifecycle. When it becomes truthy,
the reactor is initialized. After which point this property is not used.

**when: Derivable<boolean> | (Derivable => boolean)**

Causes the reactor to be started and stopped based on the truthiness of the
given condition.

**until: Derivable<boolean> | (Derivable => boolean)**

Used to determine the end of a reactor's lifecycle. When it becomes truthy the
reactor is killed, after which point the reactor will never be used again and is
eligible for garbage collection.

**skipFirst: boolean**

Causes the first invocation (and only the first invocation) of the reactor to be
ingored.

**once: boolean**

Causes the reactor to be killed immediately following its first invocation (not
counting the skipped invocation, if `skipFirst` is set to true).

#### `.react(mixed => void, opts: Lifecycle): void`

Accept callback with current derivable value and [Lifecycle](#lifecycle).

#### `.maybeReact(mixed => void, opts: Lifecycle): void`

Accept callback which is called with current derivable value if the value is not
null or undefined and [Lifecycle](#lifecycle).

### Transaction

#### `transact(() => void): void`

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

#### `transaction((...args) => void): (...args) => void`

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

#### `atomically(() => void): void`

As `transact` but will not create a (nested) transaction if already in a
transaction.

#### atomic((...args) => void): (...args) => void

As `transaction` but will not create a (nested) transaction if the returned
function is invoked within a transaction.

#### `ticker(): t`

Creates a new ticker

**t.tick(): void**

Runs all pending reactions

**t.release(): void**

Releases this ticker, rendering it useless

### Utils

#### `setDebugMode(debugMode: boolean): void`

Enable or disable debug mode.

This causes Errors to be created (but not thrown) alongside derivations in order
to capture the stack trace at their point of instantiation. In case a derivation
throws an error itself when being computed, its instantiation stack trace is
logged such that it becomes easy to determine exactly which derivation is
throwing. Creating errors is quite slow, so you probably should not keep this
enabled for production.

#### `isAtom(value: mixed): boolean`

Returns true if passed value is an Atom.

#### `isDerivation(value: mixed): boolean`

Returns true if passed value is a derivation, i.e. a derivable which is not an
atom.

#### `isProxy(value: mixed): boolean`

Returns true if passed value is a proxy of atoms.

#### `isDerivable(value: mixed): boolean`

Returns true if passed value is any of atoms or derivations.

#### `struct(value: Object | Array): Derivable`

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

#### `unpack(value: Derivable | mixed): mixed`

If passed value is derivable, returns value.get(), otherwise returns value.

#### `captureDereferences(() => void): Array<Derivable>`

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
