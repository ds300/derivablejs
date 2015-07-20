<h1 align="center">Havelock</h1>

<p align="center">
<strong>Totally Lazy</strong> — <strong>Always Consistent</strong> — <strong>Zero Leakage</strong> 
</p>
<p align="center">
<em>Si Non Confectus, Non Reficiat</em>
</p>

---

Havelock is a truly simple state management library for JavaScript. It provides reactive values for [**Derived Data all the way Down**](#rationale).

## Quick Demo App: {greeting}, {name}!

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
const message = derive`${greeting}, ${name}!`; // es6 tagged template strings!

// set up a side-effecting reaction to print the message
message.react(msg => console.log(msg));
// $> Hello, World!

// reactions are automatically re-run when their inputs change
countryCode.set("de");
// $> Hallo, World!
name.set("Dieter");
// $> Hallo, Dieter!

// we can avoid unwanted intermediate reactions by using transactions
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
  - [Problem](#problem)
  - [Solution?](#solution)
- [Model](#model)
  - [Key Benefits](#key-benefits)
  - [Tradeoffs](#tradeoffs)
  - [Comparison with Previous Work](#comparison-with-previous-work)
- [ToDo](#todo)
- [Hire Me](#hire-me)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Rationale

### Problem
When writing client-side JavaScript it is often convenient to keep our application state in disparate little mutable chunks. We rightfully try to organize these chunks such that they correspond to distinct responsibilities, and then we invent magic frameworkey gubbins to keep the chunks in sync with our views. Think Angular Scopes, Ember Models, Knockout View Models, etc. This all seems wonderful\*, but many of us make the mistake of plugging our ears, closing our eyes, and spouting loud glossolalia in order to maintain the happy notion that the word 'distinct' in *distinct responsibilities* will graciously extend itself to cover the meaning of the word 'independent'. Spoiler: it won't, and we end up with tangled callback webs trying to keep interdependent state chunks consistent with one another and the server.

Luckily this is almost never a problem if you're building a small and simple application that won't change much. A tiny amount of callback webbing is fine to deal with. Lots of people make such apps for a living, and modern MV[*whatever*] frameworks can be extremely productive for doing that.

Alas, many small and simple apps eventually become large and complex apps. Likewise, large and complex apps invariably become larger and more complex. As size and complexity grow, so too does the cost of iteration.

Now, I haven't done any science to back this up but I reckon that with MVC the cost of iteration grows linearly over time; and that it does so precisely because of the complexity and fragility inherent in manually keeping state consistent using callback webs. We need a simpler way. The cost of iteration curve should be asymptotic or *flat*, even if it starts a little higher.

\* <em>It certainly beats the days when we all did manual data binding with pure jQuery and `id` attributes. *Remember that?* Dark times indeed.</em>

### Solution?
A promising solution appears to be something like 'unidirectional data flow' as popularized by Facebook's [Flux](https://facebook.github.io/flux/) architecture. But the most direct source of inspiration for this library is actually [re-frame](https://github.com/day8/re-frame). Specifically re-frame's README which includes a compelling discourse on the particular brand of Flux-ish-ness Havelock aims to serve. So **go read the re-frame README**. For real. Do it. It's seriously great.

But because you're a busy person and I'm into the whole brevity thing, here's the tl;dr:

> Keeping disparate pieces of mutable state consistent is hard. Keeping one piece of immutable state consistent is a matter of course. Let's do the latter.

Sounds good, right? And while the latter is conceptually very simple, it is [by no means easy](http://www.infoq.com/presentations/Simple-Made-Easy) with just the tools JS provides.

Havelock's raison d'être is to fill this gap—to make global immutable state easy, or much eas*ier* at the very least. It does this by providing simple, safe, and efficient means for deriving those convenient little chunks from a single source of truth.

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

All this isn't to say that streams and channels are bad (callback chains tend to be, though), just different. Events are discrete in time, state is continuous. Stop conflating the two and use Havelock for your state!

### Tradeoffs

You may be wondering how these benefits are achieved. The answer is simple: mark-and-sweep. Yes, [just like your trusty Garbage Collectors](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Basic_algorithm) have been doing since the dawn of Lisp. It is actually more like mark-*react*-sweep, and it brings a couple of performance hits over streams, channels, and callback chains:

- When an atom is changed, its entire derivation graph is traversed and 'marked'. All active dependent reactions are then gently prodded and told to decide whether they need to re-run themselves. This amounts to an additional whole-graph traversal in the worst case. The worst case also happens to be the common case :(
- The sweep phase involves yet another probably-whole-graph traversal.

So really each time an atom is changed, its entire derivation graph is likely to be traversed 3 times\*. I would argue that this is negligible for most use cases, but if you're doing something *seriously heavy* then perhaps Havelock isn't the best choice.

*Side note: during transactions only the mark phase occurs. And if an atom is changed more than once during a single transaction, only the bits of the derivation graph that get dereferenced between changes are re-marked.*

\* Just to be clear: this traversal is orthogonal to the actual execution of derivation functions.

### Comparison with Previous Work

*DISCLAIMER: At the time of writing, these comparisons are valid to the best of my knowledge. If you use or maintain one of the mentioned libraries and discover that this section is out of date or full of lies in the first place, please let me know and I'll edit or annotate where appropriate.*

[Javelin](https://github.com/tailrecursion/javelin) has similar functionality to Havelock but is eager and requires manual memory management. It also uses funky macro juju to infer the structure of derivation graphs. This means graphs can only be composed lexically, i.e. at compile time. A simple, if utterly contrived, example of why this is a downside:

```clojure
(ns test-javelin
  (:require-macros [tailrecursion.javelin :refer [defc= defc]]))

(defc value 1)
(defc condition true)

(defc= result (.log js/console
                    (if condition
                      "the condition is true"
                      value)))
; => the condition is true

(swap! value inc)
; => the condition is true

(swap! value inc)
; => the condition is true

; => ...etc
```

The `value` cell is, lexically speaking, used by the `result` computed cell. It is never actually dereferenced, but you can't figure that out with macrology. So `result` is recomputed whenever `value` changes, even though it doesn't need to be. This sort of thing can't happen with Havelock.

It can't happen with [Reagent](https://github.com/reagent-project/reagent)'s `atom`/`reaction` stack either because it also uses dereference-capturing to infer graph structure. Unfortunately, it gives no consistency guarantees. To illustrate:

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

Reagent's `reaction`s are also lazy, which is good! But not quite totally lazy. Example:

```clojure
(ns test-ratom-again
  (:require-macros [reagent.ratom :refer [reaction run!]])
  (:require [reagent.ratom :refer [atom dispose!]]))

(defn log [x]
  (.log js/console "LOG:" x)
  x)

(def root (atom "hello"))

(def fst (reaction (log (first @root))))

(def rxn (run! @fst))
; => LOG: h

(dispose! rxn)

(def rxn2 (run! @fst))
; => LOG: h
```

`root` didn't change, but `fst` got computed twice. That's because of the way references are cleaned up when you call `dispose!`. Havelock suffers no such problems.

The one major issue with both of these libraries is that they require ClojureScript. I love love love ClojureScript but I'm not one of these extremely lucky people who get to use it at their job, so I wanted a pure JS solution.

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

With the partial exception of Knockout, all of the above libraries are also guilty of lexically conflating derivation with reaction. Havelock very purposefully avoids this for the sake of simplicity and clarity over convenience.

This is not an exhaustive comparison. There are [some](https://www.meteor.com/tracker) [other](https://github.com/Raynos/observ) [libraries](https://github.com/polymer/observe-js) with similar shortcomings, but we've gone through the meaty stuff already. 

## What It's Not

Havelock makes no prescriptions about what kind of data should be held in atoms or derived therefrom, except that it should all be effectively immutable. Unfortunately JavaScript doesn't provide Immutable collections so if you want to do collections, you should look at the likes of Immutable and mori. There are wrapper libraries which ensure that Havelock knows about these libraries' equality semantics and feature cursor implementations and lots of nice examples.

Havelock also has no opinion regarding how or whether you should go about deriving virtual DOM trees from your application state. I personally have many opinions on the matter but Havelock doesn't care if you use it to do that or to set up 2-way data bindings with jQuery or whatever.


## Future Work

- Investigate whether asynchronous transactions are possible, or indeed desirable.

## Hire Me

If this project is useful to you, consider supporting the author by giving him a new job!

I want to work with and learn from awesome software engineers while tackling deeply interesting engineering problems. The kinds of problems that have you waking up early because you can't wait to start thinking about them again. If that sounds like something you can offer and you're based in western Europe, please get in touch.

A little about me: I've been on the fraying edges of academia since finishing my CompSci BSc in 2013. First as a PhD student and then as a Research Fellow/Code Monkey thing. During that time I've done a lot of serious JVM data processing stuff using Clojure and Java, plus a whole bunch of full-stack web development. I like to read and daydream about compilers and language design. I can juggle 7 balls. I play instruments and ride bicycles and watch stupid junk on youtube. My sister is just the coolest person and I don't get to see her often enough. I'm free from November and would love to move to Berlin or Copenhagen.
