<h1 align="center">Havelock</h1>
<h3 align="center">Holistic State Management</h3>
<p align="center">
<strong>Totally Lazy</strong> — <strong>Always Consistent</strong> — <strong>Zero Leakage</strong>
</p>
<p align="center">
<em>Si Non Confectus, Non Reficiat</em>
</p>

---

Havelock is a truly simple state management library for JavaScript. It believes in the fundamental interconnectedness of all things and contrives to give you cleaner and more robust code by taking control of your interconnections. It is [**Derived Data all the way Down**](#rationale).

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Quick Demo: {greeting}, {name}!](#quick-demo-greeting-name)
- [Rationale](#rationale)
- [Model](#model)
  - [Key Benefits](#key-benefits)
  - [Tradeoffs](#tradeoffs)
  - [Comparison with Previous Work](#comparison-with-previous-work)
- [Usage](#usage)
      - [API & Examples](#api-&-examples)
      - [npm](#npm)
      - [Browser](#browser)
      - [Batteries Not Included](#batteries-not-included)
      - [Equality Woes](#equality-woes)
- [1.0.0 Roadmap](#100-roadmap)
- [Future Work](#future-work)
- [Contributing](#contributing)
- [Thanks](#thanks)
- [Hire Me](#hire-me)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## Quick Demo: {greeting}, {name}!

```javascript
import {atom, derive, transact} from 'havelock'

// global application state
const countryCode = atom("en");
const name = atom("World");

// static constants
const greetings = {
  en: "Hello",
  de: "Hallo",
  es: "Hola",
  cn: "您好",
  fr: "Bonjour",
};

// derive a greeting message based on the user's name and country.
const greeting = countryCode.derive(cc => greetings[cc]);
const message = derive`${greeting}, ${name}!`; // tagged template string magic!

// set up a side-effecting reaction to print the message
message.react(msg => console.log(msg));
// $> Hello, World!

// reactions are automatically re-run when their inputs change
countryCode.set("de");
// $> Hallo, World!
name.set("Dagmar");
// $> Hallo, Dagmar!

// we can avoid unwanted intermediate reactions by using transactions
transact(() => {
  countryCode.set("fr");
  name.set("Étienne");
});
// $> Bonjour, Étienne!
```


## Rationale

When writing client-side JavaScript it is often convenient to keep our application state in disparate little mutable chunks. We rightfully organize these chunks such that they correspond to distinct responsibilities, and then we invent magic frameworkey gubbins to keep them in sync with our views. Think Angular Scopes, Ember Models, Knockout View Models, etc. This seems like a wonderful idea, and it certainly beats having [God objects](https://en.wikipedia.org/wiki/God_object) manually bound to the DOM with pure jQuery and `id` attributes\*.

And but still one question remains particularly irksome: how do we keep those chunks in sync with each other? Their responsibilities may be distinct, but true independence is rare. Modern MV[*whatever*] frameworks don't seem to have a compelling solution for this and we tend to propagate state changes manually with events and callbacks. This is a complex and fragile way to go about things, especially for sophisticated applications that grow over time; it becomes increasingly difficult to modify or add new features to a system without affecting other parts of it as a bizarre artifact of how state changes are imperatively propagated. The kinds of bugs that result from mismanaging state propagation can also be particularly hard to reproduce and, therefore, to diagnose and fix.

Wouldn't it be nice if you never had to worry about that kind of tedious mess again? How much do you think it would be worth?

Wonder no more! The core concept is very simple: your stateful components never change their state directly. Instead they delegate to some centralized third party who becomes responsible for applying the change and propagating it. Then your components just need to subscribe to this third party, or some subsidiary thereof, in order to be notified of pertinent changes. This detangles the callback web and you end up with a lovely simple callback tree.

The popularity of this line of thinking has been on the rise as a result of Facebook preaching about their [Flux](https://facebook.github.io/flux/) architecture. There's a good video on the Flux landing page which explains the whole deal with that. Evan Czaplicki, the creator of [Elm](https://github.com/evancz/elm-architecture-tutorial#the-elm-architecture), is another tireless progenitor of enthusiasm for these concepts who also gives [really good talk](https://www.youtube.com/watch?v=Agu6jipKfYw). But the most direct source of inspiration for this library is actually [re-frame](https://github.com/day8/re-frame). Specifically re-frame's README which includes a compelling discourse on the particular brand of Flux-ish-ness Havelock aims to serve. So **go read the re-frame README**. For real. Do it. It's seriously great.

But because you're a busy person and I'm into the whole brevity thing, here's the tl;dr:

> Keeping disparate pieces of mutable state consistent is hard. Keeping one piece of immutable state consistent is a matter of course. Let's do the latter.

This sounded like a very good idea to me. But while the latter is conceptually very simple, it is [by no means easy](http://www.infoq.com/presentations/Simple-Made-Easy) with just the tools JS provides.

Havelock's raison d'être is to fill this gap—to make global immutable state easy, or much eas*ier* at the very least. It does this by providing simple and safe means for deriving those convenient little chunks from a single source of truth. If you like, you can think of it as magic frameworkey gubbins to keep your state in sync with your state.

\* <em>Count yourself lucky if that sounds as laughably anachronistic as programming on punch cards.</em>

## Model

Speaking of which, Havelock exposes three main types:

- **Atoms** are mutable references intended to hold immutable values.
- **Derivations** represent applications of pure functions to values held in atoms.
- **Reactions** are passive observers reacting to changes in atoms (possibly via derivations). Unlike the above, they do not encapsulate a value and exist solely for side-effects and resource management.

These three types are connected together in DAGs with atoms at the roots. The example at the top of this document can be depicted as follows:

<img src="https://raw.github.com/ds300/Havelock/master/img/example.svg" align="center" width="89%"/>

The DAG structure is automatically inferred by executing derivation functions in a special context which allows Havelock to capture dereferences of immediate parents.

### Key Benefits

It is important to note that the edges between nodes in the graph above do not represent data flow in any temporal sense. They are not streams or channels or even some kind of callback chain. The (atoms + derivations) part of the graph is conceptually a single gestalt reference to a [value](https://www.youtube.com/watch?v=-6BsiVyC1kM). In this case the value, our single source of truth, is a virtual composite of the two atoms' states. The derivations are merely views into this value; they constitute the same information presented differently, like light through a prism. The gestalt is always internally consistent no matter which individual parts of it you decide to inspect at any given time.

Note also that derivations are totally lazy. They literally never do wasteful computation. This allows derivation graphs to incorporate short-circuiting boolean logic. Try doing *that* with streams.

The other key benefit over streams is that there is no need to clean up after yourself when the derivation structure changes or you no longer need a particular derivation branch. No memory leaks! This is simple to the max, and it makes the library practical to use on its own rather than as part of a framework.

All this isn't to say that streams and channels are bad, just different. Events are discrete in time, state is continuous. Stop conflating the two and use Havelock for your state!

### Tradeoffs

You may be wondering how these benefits are achieved. The answer is simple: mark-and-sweep. Yes, [just like your trusty Garbage Collectors](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Basic_algorithm) have been doing since the dawn of Lisp. It is actually more like mark-*react*-sweep, and it brings a couple of performance hits over streams, channels, and callback chains:

* When an atom is changed, its entire derivation graph is traversed and 'marked'. All active dependent reactions are then gently prodded and told to decide whether they need to re-run themselves. This amounts to an additional whole-graph traversal in the worst case. The worst case also happens to be the common case :(
* The sweep phase involves yet another probably-whole-graph traversal.

So really each time an atom is changed, its entire derivation graph is likely to be traversed 3 times. I would argue that this is negligible for most UI-ish use cases. The traversal is really simple stuff: following pointers and doing numeric assignments/comparisons. Computers are stupidly good at that kind of thing. But if you're doing something *intense* then perhaps Havelock isn't the best choice and you should pick something with eager evaluation. Be appraised, however, that I've got a [fairly promising idea](#future-work) for how to reduce the traversal overhead after v1.0.0 drops.

*Side note: during transactions only the mark phase occurs. And if an atom is changed more than once during a single transaction, only the bits of the derivation graph that get dereferenced between changes are re-marked.*

### Comparison with Previous Work

*DISCLAIMER: At the time of writing, these comparisons are valid to the best of my knowledge. If you use or maintain one of the mentioned libraries and discover that this section is out of date or full of lies at conception, please let me know and I'll edit or annotate where appropriate.*

[Javelin](https://github.com/tailrecursion/javelin) has similar functionality to Havelock, but with *eager* change propagation. It provides transactions and has a good consistency story. The major downside is that the eagerness means it requires manual memory management. It also exclusively uses macrology to infer the structure of derivation graphs. This means graphs can only be composed lexically, i.e. at compile time. A simple, if utterly contrived, example of why this is a downside:

```clojure
(ns test
  (:require-macros [tailrecursion.javelin :refer [cell=]])
  (:require [tailrecursion.javelin :refer [cell]]))

(def cells (mapv cell (range 3)))

(def sum (cell= (reduce + cells)))

(.log js/console @sum)

; $> [object Object][object Object][object Object]

; it tried to add the cells together, not their values

; let's manually deref the cells so it can get at their values
(def sum2 (cell= (reduce + (map deref cells))))

(.log js/console @sum2)
; $> 3
; correct!

(swap! (cells 0) inc)

(.log js/console @sum2)
; $> 3
; incorrect! Look:

(.log js/console (reduce + (map deref cells)))
; $> 4
```

So the `cell=` macro is unable to figure out that our `cells` vector contains cells which should be hooked up to the propagation graph. Havelock imposes no such constraints:

```javascript
import {atom, derive, get} from 'havelock'

const cells = [0,1,2].map(atom);

const add = (a, b) => a + b;

const sum = derive(() => cells.map(get).reduce(add));

sum.react(x => console.log(x));
// $> 3

cells[0].swap(x => x+1);
// $> 4
```

Sure it's a tad more verbose, but *this is JS*; I'm not a miracle worker.

[Reagent](https://github.com/reagent-project/reagent)'s `atom`/`reaction` stack can handle runtime graph composition too (like Havelock, it uses dereference-capturing to infer edges). Reagent also does automatic memory management! Unfortunately, it doesn't do transactions and can only do laziness for 'active' derivation branches.

```clojure
(ns test-ratom
  (:require-macros [reagent.ratom :refer [reaction run!]])
  (:require [reagent.ratom :refer [atom]]))

(def root (atom "hello"))

(def fst (reaction (.log js/console "LOG:" (first @root))))

@fst
; $> LOG: h
@fst
; $> LOG: h
; ... etc. No laziness because graph is disconnected.

; run!-ing connects the graph
(run! @fst)
; $> LOG: h

; ... and laziness kicks in
@fst
@fst
```

Reagent also fails to provide consistency guarantees. To illustrate:

```clojure
(ns test-ratom
  (:require-macros [reagent.ratom :refer [reaction run!]])
  (:require [reagent.ratom :refer [atom]]))

(def root (atom "hello"))

(def fst (reaction (first @root)))

(def lst (reaction (last @root)))

(run! (.log js/console @fst @lst))
; $> h o

(reset! root "bye")
; $> b o
; $> b e
```

At no point did `root` contain a word which starts with 'b' and ends with 'o', and yet from reading the console output you would be forgiven for thinking otherwise. In FRP-speak this is called a 'glitch'. Havelock is glitch-free.

The one major issue with both of these libraries is that they require ClojureScript. I *adore* ClojureScript but I'm not one of these extremely lucky people who get to use it at their job. Maybe you're in a similar boat.

So what's available in JS land? The silk.co engineering team [have apparently done something similar](http://engineering.silk.co/post/80056130804/reactive-programming-in-javascript), but it requires manual memory management and doesn't seem to be publicly available anyway.

More promising is [Knockout's Observables](http://knockoutjs.com/documentation/observables.html) + [Pure Computed Observables](http://knockoutjs.com/documentation/computed-pure.html) which seem to get the job done, but are tied to Knockout itself. They also have no facility for transactions and are glitchy:

```javascript
const root = ko.observable("hello");

const fst = ko.pureComputed(() => root()[0]);

const lst = ko.pureComputed(() => {
  let word = root();
  return word[word.length-1];
});

ko.computed(() =>  console.log(fst(), lst());
// $> h o

root("bye");
// $> b o
// $> b e
```

With the partial exception of Knockout, all of the above libraries are also guilty of lexically conflating derivation with reaction. These two concerns have different requirements and different goals, and I would argue that making them visually distinct improves code readability and encourages cleaner design.

This has not been an exhaustive comparison. There are [some](https://www.meteor.com/tracker) [other](https://github.com/Raynos/observ) [libraries](https://github.com/polymer/observe-js) with similar shortcomings, but we've gone through the meaty stuff already. There are also many libraries on other platforms. The closest thing I managed to find to Havelock was [Shiny's Reactivity model](http://shiny.rstudio.com/articles/reactivity-overview.html).

## Usage

##### API & Examples
[See Here](#todo)

##### npm
Available as `havelock`.

##### Browser
Either with browserify or, if need be, import `dist/havelock.min.js` directly (find it at `window.Havelock`).

##### Batteries Not Included
Havelock expects you to use immutable (or effectively immutable) data. It also expects derivation functions to be pure. JavaScript isn't really set up to handle such requirements out of the box, so you would do well to look at an FP library like [Ramda](http://ramdajs.com/) to make life easier. Also, if you want to do immutable collections properly, [Immutable](https://facebook.github.io/immutable-js/) or [Mori](http://swannodette.github.io/mori/) are probably the way to go. Godspeed!

##### Equality Woes
JavaScript is entirely whack when it comes to equality. People do [crazy jazz](https://github.com/ramda/ramda/blob/v0.16.0/src/internal/_equals.js) trying to figure out if some stuff is the same as some other stuff.

If the data you're threading through Havelock needs its own notion of equality, make sure it has a `.equals` method and everything will be fine.

If you're using a data library with some custom non-standard mechanism for doing equality checks (e.g. Mori), then you'll need to re-initialize Havelock with a custom equality function.

```javascript
import { withEquality } from 'havelock'

const { atom, derive, ..._} = withEquality(myCustomEqualityChecker);
```

## 1.0.0 Roadmap

Havelock's API will be unstable until version 1.0.0 is released. This will happen on or before September 1st 2015, whereafter the project will use [Semantic Versioning](http://semver.org/).

The purpose for this delay is to gather [suggestions and feedback](#contributing) from the community to help shape the core API.

## Future Work

1. Dynamic graph optimization. e.g. collapsing derivation branches of frequently-executed reactions into one derivation, maybe trying to align all the data in memory somehow. This would be similar to JIT tracing sans optimization, and could make enormous derivation graphs more feasible (i.e. change propagation could become linear in the number of reactions rather than linear in the number of derivation nodes. It wouldn't work with parent inference though; you'd have to write derivations in the `y.derive(y => ...)` or `derive(x, y, z, (x, y, z) => ...)` fashions. So do that if you want to get ahead of the curve!
2. Investigate whether asynchronous transactions are possible, or indeed desirable.
3. I've got a feeling one of the whole-graph traversals mentioned in [Tradeoffs](#tradeoffs) can be eliminated while maintaining all the goodness Havelock currently provides, but it would involve a lot of extra caching and it won't even be needed if (1) turns out to be fruitful, so I'll try that first.

## Contributing

I heartily welcome feature requests, bug reports, and general suggestions/criticism on the github issue tracker. I also welcome bugfixes via pull request (please read CONTRIBUTING.md before sumbitting).

## Thanks

Special thanks to:

- Alan Dipert and Micha Niskin, creators of Javelin (and Boot!). [Their talk on Javelin](http://www.infoq.com/presentations/ClojureScript-Javelin) was the first exposure I had to these ideas.
- Michael Thompson for the [re-frame README](https://github.com/Day8/re-frame) which was an awesome resource and gave me enough enthusiasm for the idea to hunker down and do it.
- David Weir and Jeremy Reffin, ex-PhD supervisor and , for their invaluable mentorship and letting me play at academia.
- Rich Hickey and the Clojure community for being a constant source of ideas and for making programming even more fun.

## Hire Me

If this project is useful to you, consider supporting the author by giving him a new job!

A little about me:

I want to work with and learn from awesome software engineers while tackling deeply interesting problems. The kinds of problems that have you waking up early because you can't wait to start thinking about them again.

I've been on the fraying edges of NLP academia since finishing my CompSci BSc in 2013. First as a PhD student and then as a Research Fellow/Code Monkey thing. During that time I've done a lot of serious JVM data processing stuff using Clojure (<3) and Java, plus a whole bunch of full-stack web development.

That was fun but now I intend to become a professional and competent engineer, which seems like a very hard thing to accomplish alone in an academic setting.

I like to read and daydream about compilers and VMs. I like to read novels which deftly say something touching about humans. I can juggle 7 balls a bit. I play musical instruments and ride bicycles and watch stupid funny junk on youtube. I have an obscenely cool sister (seriously it's just not fair on the rest of us). I think South-East Asian cuisine is where it's at, cuisine-wise. But most of the others are pretty great too.

I'm free from November and might be willing to do remote work or move anywhere in Western Europe for the right job. Email me.

## License

```
Copyright (c) 2015, David Sheldrick. <djsheldrick@gmail.com>
All rights reserved.

This source code is licensed under the BSD-style license found in the
LICENSE file in the root directory of this source tree
```
