

# Router

This file will walk you through the implemetation of a simple but powerful
routing system with Havelock. It is structured in two parts:

1. Data and Functions
2. Reactive Glue

The first section doesn't involve using Havelock at all, but rather shows how to
go about designing all the individual components of a routing system from a functional perspective.
It is written for anyone with JS experience, but if you've done any functional programming with immutable data before it should be *really* easy to follow.

Part 2 shows how to take the inert functional system designed in Part 1, and turn it into a living breathing thing using Havelock.

## Part 1: Data and Functions

The top-level piece of data is the hash fragment at the end of a url. e.g. the url `https://ds300.github.com/#this-is-a-hash-fragment` has a hash fragment `'#this-is-a-hash-fragment'`, and the url `https://ds300.github.com/` has a hash fragment `''`.

We are essentially building a function which transforms a hash fragment into a DOM tree.

To begin, let's examine the types of hash fragments we will be looking at:

- Routes: `'#/some/route'`, `'#/'`, `'#'`, `'#/another/longer/route'`
- Routes + Query Params: `'#/?name=value&boolean_flag'`, `'#/some/route/with?a=param'`

First we want to split the hash fragment into two parts: the route part and the query part. These are cleverly separated by a question mark. At the same time we can get rid of the `#` character becasue it doesn't mean anything at this stage.

```typescript
function splitHash(hash: string): [string, string] {
  let queryIdx = hash.indexOf("?");
  if (queryIdx < 0) {
    return [hash.slice(1), ""];
  } else {
    return [hash.slice(1, queryIdx), hash.slice(queryIdx+1)];
  }
}

console.log(splitHash('#/some/route/with?a=param')); 
// $> [ '/some/route/with', 'a=param' ]

console.log(splitHash('#/some/route')); 
// $> [ '/some/route', '' ]

console.log(splitHash('#/?question=why?&answer=because!')); 
// $> [ '/', 'question=why?&answer=because!' ]
```


The next step is to parse the route and query parts into more useful forms.

To do this I'm going to use the `List` and `Map` classes from facebook's [immutable](https://facebook.github.io/immutable-js/) library.

```typescript
import { List, Map } from 'immutable';

type Route = List<string>;
type Params = Map<string, string | boolean>;

const notEmpty = x => x !== '';

function parseRouteString (route: string): Route {
  const parts = route.split("/")        // break apart
                     .filter(notEmpty); // canonicalise
  return List(parts);
}

console.log(parseRouteString('/')); 
// $> List []

console.log(parseRouteString('/some/route')); 
// $> List [ "some", "route" ]

// ignores multiple consecutive slashes
console.log(parseRouteString('/a/very//long/route////indeed///')); 
// $> List [ "a", "very", "long", "route", "indeed" ]

// it should also work without leading slashes
// this will be useful for things we need to do later
console.log(parseRouteString('some/route')); 
// $> List [ "some", "route" ]

console.log(parseRouteString('')); 
// $> List []


function parseQueryString(query: string): Params {
  let result = <Params>Map().asMutable();

  let parts = query.split("&").filter(notEmpty);

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

console.log(parseQueryString('')); 
// $> Map {}

console.log(parseQueryString('boolean_flag')); 
// $> Map { "boolean_flag": true }

console.log(parseQueryString('name=value')); 
// $> Map { "name": "value" }

console.log(parseQueryString('name=value&boolean_flag&name2=value2')); 
// $> Map { "name": "value", "boolean_flag": true, "name2": "value2" }

console.log(parseQueryString('boolean_flag1&name=value&boolean_flag2')); 
// $> Map { "boolean_flag1": true, "name": "value", "boolean_flag2": true }
```


Wunderbar.

Next up we need to think about how we're going to use a `Route` to select a 'handler' to render the DOM for us.
We could just use a flat dispatch table of type `Map<Route, Handler>` (Immutable allows `List`s to be used as map keys),
but at some point it might be nice to compose different dispatch structures together. So I'll opt for a recursive solution:

```typescript
type DispatchTree<Handler> = Map<string, Handler|any>;
```


Unfortunately TypeScript doesn't allow recursive type aliases,
otherwise that `any` at the end there would be `DispatchTree<Handler>`

Because we know our `Route`s will never have the empty string as one of their
constituent parts, we can use the empty string as the key for the handler at a
particular location in the nested map structure.

e.g. the `DispatchTree` containing routes `/a` `/a/b`, `/a/c`, and `/d` would look like the following:

```json
{
  "a": {
    "b": {"": "b handler"},
    "c": {"": "c handler"},
    "": "a handler"
  },
  "d": {"": "d handler"}
}
```

```typescript
function register<H>(tree: DispatchTree<H>, path: string, handler: H): DispatchTree<H> {
  const route = parseRouteString(path).push('');
  return tree.setIn(route, handler);
}

let tree = <DispatchTree<string>>Map();

console.log(tree); 
// $> Map {}

tree = register(tree, '/a', 'a handler');

console.log(tree); 
// $> Map { "a": Map { "": "a handler" } }

tree = register(tree, '/a/b', 'b handler');
tree = register(tree, '/a/c', 'c handler');
tree = register(tree, '/d', 'd handler');

console.log(JSON.stringify(tree, null, '  ')); 
// $> {
// $>   "a": {
// $>     "": "a handler",
// $>     "b": {
// $>       "": "b handler"
// $>     },
// $>     "c": {
// $>       "": "c handler"
// $>     }
// $>   },
// $>   "d": {
// $>     "": "d handler"
// $>   }
// $> }
```


If you've ever used modern routing libraries like [sinatra](http://www.sinatrarb.com/),
[compojure](https://github.com/weavejester/compojure), [klein](https://github.com/chriso/klein.php),
[jersey](https://jersey.java.net/documentation/latest/jaxrs-resources.html),
and about a million others, you're probably familiar with the notion of a *path parameter*.

Path params let one define parts of a path which are variable and assigned to a named parameter
for consumption by the matched handler.

e.g. a handler registered with the path `'resource/:id/stats'` will be matched
against the route `resource/51/stats`, and might render a page
which shows statistics about some kind of resource with id `51`.

```typescript
tree = register(tree, '/d/:id/e', 'e handler');

console.log(JSON.stringify(tree, null, '  ')); 
// $> {
// $>   "a": {
// $>     "": "a handler",
// $>     "b": {
// $>       "": "b handler"
// $>     },
// $>     "c": {
// $>       "": "c handler"
// $>     }
// $>   },
// $>   "d": {
// $>     "": "d handler",
// $>     ":id": {
// $>       "e": {
// $>         "": "e handler"
// $>       }
// $>     }
// $>   }
// $> }
```


So when we retrieve a handler, we also need to retrieve any matched path params.

```typescript
function lookup<H>(tree: DispatchTree<H>, params: Params, route: Route): [H, Params] {
  const part = route.first();
  const child = tree.get(part);

  if (child) {
    if (part === '') {
      // child is the matched handler
      return [child, params];
    } else {
      // child is nested dispatch tree
      return lookup<H>(child, params, route.shift());
    }
  } else {
    // child not found so look for path param
    let paramKeys = tree.keySeq()
                        .filter(k => k.indexOf(':') === 0)
                        .toArray();

    for (let k of paramKeys) {
      // extract the path param
      let paramsWithK = params.set(k.slice(1), route.first());
      // keep looking recursively to find a handler
      let result = lookup<H>(tree.get(k), paramsWithK, route.shift());
      // if a handler was found, we can just return it
      if (result !== null) {
        return result;
      }
    }
  }

  return null;
}

console.log(lookup(tree, <Params>Map(), List(['a', '']))); 
// $> [ 'a handler', Map {} ]

console.log(lookup(tree, <Params>Map({yo: true}), List(['a', '']))); 
// $> [ 'a handler', Map { "yo": true } ]

console.log(lookup(tree, <Params>Map(), List(['a', 'b', '']))); 
// $> [ 'b handler', Map {} ]

console.log(lookup(tree, <Params>Map(), List(['d', '52', 'e', '']))); 
// $> [ 'e handler', Map { "id": "52" } ]

console.log(lookup(tree, <Params>Map({yo: true}), List(['d', '123', 'e', '']))); 
// $> [ 'e handler', Map { "yo": true, "id": "123" } ]
```


Believe it or not, we now have all the functional building blocks we need.
All we're doing is turning a hash fragment and a dispatch tree into a 'handler' and a set of params.

Here's what that looks as one big block of imperative code:

```typescript
function hello (params) {
  let { name, caps } = params.toJS();
  name = caps ? name.toUpperCase() : name;
  return `Well hello there, ${name}.`;
}

{
  let hash = '#/hello/steve?caps';

  type DOM = string;
  type Handler = (ps: Params) => DOM;

  let tree = <DispatchTree<Handler>>Map();
  tree = register<Handler>(tree, '/hello/:name', hello);

  let [path, queryString] = splitHash(hash);
  let route = parseRouteString(path).push('');
  let qParams = parseQueryString(queryString);
  let [handler, params] = lookup<Handler>(tree, qParams, route);

  console.log(handler(params)); 
// $> Well hello there, STEVE.
}
```


## Part 2: Reactive Glue

This is essentially a slightly more verbose version of the imperative version
above.

```typescript
import { Derivable, Atom, atom, derive, unpack } from 'havelock';

type DOM = string;
type Handler = Derivable<DOM>;


// Here's the root state
const rootHash: Atom<string> = atom("#/hello/steve?caps");
const dispatchTree = atom(<DispatchTree<Handler>>Map());

// helper for destructuring derivable tuple
function raiseTuple<a, b>(tuple: Derivable<[a, b]>): [Derivable<a>, Derivable<b>] {
  return [tuple.derive(t => t[0]), tuple.derive(t => t[1])];
}

const [routeString, queryString] = raiseTuple<string, string>(rootHash.derive(splitHash));
const route = routeString.derive(parseRouteString)
                         .derive(r => r.push(''));
const qParams = queryString.derive(parseQueryString);
const lookupResult = dispatchTree.derive(lookup, qParams, route)
                                 .or([null, qParams]);

const [matchHandler, params] = raiseTuple<Handler, Params>(lookupResult);

// handler might be null, in which case do a 404 page

const handler = matchHandler.or(derive`404 route not found: ${routeString}`);

const dom = handler.derive(unpack);

dom.react(dom => console.log(`HELLO YES THIS IS DOM:\n  ${dom}`)); 
// $> HELLO YES THIS IS DOM:
// $>   404 route not found: /hello/steve

rootHash.set("#/hello/jessica?caps"); 
// $> HELLO YES THIS IS DOM:
// $>   404 route not found: /hello/jessica

dispatchTree.swap(register, 'hello/:name', params.derive(hello)); 
// $> HELLO YES THIS IS DOM:
// $>   Well hello there, JESSICA.

rootHash.set("#/hello/jessica"); 
// $> HELLO YES THIS IS DOM:
// $>   Well hello there, jessica.
```


The final bit of functionality we're going to add is the ability to contextualize
the dispatch tree. This will make it possible for different parts of your application to add
their own routes to the global dispatch tree without needing to know exactly where to put them.

[Lenses](http://ds300.github.io/havelock/#havelock-Lens) to the rescue!

```typescript
import { Lens } from 'havelock'

function context<H>(ctx: string): Lens<DispatchTree<H>, DispatchTree<H>> {
  const route = parseRouteString(ctx);
  return {
    get (dt: DispatchTree<H>): DispatchTree<H> {
      return dt.getIn(route) || <DispatchTree<H>>Map();
    },
    set (parent: DispatchTree<H>, me: DispatchTree<H>) {
      return parent.setIn(route, me);
    }
  };
}
```


That's literally it. Here's how you use it:

```typescript
const printRoutes: Atom<DispatchTree<Handler>> = dispatchTree.lens(context('/print'));

printRoutes.swap(register, "/params", params.derive(renderParams));

function renderParams(params: Params) {
  let result = "the params are:";
  for (let [key, val] of params.entrySeq().toArray()) {
    result += `\n  ${key}: ${val}`;
  }
  return result;
}

rootHash.set("#/print/params?a=b&c"); 
// $> HELLO YES THIS IS DOM:
// $>   the params are:
// $>   a: b
// $>   c: true


// you can still set a handler for the empty root.
printRoutes.swap(register, '/', "pick a thing to print yo");

rootHash.set("#/print"); 
// $> HELLO YES THIS IS DOM:
// $>   pick a thing to print yo

// let's try a contextual query param
printRoutes.swap(register, ':anything', params.derive(ps => ps.get("anything")));

rootHash.set("#/print/wub-a-lub-a-dub-dub"); 
// $> HELLO YES THIS IS DOM:
// $>   wub-a-lub-a-dub-dub
```


Also remember that `dom` won't just be re-printed when the rootHash
changes. Any derivable which a handler depends on feeds into the reactive
graph. e.g.

```typescript
const now = atom(+new Date());

function renderDate (date: number) {
  return new Date(date).toDateString();
}

printRoutes.swap(register, 'now', now.derive(renderDate));

rootHash.set("#/print/now"); 
// $> HELLO YES THIS IS DOM:
// $>   Tue Aug 25 2015

// forward a day
now.swap(time => time + (1000 * 60 * 60 * 24)); 
// $> HELLO YES THIS IS DOM:
// $>   Wed Aug 26 2015

now.swap(time => time + (1000 * 60 * 60 * 24)); 
// $> HELLO YES THIS IS DOM:
// $>   Thu Aug 27 2015
```
