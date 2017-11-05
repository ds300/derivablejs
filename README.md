<h1 align="center">DerivableJS</h1>
<h3 align="center">State made simple → Effects made easy</h3>

[![npm](https://img.shields.io/npm/v/derivable.svg?maxAge=2592000)](https://www.npmjs.com/package/derivable) [![Build Status](https://travis-ci.org/ds300/derivablejs.svg?branch=new-algo)](https://travis-ci.org/ds300/derivablejs)  [![Coverage Status](https://coveralls.io/repos/github/ds300/derivablejs/badge.svg?branch=new-algo)](https://coveralls.io/github/ds300/derivablejs?branch=new-algo) [![Join the chat at https://gitter.im/ds300/derivablejs](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ds300/derivablejs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![Empowered by Futurice's open source sponsorship program](https://img.shields.io/badge/sponsor-chilicorn-ff69b4.svg)](http://futurice.com/blog/sponsoring-free-time-open-source-activities?utm_source=github&utm_medium=spice&utm_campaign=derivablejs) [![.min.gz size](https://img.shields.io/badge/.min.gz%20size-3.4k-blue.svg)](http://github.com)
---

Derivables are an Observable-like state container with superpowers. Think [MobX](https://github.com/mobxjs/mobx) distilled to a potent essence, served with two heaped tablespoons of extra performance, a garnish of declarative effects management, and a healthy side-salad of immutability.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Quick start](#quick-start)
- [Reactors](#reactors)
- [Key differences with MobX](#key-differences-with-mobx)
- [API / Documentation](#api--documentation)
- [Usage](#usage)
  - [With React](#with-react)
  - [With Immutable](#with-immutable)
  - [Debugging](#debugging)
  - [Examples](#examples)
  - [Browser](#browser)
- [Contributing](#contributing)
- [Inspiration <3](#inspiration-3)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

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

  // Or use value property
  $Name.value = $Name.value + " Shakespeare"; 
  ```

  <em>N.B. The dollar-sign prefix is just a simple convention I use to create a visual distinction between ordinary values and derivable values.</em>

- **Derivations**

  Derivations are declarative transformations of values held in atoms. You can create them with the `derive` function.

  ```javascript
  import {derive} from 'derivable';

  const cyber = word => word.toUpperCase().split('').join(' ');

  const $cyberName = derive(() =>
    cyber($Name.get())
  );

  $cyberName.get(); // 'W I L L I A M'

  $Name.set('Sarah');

  $cyberName.get(); // 'S A R A H'
  ```

  Unlike atoms, derivations cannot be modified in-place with a `.set` method. Their values change only when one or more of the values that they depend upon change. Here is an example with two dependencies.

  ```javascript
  const $Transformer = atom(cyber);

  const $transformedName = derive(() =>
    $Transformer.get()($Name.get())
  );

  $transformedName.get(); // => 'S A R A H'

  const reverse = string => string.split('').reverse().join('');

  $Transformer.set(reverse);

  $transformedName.get(); // => 'haraS'

  $Name.set('Fabian');

  $transformedName.get(); // => 'naibaF'
  ```

  `derive` takes a function of zero arguments which should
  dereference one or more Derivables to compute the new derived value. DerivableJS then sneakily monitors who
  is dereferencing who to infer the parent-child relationships.

## Reactors

Declarative state management is nice in and of itself, but the real benefits come from how it enables us to more effectively manage side effects. DerivableJS has a really nice story on this front: changes in atoms or derivations can be monitored by things called **Reactors**, which do not themselves have any kind of 'current value', but are more like independent agents which exist solely for executing side effects.

Let's have a look at a tiny example app which greets the user:

```javascript
import {atom, derive, transact} from 'derivable'

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
const $greeting = derive(() =>
  greetings[$CountryCode.get()]
);
const $message = derive(() =>
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

## Key differences with MobX

- Smaller API surface area.

   There are far fewer *kinds of thing* in DerivableJS, and therefore fewer
   things to learn and fewer surprising exceptions and spooky corners. This
   reduces noise and enhances one's ability to grok the concepts and wield the
   tools on offer. It also shrinks the set of tools
   on offer, but maybe that's not a bad thing:

   > It seems that perfection is attained not when there is nothing more to add, but when there is nothing more to remove.

   <em>- Antoie de Saint Exupéry</em>

- No transparent dereferencing and assignment.

   It is always necessary to call `.get` on derivables to find out what's inside, and you always have to call `.set` on atoms to change what's inside.
   This provides a consistent semantic and visual
   distinction between ordinary values and derivable values.

- No observable map and array types.

   So you probably have to use something extra like Immutable or [icepick](https://github.com/aearly/icepick) to deal with collections. Not great if you're just out to get
   shit done fast, but the benefits of immutable
   collections become more and more valuable as projects
   mature and grow in scope.

- More subtle control over reactors

  DerivableJS has a tidy and flexible declarative system for defining when reactors should start and stop. This
  is rather nice to use for managing many kinds of side effects.

- Speed

  DerivableJS is finely tuned, and propagates change
  significantly faster than MobX. \[link to benchmark-results.html forthcoming\]

## API / Documentation

[Over Here](https://ds300.github.io/derivablejs)

## Usage

DerivableJS is fairly mature, and has been used enough in production by various people to be considered a solid beta-quality piece of kit.

### With React

The fantastic project [react-derivable](https://github.com/andreypopp/react-derivable) lets you use
derivables in your render method, providing seamless interop with component-local state and props.

### With Immutable

DerivableJS works spiffingly with [Immutable](https://github.com/facebook/immutable), which
is practically required if your app deals with medium-to-large collections.

### Debugging

Due to inversion of control, the stack traces you get when your derivations throw errors can be totally unhelpful. There is a nice way to solve this problem for dev time. See [setDebugMode](https://ds300.github.com/derivablejs/#derivable-setDebugMode) for more info.

### Examples

[See here](https://github.com/ds300/derivablejs/tree/master/examples)

### Browser
Either with browserify/webpack/common-js-bundler-du-jour, or clone the repo, run `npm install && npm run build`, then grab the UMD bundle from `dist/derivable.umd[.min].js` (source maps are also available).

```javascript
import { withEquality } from 'derivable'

const { atom, derive, ..._} = withEquality(myCustomEqualityChecker);
```

## Contributing

I heartily welcome questions, feature requests, bug reports, and general suggestions/criticism on the github issue tracker. I also welcome bugfixes via pull request (please read CONTRIBUTING.md before sumbmitting).

## Inspiration <3

- [Are we there yet?](https://www.infoq.com/presentations/Are-We-There-Yet-Rich-Hickey)
- The [re-frame README](https://github.com/Day8/re-frame)
- [ratom.cljs](https://github.com/reagent-project/reagent/blob/master/src/reagent/ratom.cljs)
- [Turning the database inside out](https://www.youtube.com/watch?v=fU9hR3kiOK0)
- [Simple Made Easy](https://www.infoq.com/presentations/Simple-Made-Easy)

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
