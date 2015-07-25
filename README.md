<h1 align="center">Havelock</h1>
<h3 align="center">Holistic State Management</h3>
<p align="center">
<strong>Totally Lazy</strong> — <strong>Always Consistent</strong> — <strong>Zero Leakage</strong>
</p>
<p align="center">
<em>Si Non Confectus, Non Reficiat</em>
</p>

---

Havelock is a truly simple state management library for JavaScript. It provides reactive values for [**Derived Data all the way Down**](#rationale).

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Quick Demo: {greeting}, {name}!](#quick-demo-greeting-name)
- [Rationale](#rationale)
  - [Problem](#problem)
  - [Solution?](#solution)
- [Model](#model)
  - [Key Benefits](#key-benefits)
  - [Tradeoffs](#tradeoffs)
  - [Comparison with Previous Work](#comparison-with-previous-work)
- [Usage](#usage)
- [1.0.0 Roadmap](#100-roadmap)
- [Future Work](#future-work)
- [Contributing](#contributing)
- [Hire Me](#hire-me)

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

When writing client-side JavaScript it is often convenient to keep our application state in disparate little mutable chunks. We rightfully try to organize these chunks such that they correspond to distinct responsibilities, and then we invent magic frameworkey gubbins to keep the chunks in sync with our views. Think Angular Scopes, Ember Models, Knockout View Models, etc. This seems like a wonderful idea, and it certainly beats the days when we all did manual data binding with pure jQuery and `id` attributes. *Remember that?* Dark times indeed.

And yet but still one thing remains particularly irksome: how do we keep those chunks in sync with each other? Modern MV[*whatever*] frameworks don't seem to have a compelling solution for that and we tend to do most of it manually. This seems to be the dominant source of frustration when adding new features or modifying existing features, especially as projects grow larger and more complex.

Wouldn't it be nice if you never had to worry about that kind of junk again? How much do you think it would be worth if you could add new features to your system without introducing exotic, hard-to-reproduce, and even-harder-to-dignose bugs as a bizarre artifact of how you (or your feckless predecessor, if the boss is asking) were manually propagating state between a group of interdependent components?

Wonder no more! Havelock is available *today*. For the low low price of *nothing*. Just a few keystrokes and your state will be fresh and clean forever and ever. Amen.

The popularity of this kind of thing has been exploding as a result of Facebook preaching about their [Flux](https://facebook.github.io/flux/) architecture. There's video on the Flux landing page that explains the whole deal with that, but actually the most direct source of inspiration for this library is [re-frame](https://github.com/day8/re-frame). Specifically re-frame's README which includes a compelling discourse on the particular brand of Flux-ish-ness Havelock aims to serve. So **go read the re-frame README**. For real. Do it. It's seriously great.

But because you're a busy person and I'm into the whole brevity thing, here's the tl;dr:

> Keeping disparate pieces of mutable state consistent is hard. Keeping one piece of immutable state consistent is a matter of course. Let's do the latter.

Sounds good, right? And while the latter is conceptually very simple, it is [by no means easy](http://www.infoq.com/presentations/Simple-Made-Easy) with just the tools JS provides.

Havelock's raison d'être is to fill this gap—to make global immutable state easy, or much eas*ier* at the very least. It does this by providing simple, safe, and efficient means for deriving those convenient little chunks from a single source of truth. If you like, you can think of it as magic frameworkey gubbins to keep your state in sync with your state.

## Model

Speaking of which, Havelock exposes three main types:

- **Atoms** are mutable references intended to hold immutable values.
- **Derivations** represent applications of pure functions to values held in atoms.
- **Reactions** are passive observers reacting to changes in atoms (possibly via derivations). Unlike the above, they do not encapsulate a value and exist solely for side-effects and resource management.

These three types are connected together in DAGs with atoms at the roots. The example at the top of this document can be depicted as follows:

<img src="https://raw.github.com/ds300/Havelock/master/img/example.svg" align="center" width="89%"/>

The DAG structure is automatically inferred by executing derivation functions in a special context which allows Havelock to capture dereferences of immediate parents.

### Key Benefits

It is important to note that the edges between nodes in the graph above do not represent data flow in any temporal sense. They are not streams or channels or even some kind of callback chain. The (atoms + derivations) part of the graph is conceptually a single gestalt reference to a [value](https://www.youtube.com/watch?v=-6BsiVyC1kM). In this case the value, our single source of truth, is a virtual composite of the two atoms' states. The derivations are merely views into this value; they constitute the same information presented differently, like light through a prism. The gestalt is always internally consistent no matter which parts of it you decide to inspect at any given time.

Note also that derivations are totally lazy. They literally never do wasteful computation. This allows derivation graphs to incorporate short-circuiting boolean logic. Try doing *that* with streams.

The other key benefit over streams is that there is no need to clean up after yourself when the derivation structure changes or you no longer need a particular derivation branch. No memory leaks! This is simple to the max, and it makes the library practical to use on its own rather than as part of a framework.

All this isn't to say that streams and channels are bad, just different. Events are discrete in time, state is continuous. Stop conflating the two and use Havelock for your state!

### Tradeoffs

You may be wondering how these benefits are achieved. The answer is simple: mark-and-sweep. Yes, [just like your trusty Garbage Collectors](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Basic_algorithm) have been doing since the dawn of Lisp. It is actually more like mark-*react*-sweep, and it brings a couple of performance hits over streams, channels, and callback chains:

- When an atom is changed, its entire derivation graph is traversed and 'marked'. All active dependent reactions are then gently prodded and told to decide whether they need to re-run themselves. This amounts to an additional whole-graph traversal in the worst case. The worst case also happens to be the common case :(
- The sweep phase involves yet another probably-whole-graph traversal.

So really each time an atom is changed, its entire derivation graph is likely to be traversed 3 times\*. I would argue that this is negligible for most UI-ish use cases, but if you're doing something *seriously heavy* then perhaps Havelock isn't the best choice. Although I've got a [fairly promising idea](#future-work) regarding how to fix this after v1.0.0 drops.

*Side note: during transactions only the mark phase occurs. And if an atom is changed more than once during a single transaction, only the bits of the derivation graph that get dereferenced between changes are re-marked.*

\* Just to be clear: this traversal is orthogonal to the actual execution of derivation functions.

### Comparison with Previous Work

*DISCLAIMER: At the time of writing, these comparisons are valid to the best of my knowledge. If you use or maintain one of the mentioned libraries and discover that this section is out of date or full of lies at conception, please let me know and I'll edit or annotate where appropriate.*

[Javelin](https://github.com/tailrecursion/javelin) has similar functionality to Havelock, but with *eager* change propagation. It provides transactions and has a good consistency story. The major downside is that the eagerness means it requires manual memory management. It also uses funky macro juju to infer the structure of derivation graphs. This means graphs can only be composed lexically, i.e. at compile time. A simple, if utterly contrived, example of why this is a downside:

```clojure
(ns test
  (:require-macros [tailrecursion.javelin :refer [cell=]])
  (:require [tailrecursion.javelin :refer [cell]]))

(def cells (mapv cell (range 3)))

(def sum (cell= (reduce + cells)))

(.log js/console @sum)

; => [object Object][object Object][object Object]

; it tried to add the cells together, not their values

; let's manually deref the cells so it can get at their values
(def sum2 (cell= (reduce + (map deref cells))))

(.log js/console @sum2)
; => 3
; correct!

(swap! (cells 0) inc)

(.log js/console @sum2)
; => 3
; incorrect! Look:

(.log js/console (reduce + (map deref cells)))
; => 4
```

So the `cell=` macro is unable to figure out that our `cells` vector contains cells which should be hooked up to the propagation graph. Havelock imposes no such constraints:

```javascript
import {atom, derive, get} from 'havelock'

const cells = [0,1,2].map(atom);

const add = (a, b) => a + b;

const sum = derive(() => cells.map(get).reduce(add));

sum.react(x => console.log(x));
// => 3

cells[0].swap(x => x+1);
// => 4
```

Sure it's a tad more verbose, but *this is JS*; I'm not a miracle worker.

[Reagent](https://github.com/reagent-project/reagent)'s `atom`/`reaction` stack can handle runtime graph composition too (like Havelock, it uses dereference-capturing to infer edges). Reagent also does automatic memory management! Unfortunately, it can only do laziness for 'active' derivation branches.

```clojure
(ns test-ratom
  (:require-macros [reagent.ratom :refer [reaction run!]])
  (:require [reagent.ratom :refer [atom]]))

(def root (atom "hello"))

(def fst (reaction (.log js/console "LOG:" (first @root))))

@fst
; => LOG: h
@fst
; => LOG: h
; ... etc. No laziness because graph is disconnected.

; run!-ing connects the graph
(run! @fst)
; => LOG: h

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
; => h o

(reset! root "bye")
; => b o
; => b e
```

At no point did `root` contain a word which starts with 'b' and ends with 'o', and yet from reading the console output you would be forgiven for thinking otherwise. In FRP-speak this is called a 'glitch'.

The one major issue with both of these libraries is that they require ClojureScript. I *totally adore* ClojureScript but I'm not one of these extremely lucky people who get to use it at their job.

So what's available in JS land? The silk.co engineering team [have apparently done something similar](http://engineering.silk.co/post/80056130804/reactive-programming-in-javascript), but it requires manual memory management and doesn't seem to be publicly available anyway.

More promising is [Knockout's Observables](http://knockoutjs.com/documentation/observables.html) + [Pure Computed Observables](http://knockoutjs.com/documentation/computed-pure.html) which seem to get the job done, but are tied to Knockout itself and also unfortunately glitchy:

```javascript
const root = ko.observable("hello");

const fst = ko.pureComputed(() => root()[0])

const lst = ko.pureComputed(() => {
  let word = root();
  return word[word.length-1];
});

ko.computed(() =>  console.log(fst(), lst());
// => h o

root("bye");
// => b o
// => b e
```

With the partial exception of Knockout, all of the above libraries are also guilty of lexically conflating derivation with reaction. These are two very different concerns with different requirements and different goals, and I would argue that making them visually distinct improves code readability and encourages cleaner design.

This has not been an exhaustive comparison. There are [some](https://www.meteor.com/tracker) [other](https://github.com/Raynos/observ) [libraries](https://github.com/polymer/observe-js) with similar shortcomings, but we've gone through the meaty stuff already. There are also many libraries on other platforms. The closest thing I managed to find to Havelock was [Shiny's Reactivity model](http://shiny.rstudio.com/articles/reactivity-overview.html).

## Usage

##### API & Examples
[See Here](#todo)

##### npm
Available as `havelock`.

##### Browser
Either with browserify or, if need be, import `dist/havelock.min.js` directly. `window.Havelock` is where it's at.

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

1. Dynamic graph optimization. e.g. collapsing derivation branches of frequently-executed reactions into one derivation. This would be similar to JIT tracing sans optimization, and could make enormous derivation graphs more feasible (i.e. change propagation could become linear in the number of reactions rather than linear in the number of derivation nodes. It wouldn't work with parent inference though; you'd have to write derivations in the `y.derive(y => ...)` or `derive(x, y, z, (x, y, z) => ...)` fashions. So if you want to get ahead of the curve!
2. Investigate whether asynchronous transactions are possible, or indeed desirable.
3. I've got a feeling one of the whole-graph traversals mentioned in [Tradeoffs](#tradeoffs) can be eliminated while maintaining all the goodness Havelock currently provides, but it would involve a lot of extra caching and it won't even be needed if (1) turns out to be fruitful, so I'll try that first.

## Contributing

I heartily welcome feature requests, bug reports, and general suggestions/criticism. I also welcome bugfixes via pull request.

## Hire Me

If this project is useful to you, consider supporting the author by giving him a new job!

A little about me: I want to work with and learn from awesome software engineers while tackling deeply interesting engineering problems. The kinds of problems that have you waking up early because you can't wait to start thinking about them again. I've been on the fraying edges of NLP academia since finishing my CompSci BSc in 2013. First as a PhD student and then as a Research Fellow/Code Monkey thing. During that time I've done a lot of serious JVM data processing stuff using Clojure and Java, plus a whole bunch of full-stack web development. I like to read and daydream about compilers and VMs. I like to read novels which deftly say something touching about the human condition. I can juggle 7 balls. I play instruments and ride bicycles and watch stupid funny junk on youtube. I have an obscenely cool sister (seriously it's just not fair on the rest of us). I'm free from November and would love to move to Berlin or Copenhagen, but would consider remote work or moving anywhere in Western Europe for the right job.
