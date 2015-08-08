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

function path2route(path: string): Route {
  return List(path.split("/").filter(x => x !== ""));
}

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
    return path2route(hash);
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

const fourOhFour = derive`404 route not found: /${route.derive(join, "/")}`;

let chosenHandler: Derivable<Handler> = dispatchTable.derive(dt => {
  // simple lookup for now
  return dt.get(route.get());
}).or(fourOhFour);


let reaction = chosenHandler.derive(unpack).react(dom => console.log(dom));;
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
  return result;
}

hash.set("#/print-params?today=thursday&tomorrow=friday&almost=party_time");

// $> the params are:
// $>   today: thursday
// $>   tomorrow: friday
// $>   almost: party_time


/***

Ok this is going places. The first thing that is obviously in need of revision
is the horribly verbose mechanism for registering routes. Ideally we'd like to
be able to do something like `routes.register("/some/route", handler)`. A way to nest
routes would be most useful too. That might look like `routes.context("/some").register("/route", handler)`.

Nested maps and lenses to the rescue?

***/

import { Lens } from 'havelock'

type DispatchTree = Map<string, any>;

let registerRoute: (dt: DispatchTree, route: Route, handler: Handler) => DispatchTree
= (dt, route, handler) => {
  if (route.size === 0) {
    return dt.set("", handler);
  } else {
    let ctx = route.first();
    let child = dt.get(ctx) || Map<string, any>();
    return dt.set(ctx, registerRoute(child, route.shift(), handler));
  }
}

function register(dt: DispatchTree, path: string, handler: Handler): DispatchTree {
  return registerRoute(dt, path2route(path), handler);
}

function context(ctx: string): Lens<DispatchTree, DispatchTree> {
  let route = path2route(ctx);
  return {
    get (dt: DispatchTree): DispatchTree {
      let child = dt.getIn(route);
      if (!child) {
        return Map<string, any>();
      } else if (child instanceof Map) {
        return child;
      } else {
        return Map<string, any>().set("", child);
      }
    },
    set (parent: DispatchTree, me: DispatchTree) {
      return parent.setIn(route, me);
    }
  };
}

const dispatchTree: Atom<DispatchTree> = atom(Map<string, any>());

dispatchTree.swap(register, "/", "Hello Again, World!");

function lookup(dt: DispatchTree, route: Route): Handler {
  if (route.size === 0) {
    if (dt instanceof Map) {
      return dt.get("");
    } else {
      return dt;
    }
  } else {
    let child = dt.get(route.first());
    if (child) {
      return lookup(child, route.shift());
    } else {
      return null;
    }
  }
}

chosenHandler = dispatchTree.derive(lookup, route).or(fourOhFour);

// rebind reaction so it uses the latest `chosenHandler`
reaction.stop();
reaction = chosenHandler.derive(unpack).react(dom => console.log(dom));;
// $> 404 route not found: /print-params

// oh right yeah...

hash.set("")
// $> Hello Again, World!

dispatchTree.lens(context("params"))
            .swap(register, "print", queryParams.derive(printParams));

hash.set("#/params/print?yes");
// $> the params are:
// $>   yes: true


dispatchTree.swap(register, "params", "you are at '/params'");
hash.set("#/params");
// $> you are at '/params'

hash.set("#/params/print?yes");
// $> the params are:
// $>   yes: true

dispatchTree.lens(context("params"))
            .swap(register, "", "you are back at '/params'");

hash.set("#/params");
// $> you are back at '/params'

hash.set("#/params/");
// ... nothing happens

hash.set("#/params/print?yes");
// $> the params are:
// $>   yes: true

dispatchTree.lens(context("some/incredibly"))
            .swap(register, "deeply/nested/route", "wow. so deep. much nest.");

hash.set("#/some/incredibly/deeply/nested/route");
// $> wow. so deep. much nest.

/***

`routes.swap(register, "some/route", handler)` is slightly more verbose
than `routes.register("some/route", handler)`, and `routes.lens(context("ctx"))`
is slightly more verbose than `routes.context("ctx")`, but that extra concision is
trivial to achieve with wrapper objects if you are so inclined.

The last thing I want to support here is inline route params, e.g. one should be
able to specify a path like `/resource/:id/home`, for which a hash like
`#/resource/32/home` might render the home page of the resource with id `32`.

There are a couple of issues with that:

- how to get the inline params into the handlers
- how to get the inline params in the first place

The first bit is easy:

***/

import { derivation } from 'havelock'

let inlineParams: Derivable<Params>/* = ? */;

const params = derivation(() => queryParams.get().merge(inlineParams.get()));

/***

And now the handlers just derive from `params` rather than `queryParams`.

As for what `inlineParams` should derive from... Well clearly it needs to know
about two things:

- the current route
- the route which matches the current route

The first one is available already. The second one can't be made available so
easily. Maybe the `lookup` function could return it along with the matching
handler. Or maybe the `lookup` function could be extended to accumulate the inline
params and just return those? Whatever happens the lookup function needs to know
about inline params, so it may as well do the extraction.

***/

class InlineParam {
  name: string;
  kids: DispatchTree;
  constructor (name) {
    this.name = name;
    this.kids = <DispatchTree>Map();
  }
}

registerRoute = (dt: DispatchTree, route: Route, handler: Handler) => {
  if (route.size === 0) {
    return dt.set("", handler);
  } else {
    let ctx = route.first();
    if (ctx.indexOf(":") === 0) {
      if (dt.has(":")) {
        throw new Error(`trying to overwrite inline param ${dt.get(":").name}` +
                         ` with ${ctx}`);
      } else {
        let child = new InlineParam(ctx.slice(1));
        child.kids = registerRoute(child.kids, route.shift(), handler);
        return dt.set(":", child);
      }
    }

    let child = dt.get(ctx) || <DispatchTree>Map();

    return dt.set(ctx, registerRoute(child, route.shift(), handler));
  }
}

function lookupWithParams(dispatchTarget: any, route: Route, params: Params): [Handler, Params] {
  // dispatchTarget either DispatchTree, InlineParam, or handler
  if (route.size === 0) {
    if (dispatchTarget instanceof Map) {
      return [dispatchTarget.get(""), params];
    } else if (!(dispatchTarget instanceof InlineParam)) {
      return [dispatchTarget, params];
    }
  }

  else if (dispatchTarget instanceof InlineParam) {
    params = params.set(dispatchTarget.name, route.first());
    return lookupWithParams(dispatchTarget.kids, route.shift(), params);
  }

  else if (dispatchTarget instanceof Map) {
    let child = dispatchTarget.get(route.first());
    if (child) {
      return lookupWithParams(child, route.shift(), params);
    }
    else {
      let inlineParam = dispatchTarget.get(":");
      if (inlineParam) {
        return lookupWithParams(inlineParam, route, params);
      }
    }
  }
  return [null, null]
}

{
  let lookupResult = dispatchTree.derive(lookupWithParams, route, Map());
  chosenHandler = lookupResult.derive(r => r[0]).or(fourOhFour);
  inlineParams = lookupResult.derive(r => r[1]);
}

// rebind reaction so it uses the latest `chosenHandler`
reaction.stop();
reaction = chosenHandler.derive(unpack).react(dom => console.log(dom));
// $> wow. so deep. much nest.

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

/***

All that's left to do is update the `context` function to know how to deal
with inline params.

***/

// (wip)
