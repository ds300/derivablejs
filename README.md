# ratom.js
Reactive values for Derived Data All The Way Down

## {greeting}, {name}!

```javascript
import {atom, derive, transact} from 'ratom'

// static constants
const greetings = {
  en: "Hello",
  de: "Hallo",
  es: "Hola",
  cn: "您好",
  fr: "Bonjour"
};

// applicaiton state
const countryCode = atom("en");
const name = atom("World");

// state derivation
const greeting = countryCode.derive(cc => greetings[cc]);
const message = derive`${greeting}, ${name}!`;

// side-effecting reaction
message.react(msg => console.log(msg)); // $> Hello, World!

// state change
countryCode.set("de"); // $> Hallo, World!
name.set("Dieter"); // $> Hallo, Dieter!

transact(() => {
  countryCode.set("fr");
  name.set("Étienne");
});

// $> Bonjour, Étienne!
```

## Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Rationale](#rationale)
- [Comparison with Previous Work](#comparison-with-previous-work)
- [Model](#model)
- [Algorithms and Data Structures](#algorithms-and-data-structures)
    - [Colors](#colors)
    - [Data At Rest](#data-at-rest)
    - [Query](#query)
    - [In Motion](#in-motion)
    - [Mark and Sweep](#mark-and-sweep)
    - [In Transaction](#in-transaction)
- [API](#api)
  - [Types](#types)
    - [`Atom`](#atom)
      - [Methods](#methods)
        - [`.set(newValue)`](#setnewvalue)
        - [`.get()`](#get)
        - [`.derive(fn)`](#derivefn)
        - [`.reaction(fn)`](#reactionfn)
        - [`.react(fn)`](#reactfn)
        - [`.swap(fn, ...args)`](#swapfn-args)
        - [`.lens(lensDescriptor)`](#lenslensdescriptor)
    - [`Lens`](#lens)
      - [Lens Descriptors](#lens-descriptors)
      - [Methods](#methods-1)
        - [`.set(newValue)`](#setnewvalue-1)
        - [`.get()`](#get-1)
        - [`.derive(fn)`](#derivefn-1)
        - [`.reaction(fn)`](#reactionfn-1)
        - [`.react(fn)`](#reactfn-1)
        - [`.swap(fn, ...args)`](#swapfn-args-1)
        - [`.lens(lensDescriptor)`](#lenslensdescriptor-1)
    - [`Derivation`](#derivation)
  - [Top-level functions](#top-level-functions)
    - [`atom`](#atom)
- [Hire Me](#hire-me)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Rationale

Monolithic MV[whatever] frameworks tend to encourage keeping application state in disparate little mutable chunks, tightly coupled to the [whatever] bits. Think Angular Scopes, Ember Models, Knockout View Models, etc. Such frameworks typically have no story for keeping these little mutable state chunks in sync with each other, or even with the ground-truth M which is often behind some callback-heavy API wall. This is fine if your app is small and simple.

Alas, many small and simple apps eventually become large and complex apps. Likewise, large and complex apps invariably become larger and more complex. Working on such a project, one might find oneself coming to the conclusion that orchestrating state consistency across dozens of mutable interdependent components in the face of asynchronous everything and the inevitable ad-hoc cross-cutting concerns which don't jibe with the rigid authoritarian architectures you once imagined to be boundlessly flexible is extremely—*painfully*—difficult. Difficult. Lemon difficult.

The solution to this problem seems to be something involving 'unidirectional data flow', as popularized by Facebook's [Flux](https://facebook.github.io/flux/) architecture. But the most direct source of inspiration for this library is actually [re-frame](https://github.com/day8/re-frame). Specifically re-frame's README which is, in part, a remarkable and compelling discourse on the particular brand of Flux-ishness ratom.js aims to serve. So **go read the re-frame README**. For reals. Do it.

But because you're a busy person and I'm into the whole brevity thing, here's the tl;dr:

> Keeping disparate pieces of mutable state consistent is hard. Keeping one piece of immutable state consistent is a matter of course. Let's do the latter.

The goal of ratom.js is to make it easy to build complex applications around global immutable state.

## Comparison with Previous Work

The idea for, name of, and api nomenclature used in this library were directly inspired by [Reagent](https://github.com/reagent-project/reagent). Reagent credits the reactive atom idea to [Reflex](https://github.com/lynaghk/reflex) which in turn cites [Knockout's Observables](http://knockoutjs.com/documentation/observables.html). Another high-quality ClojureScript solution is [javelin](https://github.com/tailrecursion/javelin). The [silk.co](http://silk.co) engineering team [have apparently done something similar](http://engineering.silk.co/post/80056130804/reactive-programming-in-javascript) but it doesn't seem to be publicly available.

The key advantage ratom.js has over all the above is that it uses a novel approach for change propagation\* which invloves a GC-inspired 3-phase mark-react-sweep algorithm. It provides two significant benefits:

- Fully automatic memory management. This makes the library ergonomic and practical to use on its own rather than as part of a framework. *Nobody else does this, AFAICT*
- Almost total laziness\*\*. This allows derivation graphs to incorporate short-circuiting boolean logic. Note also that no tradeoff is made with regard to push-based flow; reactions are instantaneous and glitch-free.

Other advantages which may not each apply to every project mentioned above include:

- It is a standalone library (jumping on the 'unix philosophy' bandwagon), not tied to a UI framework.
- It encourages a cleaner separation of concerns. e.g. decoupling pure derivation from side-effecting change listeners.
- It has good taste, e.g. prohibiting cyclical updates (state changes causing state changes), dealing gracefully with 'dead' derivation branches, etc.

\* I'm pretty sure. I did a lot of digging.

\*\* Potentially-wasteful recomputations seem to be a necessary side effect of fully automatic memory management. In normal usage, however, they should be extremely rare.

## Model

There are three main types exposed by ratom.js:

- **Atoms** are mutable references but are intended to hold immutable, or effectively immutable, data.
- **Derivations** represent applications of pure functions to upstream values.
- **Reactions** are passive observers reacting to changes in atoms or derivations. Unlike the above, they do not encapsulate a value and exist solely for side-effects.

These three types are connected together in DAGs with atoms at the roots. The example at the top of this document can be depicted as follows:

<img src="https://raw.github.com/ds300/ratom.js/master/img/example.svg" align="center" width="89%"/>

It is often inappropriate for reactions to persist for the entire lifetime of your application. As such they can be manually started and stopped, and have two overridable lifecycle methods: `.onStart()` and `.onStop()` which can be used as hooks for acquiring and releasing resources associated with the reaction.

The one remaining type is **Lenses** which enable [Om](https://github.com/omcljs/om)-ish [cursors](https://github.com/omcljs/om/wiki/Cursors), among other fancy transformations. Lenses are derivations with one parent: either an atom or another lens. They abstract over the `get` and `set` operations of their parent, allowing one to modify part of a root atom without explicitly knowing the particulars of it's structure (that knowledge is encoded in the lenses themselves).

## Algorithms and Data Structures

#### Colors

All nodes in a DDATWDDAG (Derived Data All The Way Down Directed Acyclic Graph... I think it'll catch on) have an associated color. There are four colors: **black**, **white**, **red**, and **green**.

Broadly speaking these mean the following:

* **Green:** This node needs evaluating.
* **White:** This node's value is up to date.
* **Red:** This node's value is up to date, but has changed during the current mark/sweep cycle.
* **Black:** This node's value is out of date, but doesn't necessarily need to be re-evaluated.

But there are some extra subtleties so do read on if you aren't already catatonic.

#### Data At Rest

An **atom** encapsulates the following data:

- Its color.
- Its current state.
- A set of direct children.

New atoms are **white**, have empty child sets, and a given state.

A **derivation** encapsulates the following data:

- Its color.
- Its current state.
- A set of direct children.
- A set of direct parents.
- A deriving function. This calculates the derivation's current state in terms of one or more atoms or other derivations.

New derivations are **green**, have empty child and parent sets, and no state.

A **reaction** encapsulates the following data:

- Its color.
- Its parent.
- Its activity status (active or inactive).
- A reacting function. This is called for side-effects each time the parent's value changes.

New reactions are **green** and inactive with their parent assigned.

#### Query

When an **atom** is dereferenced it simply returns its current state.

When a **derivation** is dereferenced its color is taken into consideration:

- **White** or **red**: Its current state is returned.
- **Green**: The derivation's deriving function is evaluated.

  This is done in a context which allows dereferences of direct parents to be monitored. Parent-child relationships are then set up by inserting the derivation into the child sets of the captured parents. Likewise, the set of captured parents becomes the derivation's parent set.

  If the derived value is equal to the derivation's current state, the derivation becomes **white** and it's current state is returned. Otherwise it becomes **red** while its current state becomes the newly-derived value. This value is then returned.

- **Black**: The child's parents are interrogated.

  If any of them are **red** the derivation must be re-evaluated as above. If any of the parents are **black** or **green** they are  dereferenced. If they then become **red**, the derivation must be re-evaluated as above. Otherwise all parents are **white** and therefore this derivation is set to **white** and it's current state is returned.

#### In Motion

When a **reaction** is started, it becomes active and places itself in its parent's child set. It then dereferences the parent to ensure there is a bidirectional link between it (the reaction) and any upstream atoms.

When a reaction is stopped, it becomes inactive and removes itself from its parent's child set in order to sever this link.

#### Mark and Sweep

When an **atom** is set, if the new value is equal to the current state, nothing happens.

Otherwise, the atom becomes **red**.

The atom's children are then traversed for the mark phase. If any of them are **white** or **red**, they are set to **black** and recursively traversed. Already-**black** children are not traversed. Any **reactions** which are encountered are placed in a queue. It is not possible to encounter **green** nodes at this stage, as **green** children have no consensual parents.

Once the mark phase is complete, the **reaction queue** is consumed, notifying the reactions that they may need to re-run themselves.

A **reaction** decides whether or not it needs to re-run by considering its parent's color. If the parent is **black** it is first dereferenced. Then, if the parent is **white**, it does not need to re-run. If the parent is **red** it does. It is not possible for the parent to be **green** at this stage, as **green** children have no consensual parents and atoms are never **green**.

Once all reactions have had a chance to re-run, the **atom**'s children are again traversed in the sweep phase. If any encountered nodes are **red**, they become **white** and traversal continues with their children. If any encountered nodes are **black**, they are removed from their parents' child sets and turned **green**. Any **white** encountered nodes are ignored. It is not possible to encounter **green** nodes during the sweep phase for the same reason as during the mark phase.

After the sweep phase, the atom becomes **white**.

#### In Transaction

During transactions, if an **atom** is modified, it becomes **red** and its new value is stored separately from it's out-of-transaction state. The mark phase is undertaken as usual. The reaction and sweep phases are delayed until the transaction commits, when the atom becomes white and its in-transaction value is propagated up to be its out-of-transaction value.

## API

### Types

#### Derivable

Non-extendable interface specifying common operations between objects considered *derivable*, i.e. Atoms, Derivations, and Lenses.

##### Methods

- **`.get()`**

  Returns the current state of the derivable.

- **`.derive(fn)`**

  Returns a new derivation representing the state of this derivable applied to `fn`.

- **`.reaction(fn [, lifecycle])`**

  Returns a new reaction which calls `fn` with the value of this derivable every time it (this derivable) changes.

  For lifecycle format see [Lifecycles](#lifecycles).

- **`.react(fn [, lifecycle])`**

  Returns a new *running* reaction which calls `fn` with the value of this derivable every time it (this derivable) changes.

  Equivalent to `.reaction(fn [, lifecycle]).start().force()`

  For lifecycle format see [Lifecycles](#lifecycles).

#### Mutable

Non-extendable interface specifying common operations between objects considered *mutable*, i.e. Atoms and Lenses.

- **`.set(newValue)`**

  Changes the mutable's state to be newValue. Causes any dependent reactions to be re-run synchronously.

  Returns the mutable.

- **`.swap(fn, ...args)`**

  Sets the current state of the mutable to be `fn` applied to its (the mutable's) current state and `args`.

  Returns the mutable.

  Equivalent to `atom.set(fn.apply(null, [atom.get()].concat(args)))`

- **`.lens(lensDescriptor)`**

  Returns a [`Lens`](#lens) based on `lensDescriptor`. See [Lens Descriptors](#lens-descriptors)

#### `Atom`
*Implements [Derivable](#derivable) and [Mutable](#mutable)*

Construct using the [`atom`](#atom-1) top level function.

#### `Derivation`
*Implements [Derivable](#derivable)*

Construct using the `.derive(fn)` methods of this class, [`Atom`](#atom), and [`Lens`](#lens). Alternatively, use the [`derive`](#derive) top-level function.

#### `Reaction`
Construct using the `.reaction(fn [, lifecycle])` and `.react(fn [, lifecycle])` methods of the [`Atom`](#atom), [`Derivation`](#atom), and [`Lens`](#atom) classes.

##### Lifecycles

Reactions can be created with an optional `lifecycle` parameter. This lets the user specify start-up and tear-down behaviour by providing an object with `.onStart` and `.onStop` methods.

The methods are called with `this` bound the reaction itself, but state should be stored in closures.


```javascript
let error = ... some derivation;
let elem = $("<span class='error'></span>");


```

##### Methods

- **`start()`**

  Starts, but doesn't execute, this reaction. Calls the `.onStart()` lifecycle method.

  Returns this reaction.

- **`stop()`**

  Stops this reaction. The reaction will no longer react to upstream changes and becomes as eligible for runtime garbage collection as any other runtime object.

  Returns this reaction.

- **`force()`**

  Forces the re-running of this reaction.

  Returns this reaction.

- **`setInput(parent)`**

  Returns this reaction.

- **`setReactor(fn)`**

  Sets the side-effecting function associated with this reaction to be `fn`.

  Returns this reaction.


#### `Lens`
Construct using the `.lens(lensDescriptor)` methods of this class and [`Atom`](#atom).

##### Lens Descriptors

Lens descriptors are objects with two methods

- `.get(parentState)`

  Which returns the lensed view over the parent state.

- `.set(parentState, value)`

  Which returns the new state for the parent with value incorporated.

As an example, if we wanted to make a lens which operates on the numbers after a decimal point separately from the number before it:

```javascript
const num = atom(3.14159);

const afterDecimalPoint = num.lens({
  get (number) {
    return parseInt(number.toString().split(".")[1]) || 0;
  },
  set (number, newVal) {
    let beforeDecimalPoint = number.toString().split(".")[0];
    return parseFloat(`${beforeDecimalPoint}.${newVal}`);
  }
});

afterDecimalPoint.get(); // => 14159

afterDecimalPoint.set(4567);

num.get(); // => 3.4567

afterDecimalPoint.swap(x => x * 2);

num.get(); // => 3.9134
```

##### Methods

###### `.set(newValue)`
Changes the lens' state to be newValue. Updates the root atom according to the lens logic. Causes any dependent reactions to be re-run synchronously.

Returns the lens.

###### `.get()`
Returns the current state of the lens.


###### `.derive(fn)`
Returns a new derivation representing the state of this lens applied to `fn`.

###### `.reaction(fn)`
Returns a new reaction which calls `fn` with the value of this lens every time it (this lens) changes.

For lifecycle format see [Lifecycles](#lifecycles).

###### `.react(fn)`
Returns a new *running* reaction which calls `fn` with the value of this lens every time it (this lens) changes.
Equivalent to `.reaction(fn).start().force()`

For lifecycle format see [Lifecycles](#lifecycles).

###### `.swap(fn, ...args)`
Sets the current state of the lens to be `fn` applied to its (the lens') current state and `args`.

Returns the lens.

Equivalent to `lens.set(fn.apply(null, [atom.get()].concat(args)))`

###### `.lens(lensDescriptor)`
Returns a new `Lens` based on `lensDescriptor`.





### Top-level functions
#### `atom`

## Hire Me

If this project is useful to you, consider supporting the author by giving him a new job!

I want to work with and learn from awesome software engineers while tackling deeply interesting engineering problems. The kinds of problems that have you waking up early because you can't wait to start thinking about them again. If that sounds like something you can offer and you're based in western Europe, please get in touch.

A little about me: I've done a lot of serious JVM data processing stuff using Clojure and Java, plus a whole bunch of full-stack web development. I like to read and daydream about compilers and language design. I can juggle 7 balls. I enjoy playing the drums and going for long cycles with friends. I have a really cool sister. My favourite thing to do in a hammock is close my eyes.
