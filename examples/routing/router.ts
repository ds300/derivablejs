/// <reference path="./node_modules/havelock/dist/havelock.d.ts"/>
/// <reference path="./node_modules/immutable/dist/immutable.d.ts"/>

/***

# Router

This file will walk you through the implemetation of a simple but powerful
routing system.

## Routing

So everything descends from a raw hash string.

***/

import { Derivable, Atom, atom } from 'havelock';

// this is what we'd use in a browser
function makeRoot(): Derivable<string> {
  let hash = atom(window.location.hash);

  window.addEventListener('hashchange', () => hash.set(window.location.hash));

  return hash;
}

// but this isn't running in a browser so we'll do this:

const hash: Atom<string> = atom("");

/***

So first let's convert the hash into a route.

I reckon a route should be a string parts list + a map of query params

***/

import { List, Map } from 'immutable';

interface Route {
  parts: List<string>;
  params: Map<string, string>;
}

const route: Derivable<Route> = hash.derive(hash => {
  let params = Map<string, string>();
  hash = hash.trim();
  switch (hash) {
  case "":
  case "#":
  case "#/":
    return { parts: List([]), params };
  default:
    const paramsIdx = hash.indexOf("?");
    if (paramsIdx >= 0) {
      params = parseParams(hash.slice(paramsIdx + 1));
      hash = hash.slice(2, paramsIdx);
    } else {
      hash = hash.slice(2);
    }

    return { parts: List(hash.split("/")), params }
  }
});

function parseParams (str: string): Map<string, string> {
  let result = Map<string, string>().asMutable();

  let parts = str.split(/&/);

  for (let part of parts) {
    let equalsIdx = part.indexOf("=");
    if (equalsIdx >= 0) {
      result.set(part.slice(0, equalsIdx), part.slice(equalsIdx + 1));
    } else {
      result.set(part, "");
    }
  }

  return result;
}

/***

Ok, lets see if that all works:

***/

console.log(route.get());
// $> { parts: List [], params: Map {} }

hash.set("#/route");
console.log(route.get());
// $> { parts: List [ "route" ], params: Map {} }

hash.set("#/some/route");
console.log(route.get());
// $> { parts: List [ "some", "route" ], params: Map {} }

hash.set("#/some/route/with?a=param");
console.log(route.get());
// $> { parts: List [ "some", "route", "with" ],
// $>   params: Map { "a": "param" } }

hash.set("#/some/route/with?a=param&more=params&others&evenmore");
console.log(route.get());
// $> { parts: List [ "some", "route", "with" ],
// $>   params: Map { "a": "param", "more": "params", "others": "", "evenmore": "" } }

/***

Good enough for now.

## Dispatching

So handlers, the things which render the dom for a particular route, are
derivables rather than functions, but they need to be registered with something
so our dispatch logic can find them.

***/

const routeParts = route.derive(r => r.parts);
const chosenRoute = routeParts.derive(null);

// (wip)
