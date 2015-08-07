

# Router

This file will walk you through the implemetation of a simple but powerful
routing system.

## Routing

So everything descends from a raw hash string.

```typescript
import { Derivable, Atom, atom } from 'havelock';

// this is what we'd use in a browser
function makeRoot(): Derivable<string> {
  let root = atom(window.location.hash);

  window.addEventListener('hashchange', () => root.set(window.location.hash));

  return root;
}

// but this isn't running in a browser so we'll do this:

const root: Atom<string> = atom("");
```


So first let's convert the root into a route.

I reckon a route should be a string parts list + a map of query params

```typescript
import { List, Map } from 'immutable';

interface Route {
  parts: List<string>;
  params: Map<string, string>;
}

const route: Derivable<Route> = root.derive(root => {
  let params = Map<string, string>();
  root = root.trim();
  switch (root) {
  case "":
  case "#":
  case "#/":
    return { parts: List([]), params };
  default:
    const paramsIdx = root.indexOf("?");
    if (paramsIdx >= 0) {
      params = parseParams(root.slice(paramsIdx + 1));
      root = root.slice(2, paramsIdx);
    } else {
      root = root.slice(2);
    }

    return { parts: List(root.split("/")), params }
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
```


Ok, lets see if that all works:

```typescript
console.log(route.get());
// $> { parts: List [], params: Map {} }

root.set("#/route");
console.log(route.get());
// $> { parts: List [ "route" ], params: Map {} }

root.set("#/some/route");
console.log(route.get());
// $> { parts: List [ "some", "route" ], params: Map {} }

root.set("#/some/route/with?a=param");
console.log(route.get());
// $> { parts: List [ "some", "route", "with" ],
// $>   params: Map { "a": "param" } }

root.set("#/some/route/with?a=param&more=params&others&evenmore");
console.log(route.get());
// $> { parts: List [ "some", "route", "with" ],
// $>   params: Map { "a": "param", "more": "params", "others": "", "evenmore": "" } }
```


Good enough for now.

## Dispatching

So handlers, the things which render the dom for a particular route, are
derivables rather than functions, but they need to be registered with something
so our dispatch logic can find them.

```typescript
const routeParts = route.derive(r => r.parts);
const chosenRoute = routeParts.derive(null);

// (wip)
```
