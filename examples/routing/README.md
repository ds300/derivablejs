

# Router

This file will walk you through the implemetation of a simple but powerful
routing system with DerivableJS. It is structured in two parts:

1. Data and Functions
2. Reactive Glue

The first section doesn't involve using Derivables at all, but rather shows how to
go about designing all the individual components of a routing system from a functional perspective.
It is written for anyone with JS experience, but if you've done any functional programming with immutable data before it should be *really* easy to follow.

Part 2 shows how to take the inert functional system designed in Part 1, and turn it into a living breathing thing using Derivables.

## Part 1: Data and Functions

The top-level piece of data is the hash fragment at the end of a url. e.g. the url `https://ds300.github.com/#this-is-a-hash-fragment` has a hash fragment `'#this-is-a-hash-fragment'`, and the url `https://ds300.github.com/` has a hash fragment `''`.

We are essentially building a function which transforms a hash fragment into a DOM tree.

To begin, let's examine the types of hash fragments we will be looking at:

- Routes: `'#/some/route'`, `'#/'`, `'#'`, `''`, `'#/another/longer/route'`
- Routes + Query Params: `'#/some/route/with?a=param'`, `'#/?name=value&boolean_flag'`

It seems like we want to split the hash fragment into two parts: the route part and the query part. These are cleverly separated by a question mark.

At the same time we can get rid of the `#` character if present because it doesn't mean anything at this stage.

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

console.log(splitHash('#/'), splitHash('#'), splitHash('')); 
// $> [ '/', '' ] [ '', '' ] [ '', '' ]
```


The next step is to parse the route and query parts into more useful forms.

To do this I'm going to use the `List` and `Map` classes from facebook's [immutable](https://facebook.github.io/immutable-js/) library.

```typescript
import { List, Map } from 'immutable';

type Route = List<string>;
type Params = Map<string, string | boolean>;

const notEmpty = x => x !== '';

function parseRouteString (route: string): Route {
  return List(route.split('/').filter(notEmpty));
}

console.log(parseRouteString('/')); 
// $> List []

console.log(parseRouteString('')); 
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

Here's what that looks like as one big function:

```typescript
function getHandler<H>(tree: DispatchTree<H>, hash: string): [H, Params] {
  const [path, queryString] = splitHash(hash);
  const route = parseRouteString(path).push('');
  const queryParams = parseQueryString(queryString);
  return lookup<H>(tree, queryParams, route) || [null, queryParams];
}

console.log(getHandler(tree, '#/d/123/e?yo')); 
// $> [ 'e handler', Map { "yo": true, "id": "123" } ]

console.log(getHandler(tree, '#/blahblahblah?404=yes')); 
// $> [ null, Map { "404": "yes" } ]
```


## Part 2: Reactive Glue

This is where the magic happens.

The reactivity all stems from the global state, which in this case is our dispatch tree and hash fragment.

```typescript
import { Atom, atom } from 'derivable';

const hash:         Atom<string>                = atom("#/some/route"),
      dispatchTree: Atom<DispatchTree<Handler>> = atom(<DispatchTree<Handler>>Map());
```


But what is a `Handler` you ask? Well in most systems it is some kind of function
which transforms a request into a response. But Derivables are all about reactivity and
ordinary functions are not reactive on their own. Another problem is that you need to know *how* to call a function,
and that restricts handlers to having a particular signature or being managed by dependency injection.

And what if a handler function's *other* dependencies change state and the DOM needs to be
re-rendered? Do the dependencies tell us via some event framework set up alongside the injector? Or do we let the handlers manually trigger dom updates?

No way, forget that mess! If we make `Handler` a `Derivable<DOM>` it all goes away. They can then depend on whatever they like and we don't need to know or care, and the dom gets re-rendered whenever their dependencies change.

```typescript
import { Derivable, derive } from 'derivable';

type DOM = string;
type Handler = Derivable<DOM>;

const lookupResult: Derivable<[Handler, Params]>
                  = dispatchTree.derive<[Handler, Params]>(getHandler, hash);

// handler might be null, in which case do a 404 page
const handler: Derivable<Handler> = lookupResult.derive(r => r[0])
                                                .or(derive`404 not found: ${hash}`),
      params:  Derivable<Params>  = lookupResult.derive(r => r[1]);
```


So now we can derive the dom from the handler by simply upacking it.

```typescript
import { unpack } from 'derivable';

const dom: Derivable<DOM> = handler.derive(unpack);
```


Notice that it has the same type as an actual handler. That's because it is.
All this faffing has been about creating a kind of super-handler whose behaviour
depends on the state of a hash fragment and dispatch table.

All that's left is to dynamically render the dom.

```typescript
dom.react(dom => console.log(`HELLO YES THIS IS DOM:\n  ${dom}`)); 
// $> HELLO YES THIS IS DOM:
// $>   404 not found: #/some/route

hash.set("#/greeting/jessica"); 
// $> HELLO YES THIS IS DOM:
// $>   404 not found: #/greeting/jessica

const hello = params.derive(params => {
  let {name, caps} = params.toJS();
  if (caps) name = name.toUpperCase();

  return`Well hello there ${name}!`;
});

const now = atom(+new Date());

const today = derive`Today is ${now.derive(renderDate)}`;

function renderDate (date: number) {
  return new Date(date).toDateString();
}

const greeting = derive`${hello}\n  ${today}`;

dispatchTree.swap(register, 'greeting/:name', greeting); 
// $> HELLO YES THIS IS DOM:
// $>   Well hello there jessica!
// $>   Today is Sat Oct 31 2015

hash.set("#/greeting/steve"); 
// $> HELLO YES THIS IS DOM:
// $>   Well hello there steve!
// $>   Today is Sat Oct 31 2015

// forward a day
now.swap(time => time + (1000 * 60 * 60 * 24)); 
// $> HELLO YES THIS IS DOM:
// $>   Well hello there steve!
// $>   Today is Sun Nov 01 2015

// and a year
now.swap(time => time + (1000 * 60 * 60 * 24 * 365)); 
// $> HELLO YES THIS IS DOM:
// $>   Well hello there steve!
// $>   Today is Mon Oct 31 2016


hash.set("#/greeting/steve?caps"); 
// $> HELLO YES THIS IS DOM:
// $>   Well hello there STEVE!
// $>   Today is Mon Oct 31 2016
```


The final bit of functionality we're going to add is the ability to contextualize
the dispatch tree. This will make it possible for different parts of your application to add
their own routes to the global dispatch tree without needing to know exactly where to put them.

[Lenses](http://ds300.github.io/derivablejs/#derivable-Lens) to the rescue!

```typescript
import { Lens } from 'derivable'

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

printRoutes.swap(register, "/hello", hello);
hash.set("#/print/hello?name=Bridget"); 
// $> HELLO YES THIS IS DOM:
// $>   Well hello there Bridget!

printRoutes.swap(register, "/today", today);
hash.set("#/print/today"); 
// $> HELLO YES THIS IS DOM:
// $>   Today is Mon Oct 31 2016

// you can still set a handler for the empty root.
printRoutes.swap(register, '/', "pick a thing to print yo");

hash.set("#/print"); 
// $> HELLO YES THIS IS DOM:
// $>   pick a thing to print yo

// let's try a contextual query param
printRoutes.swap(register, ':echo', params.derive(ps => ps.get("echo")));

hash.set("#/print/wub-a-lub-a-dub-dub"); 
// $> HELLO YES THIS IS DOM:
// $>   wub-a-lub-a-dub-dub

// it shouldn't override existing routes
hash.set("#/print"); 
// $> HELLO YES THIS IS DOM:
// $>   pick a thing to print yo
hash.set("#/print/today"); 
// $> HELLO YES THIS IS DOM:
// $>   Today is Mon Oct 31 2016
hash.set("#/print/hello?name=Morty"); 
// $> HELLO YES THIS IS DOM:
// $>   Well hello there Morty!
```
