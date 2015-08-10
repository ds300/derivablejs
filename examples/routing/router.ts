/// <reference path="./node_modules/havelock/dist/havelock.d.ts"/>
/// <reference path="./node_modules/immutable/dist/immutable.d.ts"/>

/***

# Router

This file will walk you through the implemetation of a simple but powerful
routing system.

## Routing

Everything descends from a raw hash string.

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

Let's convert the hash into a route. Actually, the hash might have params
at the end so let's convert the hash into a route and a parameter map

***/

import { List, Map } from 'immutable';

type Route = List<string>;
type Params = Map<string, string | boolean>;

// e.g. '#/some/path?query=something' becomes ['/some/path', 'query=something']
function splitHash(hash: string): [string, string] {
  let queryIdx = hash.indexOf("?");
  if (queryIdx < 0) {
    return [hash.slice(1), ""];
  } else {
    return [hash.slice(1, queryIdx), hash.slice(queryIdx+1)];
  }
}

// e.g. 'some/path' or '/some/path' or '/some/path/'
//       becomes List ['some', 'path']
function path2route(path: string): Route {
  return List(path.split("/").filter(x => x !== ""));
}

// e.g. 'query=something&anotherThing'
//       becomes Map {query: 'something', anotherThing: true}
function parseQueryString(query: string): Params {
  let result = <Params>Map().asMutable();

  let parts = query.split("&");

  for (let part of parts) {
    let equalsIdx = part.indexOf("=");
    if (equalsIdx >= 0) {
      result.set(part.slice(0, equalsIdx), part.slice(equalsIdx + 1));
    } else {
      result.set(part, true);
    }
  }

  return result.asImmutable();
}

function raiseTuple<a, b>(tuple: Derivable<[a, b]>): [Derivable<a>, Derivable<b>] {
  return [tuple.derive(t => t[0]), tuple.derive(t => t[1])];
}

const [path, queryString] = raiseTuple(hash.derive(splitHash));

const route = path.derive(path2route);

const queryParams = queryString.derive(parseQueryString);

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
console.log(queryParams.get());
// $> Map {}

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

I'll refer to the things which render the dom for a particular route as 'handlers'.

In most MVC frameworks handlers are functions or templates with some associated
data and business logic. With havelock, handlers will simply be Derivables or ordinary
renderable values.
It doesn't matter what they derive from or where they came
from as long as they produce something renderable when dereferenced.

We'll register them in a global nested map structure:

***/

hash.set("#/home");

import { derive, unpack, Reaction } from 'havelock'

type DOM = any;
type Handler = Derivable<DOM> | DOM;
type DispatchTree = Map<string, Handler | any>;
// unfortunately Typescript doesn't allow recursive type aliases, otherwise that
// `any` at the end there would be `DispatchTree`


const dispatchTree: Atom<DispatchTree> = atom(<DispatchTree>Map());

function register (dt: DispatchTree, path: string, handler: Handler): DispatchTree {
  return dt.setIn(path2route(path).push(""), handler);
}

function lookup (dt: DispatchTree, route: Route): Handler {
  return dt.getIn(route.push(""));
}

const fourOhFour: Handler = route.derive(route => {
  return '404 route not found: /' + route.join("/");
});

let chosenHandler: Derivable<Handler> = dispatchTree.derive(lookup, route)
                                                    .or(fourOhFour);

let reaction: Reaction<DOM> = chosenHandler.derive(unpack)
                                           .react(dom => console.log(dom));
// $> 404 route not found: /home


dispatchTree.swap(register, '/home', "Hello World!");
// $> Hello World!


dispatchTree.swap(register, '/print-params', queryParams.derive(renderParams));

function renderParams(params: Params) {
  let result = "the params are:";
  for (let [key, val] of params.entrySeq().toArray()) {
    result += `\n  ${key}: ${val}`;
  }
  return result;
}

hash.set("#/print-params?today=thursday&tomorrow=friday&almost=party_time");
// $> the params are:
// $>   today: thursday
// $>   tomorrow: friday
// $>   almost: party_time


/***

Yeah that's ok I reckon. The next feature I want to enable is the ability to provide
parts of your application with contextual dispatch trees, so they don't have to know
where they should put themselves in the global dispatch tree.

Lenses to the rescue!

***/

import { Lens } from 'havelock'

function context(ctx: string): Lens<DispatchTree, DispatchTree> {
  let route = path2route(ctx);
  return {
    get (dt: DispatchTree): DispatchTree {
      return dt.getIn(route) || <DispatchTree>Map();
    },
    set (parent: DispatchTree, me: DispatchTree) {
      return parent.setIn(route, me);
    }
  };
}

const printRoutes = dispatchTree.lens(context('/print'));

printRoutes.swap(register, "/params", queryParams.derive(renderParams));

hash.set("#/print/params?a=b&c");
// $> the params are:
// $>   a: b
// $>   c: true

printRoutes.swap(register, "/hello", queryParams.derive(ps => {
  return `Hello, ${ps.get('name')}!`;
}));

hash.set("#/print/hello?name=Sadie");
// $> Hello, Sadie!

printRoutes.swap(register, '/', "You need to pick a thing to print, dawg");

hash.set("#/print");
// $> You need to pick a thing to print, dawg


/***

Splendid. The last feature I want to support is inline path parameters, e.g. one should be
able to specify a path like `/resource/:id/home`, for which a hash like
`#/resource/32/home` might render the home page of the resource with id `32`.

I don't think I'll need to change the register function for this, but the lookup
function will definitely need to be expanded in order to accumulate the parameters
and put them somewhere.

***/

function lookupWithParams(dt: DispatchTree, route: Route, params: Params): [Handler, Params] {
  if (route.size === 0) {
    return [dt, params];
  } else {
    let child = dt.get(route.first());
    if (child) {
      return lookupWithParams(child, route.shift(), params);
    } else {
      // look for param routes
      let paramKeys = dt.keySeq().filter(k => k.indexOf(':') === 0).toArray();

      for (let k of paramKeys) {
        let result = lookupWithParams(dt.get(k),
                                      route.shift(),
                                      params.set(k.slice(1), route.first()));
        if (result) {
          return result;
        }
      }
    }
  }

  return null;
}

function lookup2 (dt: DispatchTree, route): [Handler, Params] {
  return lookupWithParams(dt, route.push(""), <Params>Map()) || [null, <Params>Map()];
};

let [lookupResult, inlineParams] = raiseTuple(dispatchTree.derive(lookup2, route));

chosenHandler = lookupResult.or(fourOhFour);

// now merge query params and inline params
const merge = (x, y) => x.merge(y);
const params = queryParams.derive(merge, inlineParams);


// re-bind reaction to use new `chosenHandler`
reaction.stop();
reaction = chosenHandler.derive(unpack).react(dom => console.log(dom));;
// $> You need to pick a thing to print, dawg


dispatchTree.swap(register, "resource/:id/home", params.derive(params => {
  let { id, fruit } = params.toJS();
  let result = `This is the home of the resource with id ${id}`;
  if (fruit) {
    result += `\nToday the fruit is ${fruit}`
  }
  return result;
}));

hash.set("#/resource/343/home");
// $> This is the home of the resource with id 343

hash.set("#/resource/wub-a-lub-a-dub-dub/home?fruit=banana");
// $> This is the home of the resource with id wub-a-lub-a-dub-dub
// $> Today the fruit is banana

printRoutes.swap(register, "/:echo", params.derive(ps => {
  return ps.get('echo');
}));

hash.set("#/print/params?buns=5");
// $> the params are:
// $>   buns: 5

hash.set("#/print/whatevs");
// $> whatevs

/***

I don't know about you, but that's everything I ever wanted in a router right there.

***/
