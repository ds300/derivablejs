# ratom.js

ratom.js is a JavaScript re-imagining of [Reagent's](http://github.com/reagent-project/reagent) r(eactive)atom(ic) reference type.

### You what mate?

Consider the cells on a spreadsheet. A keen observer might mentally place them in two distinct categories:

1. Static cells. Those which contain a value that you manually typed in.
2. Dynamic cells. Those which automatically determine their values based on the contents of other cells, csv files, today's date, or whatever.

The extra-special thing about dynamic cells, the thing we want to emulate here, is that they update themselves when their inputs change. No need to click a refresh button, *it just works*. The same is true of our pie charts and scatter plots which are much like dynamic cells except they produce an exciting picture rather than some tedious number.

Concretely, these two constructs roughly map to ratom.js's `ReactiveAtom` and `DerivativeValue` types.

- `ReactiveAtom`s are like static cells. They hold some piece of data and may only be mutated manually.
- `DerivativeValue`s are like dynamic cells. They hold some piece of data, but it can not be set manually and is generated dynamically by some function which dereferences existing `DerivativeValue`s or `ReactiveAtom`s.

A quick example.

```javascript
import {atom, derive} from 'ratom';

const hello = nm => `Hello ${nm}!`;

const firstName = atom("John");

console.log(firstName.get()) // $> John

let greeting = firstName.derive(hello);

console.log(greeting.get()); // $> Hello John!

firstName.set("Wilbur");

console.log(greeting.get()); // $> Hello Wilbur!

let surname = atom("Force");

let fullName = derive(() => `${firstName.get()} ${surname.get()}`);

greeting = fullName.derive(hello);

console.log(greeting.get()); // $> Hello Wilbur Force!
```

*"But you're manually calling `.get()` all the time. That's not automatic."*

Right you are! That's why I said *roughly*. There is actually another construct in play here: the `Reaction`.

Programs don't have eyes, there is no need for an evergreen gestalt. Consequently, `DerivativeValue`s are totally lazy. They only update themselves when they are dereferenced via `.get()` **and** their input values have changed.

A `Reaction` is like a `DerivativeValue` for which there is no need to call `.get()`. In fact they store no values so `Reaction`s have no `.get()` method. Rather, they are for producing side-effects.

```javascript
let sayHello = greeting.react(msg => console.log(msg));
// $> Hello Wibur Force!

firstName.set("Tigran");
// $> Hello Tigran Force!
surname.set("Hamasyan");
// $> Hello Tigran Hamasyan!

```



```javascript
let greeting2 = firstName.derive(nm => {
    console.log("deriving greeting for", nm);
    return `What you saying, ${nm}?`;
});

// nothing happens

console.log(greeting2.get()); // $> deriving greeting for Wilbur
                              // $> What you saying, Wilbur?

firstName.set("Wilbur");

// tumbleweeds roll by

console.log(greeting2.get()); // $> What you saying, Wilbur?

firstName.set("Tigran");

// the faint sound of crickets chirping outside

console.log(greeting.get());  // $> Hello Tigran!
console.log(greeting2.get()); // $> deriving greeting for Tigran
                              // $> What you saying, Tigran?
```

Notice the lack of side effects when `firstName` is set to `"Wilbur"` this second time. If a value doesn't change, then neither do the values that depend on it. Also notice, when `firstName` is set to `"Tigran"`, that the side effects for `greeting2` are observed only when `greeting2` is dereferenced. Values are *lazy*. They are only calculated when they absolutely need to be.

Those of you familiar with ReactiveX Observables and/or FRP might have been thinking "Aren't these just Observables with enforced `.dedupe()`?".

And but still one piece of the puzzle remains: The dynamic cells in a spreadsheet don't require us to call a `.get` method to see their most current value. They somehow stay up-to-date without intervention. Reactive streams give us a `.forEach` or equivalent facility for registering a callback on incoming values. This doesn't suit our needs for a couple of reasons:

- Derived values might depend on a whole set of other values, and that set might change over time. You don't want to have to manage registering and de-registering callbacks for a bunch of different values with maybe-different lifecycles and all that noise. Yuck.
- Laziness. Remember: derived values are calculated only when requested. They aren't really 'incoming' as such. In Callbackland who does the requesting?

A solution brought to you with the lightest sprinkling of fairy dust, the faintest whiff of magic:

```javascript
let hasSurname = Ratom.atom(true);
setInterval(() => hasSurname.swap(hs => !hs), 1000);

let surname = Ratom.atom("Hamasyan");

let reaction = Ratom.react(() => {
  if (hasSurname.get()) {
    console.log(`Hey you're ${firstName.get()} ${surname.get()}!`);
  } else {
    console.log(greeting.get());
  }
});


// output now alternating at 1s intervals between
// $> Hey you're Tigran Hamasyan!
// and
// $> Hello Tigran!

// until we call:

reaction.release();

// we could achieve the same effect with:

let greeting3 = Ratom.derive(() => {
  if (hasSurname.get()) {
    return `Hey you're ${firstName.get()} ${surname.get()}!`
  } else {
    return greeting.get();
  }
});

let reaction = greeting3.react(msg => console.log(msg));

// it's just a question of whichever is cleanest for the situation.
```

A `Reaction`, created by calling `.react(f)`, is our version of a callback registry. It does some funky but totally kosher stuff to figure out which values it depends on. When an `ratom` is changed, dependent `Reaction`s (not necessarily directly dependent) are notified and they traverse their dependency tree looking for changes and, if they find any, update themselves and any intermediate values. This lets us implement a kind of garbage collection, so you don't need to worry about keeping track of `.derive`d values or `ratom`s. And you only need to keep track of `Reaction`s if you don't want them to keep reacting forever. They can also `.release()` themselves (by calling `this.release()`) so if their lifecycle depends on a reactive value, you don't need to keep track of them at all.

```javascript
todo: good example
```
