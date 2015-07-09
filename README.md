# ratom.js
Reactive values for Derived Data All The Way Down (DDATWD). A reimagining of [Reagent's](http://github.com/reagent-project/reagent) `atom` + `reaction` for everyone to enjoy.

### Reactive?

Yeah. If you've used 'observable' values in libraries like [mercury](https://github.com/Raynos/mercury) or [knockout](http://knockoutjs.com) think of it as a generalization of that with super powers.

This kind of thing might look familiar:

```javascript
import {atom} from 'ratom'

const name = atom("Steve");

name.react(nm => console.log(`Hello ${nm}!`));

// $> Hello Steve!

name.set("Julian");

// $> Hello Julian!
```

### Great, so you've changed `.observe(callback)` to `.react(callback)`, what's new? Where are the superpowers? What the heck is DDATWD?

Forget about observing and reacting to changing data for a minute. That *is* what this library does, but the good stuff --- the stuff nobody else does --- is going to require a little background.


### Rationale

Let's talk about how we structure application state.

In modern MV* frameworks like Angular and Ember your app state is dotted all over the place, often tightly coupled to the views and business logic that render and manipulate it. This seems like a great idea until your components need to talk to each other and agree on things. If you've never worked on a project like this, just trust me: orchestrating state consistency across interdependent components in the face of asynchronous everything and the inevitable ad-hoc cross-cutting concerns which don't make sense for the monolithic architectures you settled on months ago and would be too much trouble to reconfigure... Not fun stuff. Not fun stuff at all.

The solution to this problem seems to be something involving unidirectional data flow, as popularized by Facebook's [Flux](https://facebook.github.io/flux/) architecture. However, the most direct source of inspiration for this library is [re-frame](https://github.com/day8/re-frame). Specifically re-frame's README, which does an excellent job of explaining the rationale behind the architecture I'm about to show you, so **go read that** if you want to fully grok the why of this library. The TL;DR version is something like:

> Keeping disparate pieces of local mutable state consistent is hard. Keeping one piece of global immutable state consistent is a matter of course, as long as the pure functions that transform it from one state to the next are correct.

Happily, writing and testing pure functions is about as easy as it gets in the world of software engineering.

### Derived Data All The Way Down

So we have global immutable state: the One True Data Source. What then? We derive!

```javascript
import {atom, derive} from 'ratom'

const app = atom({})
```
