# ratom.js
Reactive values for Derived Data All The Way Down

### {greeting}, {name}!

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
  name.set("Etienne");
});

// $> Bonjour, Etienne!
```

### Rationale

Monolithic MV[whatever] frameworks tend to encourage keeping application state in disparate little mutable chunks, tightly coupled to the [whatever] bits. Think Angular Scopes, Ember Models, Knockout View Models, etc. Such frameworks typically have no story for keeping these little mutable state chunks in sync with each other, or even with the ground-truth M which is often behind some callback-heavy API wall. This is fine if your app is small and simple.

Alas, many small and simple apps eventually become large and complex apps. Likewise, large and complex apps invariably become larger and more complex. Working on such a project, one might find oneself coming to the conclusion that orchestrating state consistency across dozens of mutable interdependent components in the face of asynchronous everything and the inevitable ad-hoc cross-cutting concerns which don't jibe with the rigid authoritarian architectures you once imagined to be boundlessly flexible is extremely—*painfully*—difficult. Difficult. Lemon difficult.

The solution to this problem seems to be something involving 'unidirectional data flow', as popularized by Facebook's [Flux](https://facebook.github.io/flux/) architecture. But the most direct source of inspiration for this library is actually [re-frame](https://github.com/day8/re-frame). Specifically re-frame's README which is, in part, a remarkable and compelling discourse on the particular brand of Flux-ishness ratom.js aims to serve. So **go read the re-frame README**. For reals. Do it.

But because you're a busy person and I'm all about brevity, here's the tl;dr:

> Keeping disparate pieces of local mutable state consistent is hard. Keeping one piece of global immutable state consistent is a matter of course. Let's do the latter.

So the goal of ratom.js is to make this easy.

### Comparison with Previous Work

The idea for, name of, and api nomenclature used in this library were directly inspired by [Reagent](https://github.com/reagent-project/reagent). Reagent credits the idea to [Reflex](https://github.com/lynaghk/reflex) which in turn cites [Knockout's Observables](http://knockoutjs.com/documentation/observables.html). Another high-quality ClojureScript solution is [javelin](https://github.com/tailrecursion/javelin). The [silk.co](http://silk.co) engineering team [have apparently done something similar](http://engineering.silk.co/post/80056130804/reactive-programming-in-javascript) but it isn't publicly available AFAICT.

The key advantage ratom.js has over all the above, its one significant contribution to the state of the art, is that it uses a GC-style mark-and-sweep algorithm to provide fully automatic memory management. This makes the library ergonomic and practical to use on its own rather than only as part of a framework.

Other advantages which may or may not apply to every project mentioned above include:

- It has total laziness. *No values are computed unless absolutely necessary*. This allows derivation graphs to incorporate short-circuiting boolean logic.
- It is a standalone library (jumping on the 'unix philosophy' bandwagon), not tied to a UI framework.
- It encourages a cleaner separation of concerns. e.g. decoupling pure derivation from side-effecting change listeners.
- It has good taste, e.g. prohibiting cyclical updates (state changes causing state changes), dealing gracefully with 'dead' derivation branches, etc.

\* I'm pretty sure. I did a lot of digging.

### How

Atoms are mutable references at the roots of a DDATWDDAG (Derived Data All The Way Down Directed Acyclic Graph... I'm pretty sure it'll catch on). Despite being mutable themselves, they are intended to hold immutable or effectively immutable data. Derivations branch from atoms and other derivations, describing a pure transformation of the root data into more useful forms, just like a materialized view in a database. `Reaction`s are side-effecting computations associated with a single `Derivation` or `Atom`. When an atom is changed, the DDATWDDAG is traversed and reactions are notified. The `Reaction`s then traverse the graph backwards, evaluating only those nodes which it is utterly necessary to evaluate in order to decide whether the `Reaction` must be re-run in response to changed input.

### Picture

Without `Reaction`s, the DDATWDDAG is a simple lifeless description of data. This design lets us do some pretty nuts stuff like implement true boolean logic in terms of `Derivation`s.
