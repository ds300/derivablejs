<h1 align="center">DerivableJS</h1>
<h3 align="center">State made simple → Effects made easy</h3>

[![npm version](https://badge.fury.io/js/derivable.svg)](http://badge.fury.io/js/derivable) [![Build Status](https://travis-ci.org/ds300/derivablejs.svg?branch=new-algo)](https://travis-ci.org/ds300/derivablejs)  [![Coverage Status](https://coveralls.io/repos/github/ds300/derivablejs/badge.svg?branch=new-algo)](https://coveralls.io/github/ds300/derivablejs?branch=new-algo) [![Join the chat at https://gitter.im/ds300/derivablejs](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ds300/derivablejs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![Empowered by Futurice's open source sponsorship program](https://img.shields.io/badge/sponsored%20by-chilicorn-ff69b4.svg)](http://futurice.com/blog/sponsoring-free-time-open-source-activities?utm_source=github&utm_medium=spice&utm_campaign=derivablejs) [![.min.gz size](https://img.shields.io/badge/.min.gz%20size-3.4k-blue.svg)](http://github.com)
---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
Derivables are an Observable-like momoizing state container with superpowers. Think [MobX](https://github.com/mobxjs/mobx) distilled to a potent essence, served with extra performance and a garnish of innovative ideas about how to manage side effects.

- [State made simple](#state-made-simple)
  - [Derived and Atomic state](#derived-and-atomic-state)
- [What even is a Derivable?](#what-even-is-a-derivable)
- [Reactors](#reactors)
- [Usage](#usage)
      - [With React](#with-react)
      - [With Redux](#with-redux)
      - [Debugging](#debugging)
      - [Examples (very wip)](#examples-very-wip)
      - [Browser](#browser)
      - [Equality Woes](#equality-woes)
- [Contributing](#contributing)
- [Thanks](#thanks)
- [License](#license)


## Quick start

There are two types of Derivable:

- **Atoms**

  Atoms are simple mutable references to immutable values. They represent the ground truth from which all else is derived.

  ```javascript
  import {atom} from 'derivable';

  const $Name = atom('Richard');

  $Name.get(); // => 'Richard'

  $Name.set('William');

  $Name.get(); // => 'William'
  ```

  <em>N.B. The dollar-sign prefix is just a convention I personally use to create a syntactic distinction between ordinary values and derivable values.</em>

- **Derivations**

  Derivations represent pure (as in 'pure function') transformation of values held in atoms. You can create them with the `.derive` method, which is a bit like the `.map` method of Arrays and Observables.

  ```javascript
  const cyber = word => word.toUpperCase().split('').join(' ');

  const $cyberName = $Name.derive(cyber);

  $cyberName.get(); // 'W I L L I A M'

  $Name.set('Sarah');

  $cyberName.get(); // 'S A R A H'
  ```

  Derivations cannot be modified directly with `.set`, but change in accordance with their dependencies, of which there may be many. Here is an example with two dependencies which uses the fundamental `derivation` constructor function:

  ```javascript
  import {derivation} from 'derivable';

  const $Transformer = atom(cyber);

  const $transformedName = derivation(() =>
    $Transformer.get()($Name.get())
  );

  $transformedName.get(); // => 'S A R A H'

  const reverse = string => string.split('').reverse().join('');

  $Transformer.set(reverse);

  $transformedName.get(); // => 'haraS'

  $Name.set('Fabian');

  $transformedName.get(); // => 'naibaF'
  ```

  `derivation` takes a function of zero arguments which should
  dereference one or more Derivables to compute the new derived value. DerivableJS then sneakily monitors who
  is dereferencing who to infer the parent-child relationships.

## Reactors

Declarative state management is nice in and of itself, but the real benefits come from how it enables us to more effectively manage side effects. DerivableJS has a really nice story on this front: changes in atoms or derivations can be monitored by things called **Reactors**, which do not themselves have any kind of 'current value', but are more like independent agents which exist solely for executing side effects.

Let's have a look at a tiny example app which greets the user:

```javascript
import {atom, derivation, transact} from 'derivable'

// global application state
const $Name = atom("World");     // the name of the user  
const $CountryCode = atom("en"); // for i18n

// static constants don't need to be wrapped
const greetings = {
  en: "Hello",
  de: "Hallo",
  es: "Hola",
  cn: "您好",
  fr: "Bonjour",
};

// derive a greeting message based on the user's name and country.
const $greeting = $CountryCode.derive(cc => greetings[cc]);
const $message = derivation(() =>
  `${$greeting.get()}, ${$name.get()}!`
);

// set up a Reactor to print the message every time it changes, as long as
// we know how to greet people in the current country.
$message.react(
  msg => console.log(msg),
  {when: $greeting}
);
// $> Hello, World!

$CountryCode.set("de");
// $> Hallo, World!
$Name.set("Dagmar");
// $> Hallo, Dagmar!

// we can avoid unwanted intermediate reactions by using transactions
transact(() => {
  $CountryCode.set("fr");
  $Name.set("Étienne");
});
// $> Bonjour, Étienne!

// if we set the country code to a country whose greeting we don't know,
// $greeting becomes undefined, so the $message reactor won't run
// In fact, the value of $message won't even be recomputed.
$CountryCode.set('dk');
// ... crickets chirping
```

The structure of this example can be depicted as the following DAG:

<img src="https://ds300.github.com/derivablejs/img/example.svg" align="center" width="89%"/>

## Usage

DerivableJS is becoming fairly mature, and has been used for serious stuff in production with very few issues. I think it is safe to consider it beta quality at this point.

If your app is non-trivial, use [Immutable](https://facebook.github.io/immutable-js/).

##### With React

[react-derivable](https://github.com/jevakallio/react-derivable) is where it's at.

##### With Redux

DerivableJS can be used as a kind-of replacement for reselect, by just doing something like this:

```javascript
const $Store = atom(null);

myReduxStore.subscribe(() => $Store.set(myReduxStore.getState()));
```

and then you derive all your derived state from $Store, rather than

##### Debugging

Due to inversion of control, the stack traces you get when your derivations throw errors can be totally unhelpful. There is a nice way to solve this problem for dev time. See [setDebugMode](https://ds300.github.com/derivablejs/#derivable-setDebugMode) for more info.

##### Examples (very wip)

The best example of writing good code with Derivables right now is the [talk demo](https://github.com/ds300/derivables-talk-demo), which is presented as a 'diff tutorial' and should be read from the initial commit.

The next best is the [routing walkthrough](https://github.com/ds300/derivablejs/tree/master/examples/routing/README.md)

I've also implemented a solution to @staltz's [flux challenge](https://github.com/staltz/flux-challenge/tree/master/submissions/ds300).

There is a proper gitbook tutorial on the way!

##### Browser
Either with browserify/webpack/common-js-bundler-du-jour or build as umd bundle with `npm run build -- --umd`

##### Equality Woes
JavaScript is entirely whack when it comes to equality. People do [crazy jazz](https://github.com/ramda/ramda/blob/v0.16.0/src/internal/_equals.js) trying to figure out if some stuff is the same as some other stuff.

If the data you're threading through DerivableJS needs its own notion of equality, make sure it has a sensible `.equals` method and everything will be fine.

If you're using a data library with some custom non-standard mechanism for doing equality checks (e.g. mori), then you'll need to re-initialize DerivableJS with a custom equality function.

```javascript
import { withEquality } from 'derivable'

const { atom, derive, ..._} = withEquality(myCustomEqualityChecker);
```

## Contributing

I heartily welcome questions, feature requests, bug reports, and general suggestions/criticism on the github issue tracker. I also welcome bugfixes via pull request (please read CONTRIBUTING.md before sumbmitting).

## Thanks

Special thanks to:

- Alan Dipert and Micha Niskin, creators of Javelin (and Boot!). [Their talk on Javelin](http://www.infoq.com/presentations/ClojureScript-Javelin) was the first exposure I had to these ideas.
- Michael Thompson for the [re-frame README](https://github.com/Day8/re-frame). My favourite README of all time. <3
- David Weir and Jeremy Reffin for their invaluable mentorship.
- Rich Hickey and the Clojure community for being a constant source of ideas and for making programming even more fun.

## License

```
Copyright 2015 David Sheldrick <djsheldrick@gmail.com>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
