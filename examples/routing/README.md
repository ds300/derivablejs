

# Router

This file will walk you through the implemetation of a simple but powerful
routing system.

## Routing

So everything descends from a raw hash string.

```typescript
import { Derivable, Atom, atom } from 'havelock';

// this is what we'd use in a browser
function makeRoot(): Derivable<string> {
  let hash = atom(window.location.hash);

  window.addEventListener('hashchange', () => hash.set(window.location.hash));

  return hash;
}

// but this isn't running in a browser so we'll do this:

const hash: Atom<string> = atom("");
```


So first let's convert the hash into a route. Actually, the hash might have params
at the end so let's convert the hash into a route and a parameter map

```typescript
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
```


Ok, lets see if that all works:

```typescript
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
```


Seems good enough for now.

## Dispatching

So handlers, the things which render the dom for a particular route, are
derivables rather than functions, but they need to be registered with something
so our dispatch logic can find them.

Let's keep things simple and just have a glodbal dispatch table which tries to
match the current route against a registered route.

```typescript
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


let reaction = chosenHandler.react(dom => console.log(unpack(dom)));
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
```


Ok this is going places. The first thing that is obviously in need of revision
is the horribly verbose mechanism for registering routes. Ideally we'd like to
be able to do something like `routes.register("/some/route", handler)`. A way to nest
routes would be most useful too. That might look like `routes.context("/some").register("/route", handler)`.

Nested maps and lenses to the rescue?

```typescript
import { Lens } from 'havelock'

type NestedHandler = Handler | Map<string, any>;
// That `Map<string, any>` should be `DispatchTree`
// TypeScript doesn't support recursive type aliases for some reason.

type DispatchTree = Map<string, NestedHandler>;

function register(dt: DispatchTree, path: string, handler: Handler): DispatchTree {
  return registerRoute(dt, path2route(path), handler);
}

function registerRoute(dt: DispatchTree, route: Route, handler: Handler): DispatchTree {
  if (route.size === 0) {
    return dt.set("", handler);
  } else {
    let ctx = route.first();
    let child = dt.get(ctx) || Map<string, NestedHandler>();
    return dt.set(ctx, registerRoute(child, route.shift(), handler));
  }
}

function context(ctx: string): Lens<DispatchTree, DispatchTree> {
  return {
    get (dt: DispatchTree): DispatchTree {
      let child = dt.get(ctx);
      if (!child) {
        return Map<string, NestedHandler>();
      } else if (child instanceof Map) {
        return child;
      } else {
        return Map<string, NestedHandler>().set("", child);
      }
    },
    set (parent: DispatchTree, me: DispatchTree) {
      return parent.set(ctx, me);
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
reaction = chosenHandler.react(dom => console.log(unpack(dom)));
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
```


Ok, so `routes.swap(register, "some/route", handler)` is slightly more verbose
than `routes.register("some/route", handler)`, and `routes.lens(context("ctx"))`
is slightly more verbose than `routes.context("ctx")`, but the benefits of
composability and extensibility are worth it IMO.

```typescript
// (wip)
```
