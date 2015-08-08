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

So first let's convert the hash into a route. Actually, the hash might have params
at the end so let's convert the hash into a route and a parameter map


***/

import { List, Map } from 'immutable';

type Route = List<string>;
type Params = Map<string, string | boolean>;

const route : Derivable<Route> = hash.derive(hash => {
  switch (hash) {
  case "":
  case "#":
  case "#/":
    return List<string>();
  default:
    let queryIdx = hash.indexOf("?");
    if (queryIdx >= 0) {
      hash = hash.slice(2, queryIdx);
    } else {
      // slice(2... to remove the '#/'
      hash = hash.slice(2);
    }
    return List<string>(hash.split("/"));
  }
});

const queryParams : Derivable<Params>  = hash.derive(hash => {
  let queryIdx = hash.indexOf("?");
  if (queryIdx >= 0) {
    let result = Map<string, string | boolean>().asMutable();

    let parts = hash.slice(queryIdx + 1).split(/&/);

    for (let part of parts) {
      let equalsIdx = part.indexOf("=");
      if (equalsIdx >= 0) {
        result.set(part.slice(0, equalsIdx), part.slice(equalsIdx + 1));
      } else {
        result.set(part, true);
      }
    }

    return result.asImmutable();
  } else {
    return Map<string, string | boolean>();
  }
});

/***

Ok, lets see if that all works:

***/
console.log(route.get());
// $> List []
console.log(queryParams.get());
// $> Map {}

hash.set("#/route");
console.log(route.get());
// $> List [ "route" ]

hash.set("#/some/route");
console.log(route.get());
// $> List [ "some", "route" ]

hash.set("#/some/route/with?a=param");
console.log(route.get());
// $> List [ "some", "route", "with" ]
console.log(queryParams.get());
// $> Map { "a": "param" }

hash.set("#/some/route/with?a=param&more=params&others&evenmore");
console.log(route.get());
// $> List [ "some", "route", "with" ]
console.log(queryParams.get());
// $> Map { "a": "param", "more": "params", "others": true, "evenmore": true }

/***

Seems good enough for now.

## Dispatching

So handlers, the things which render the dom for a particular route, are
derivables rather than functions, but they need to be registered with something
so our dispatch logic can find them.

Let's keep things simple and just have a glodbal dispatch table which tries to
match the current route against a registered route.

***/

import { derive, unpack } from 'havelock'
const join = (x, y) => x.join(y);
hash.set("#/home");

type DOM = any;
type Handler = Derivable<DOM> | DOM;
type DispatchTable = Map<Route, Handler>;

const dispatchTable: Atom<DispatchTable> = atom(Map<Route, Handler>());


const chosenHandler: Derivable<Handler> = dispatchTable.derive(dt => {
  // simple lookup for now
  return dt.get(route.get());
}).or(derive`404 route not found: /${route.derive(join, "/")}`);


const reaction = chosenHandler.react(dom => console.log(unpack(dom)));
// $> 404 route not found: /home


dispatchTable.swap(dt => dt.set(List(["home"]), "Hello World!"));
// $> Hello World!


dispatchTable.swap(dt => dt.set(List(["print-params"]),
                                queryParams.derive(printParams)));

function printParams(params: Params) {
  let result = "the params are:";
  for (let [key, val] of params.entrySeq().toArray()) {
    result += `\n  ${key}: ${val}`;
  }
  return  result;
}

hash.set("#/print-params?today=thursday&tomorrow=friday&almost=party_time");

// $> the params are:
// $>   today: thursday
// $>   tomorrow: friday
// $>   almost: party_time


// (wip)
