# ratom.js

ratom.js is a JavaScript re-imagining of [Reagent's](http://github.com/reagent-project/reagent) **r**(eactive)**atom**ic reference type.

### Uh... You what mate?

Consider the cells on a spreadsheet. A keen observer might mentally place them in two distinct categories:

1. Those which contain a number or a string or some other primitive immutable value, and may only be changed manually.
2. Those which dynamically generate their values depending on the contents of other cells.

The special thing about these cells is that the second kind update automatically when the first kind are changed. We don't need to hit a refresh button. The same is true of our pie charts and scatter plots which are much like the second kinds of cells except they produce an exciting picture rather than a boring number.

A `ratom` is like the first kind of cell. It holds an ordinary value and that value can be changed only manually (i.e. by calling .set on the `ratom`). Other kinds of cell can derive their values from the `ratom`'s value and be dynamically updated when it's (the `ratom`'s) value changes.

```javascript
let firstName = Ratom.atom("John");

let greeting = firstName.derive(nm => `Hello ${nm}!`);

console.log(greeting.get()); // $> Hello John!

firstName.set("Wilbur");

console.log(greeting.get()); // $> Hello Wilbur!
```

*(I'm going to be using es2015 syntax and features here. If that bothers you... well ok whatever, I guess.)*

Yep, it's automa*t*ic. Let's give that derivation function a side effect to see what's going on under the hood:

```javascript
let greeting2 = firstName.derive(nm => {
    console.log("deriving greeting for", nm);
    return `What you saying, ${nm}?`;
});

// nothing happens

console.log(greeting2.get()); // $> deriving greeting for Wilbur
                              // $> What you saying, Wilbur?

firstName.set("Wilbur");

// nothing happens

console.log(greeting2.get()); // $> What you saying, Wilbur?

firstName.set("Tigran");

// nothing happens

console.log(greeting.get());  // $> Hello Tigran!
console.log(greeting2.get()); // $> deriving greeting for Tigran
                              // $> What you saying, Tigran?
```

Notice the lack of side effects when `firstName` is set to `"Wilbur"` this second time. If a value doesn't change, then neither do the values that depend on it. Also notice, when `firstName` is set to `"Tigran"`, that the side effects for `greeting2` are observed only when `greeting2` is dereferenced. Values are *lazy*. They are only calculated when they absolutely need to be.

Up until this point, those of you familiar with Rx/Observables and/or FRP might have been thinking "Isn't this just a reactive stream with .dedupe called everywhere?". Now you know better: Laziness sets the `ratom` apart.

And but still one piece of the puzzle remains: The dynamic cells in a spreadsheet don't require us to call a `.get` method to see their most current value. They somehow stay up-to-date without intervention. Reactive streams give us a `.forEach` or equivalent facility for registering a callback on incoming values. This doesn't suit our needs for a couple of reasons:

- Derived values might depend on a whole set of other values, and that set might change over time. You don't want to have to manage registering and de-registering callbacks for a bunch of different values with maybe-different lifecycles and all that noise. Yuck.
- Laziness. Remember: derived values are calculated only when requested. They aren't really 'incoming' as such. In Callbackland, who does the requesting?

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

A `Reaction`, created by calling `.react(f)`, is our version of a callback registry. It does some funky but totally kosher stuff to figure out which values it depends on. When an `ratom` is changed, dependent `Reaction`s (not necessarily directly dependent) are notified and they traverse their dependency tree looking for changes and, if they find any, update themselves and any intermediate values. This lets us implement a kind of garbage collection, so you don't need to worry about keeping track of `.derive`d values or `ratom`s. And you only need to keep track of `Reaction`s if you don't want them to keep reacting forever. They can also `.release()` themselves (by calling `this.release()`) so if their lifecycle depends on the same values they depend on, you don't even need to keep track of them.

```javascript
let iters = Ratom.atom(0);
setInterval(() => iters.swap(i => i+1), 1000);
Ratom.react(() => {
  if (iters.get() >= 100) {
    this.release();
  } else {
    console.log(greeting.get());
  }
});
```
