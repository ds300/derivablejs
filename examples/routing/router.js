/// <reference path="./node_modules/havelock/dist/havelock.d.ts"/>
/// <reference path="./node_modules/immutable/dist/immutable.d.ts"/>
/***

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

- Routes: `'#/some/route'`, `'#/'`, `'#'`, `''`, `'#/another/longer/route'`
- Routes + Query Params: `'#/some/route/with?a=param'`, `'#/?name=value&boolean_flag'`

It seems like we want to split the hash fragment into two parts: the route part and the query part. These are cleverly separated by a question mark.

At the same time we can get rid of the `#` character if present because it doesn't mean anything at this stage.

***/
function splitHash(hash) {
    var queryIdx = hash.indexOf("?");
    if (queryIdx < 0) {
        return [hash.slice(1), ""];
    }
    else {
        return [hash.slice(1, queryIdx), hash.slice(queryIdx + 1)];
    }
}
console.log(splitHash('#/some/route/with?a=param')); //$
// $> [ '/some/route/with', 'a=param' ]
console.log(splitHash('#/some/route')); //$
// $> [ '/some/route', '' ]
console.log(splitHash('#/?question=why?&answer=because!')); //$
// $> [ '/', 'question=why?&answer=because!' ]
console.log(splitHash('#/'), splitHash('#'), splitHash('')); //$
// $> [ '/', '' ] [ '', '' ] [ '', '' ]
/***

The next step is to parse the route and query parts into more useful forms.

To do this I'm going to use the `List` and `Map` classes from facebook's [immutable](https://facebook.github.io/immutable-js/) library.

***/
var immutable_1 = require('immutable');
var notEmpty = function (x) { return x !== ''; };
function parseRouteString(route) {
    return immutable_1.List(route.split('/').filter(notEmpty));
}
console.log(parseRouteString('/')); //$
// $> List []
console.log(parseRouteString('')); //$
// $> List []
console.log(parseRouteString('/some/route')); //$
// $> List [ "some", "route" ]
// ignores multiple consecutive slashes
console.log(parseRouteString('/a/very//long/route////indeed///')); //$
// $> List [ "a", "very", "long", "route", "indeed" ]
// it should also work without leading slashes
// this will be useful for things we need to do later
console.log(parseRouteString('some/route')); //$
// $> List [ "some", "route" ]
function parseQueryString(query) {
    var result = immutable_1.Map().asMutable();
    var parts = query.split("&").filter(notEmpty);
    for (var _i = 0; _i < parts.length; _i++) {
        var part = parts[_i];
        var equalsIdx = part.indexOf("=");
        if (equalsIdx >= 0) {
            result.set(part.slice(0, equalsIdx), part.slice(equalsIdx + 1));
        }
        else {
            result.set(part, true);
        }
    }
    return result.asImmutable();
}
console.log(parseQueryString('')); //$
// $> Map {}
console.log(parseQueryString('boolean_flag')); //$
// $> Map { "boolean_flag": true }
console.log(parseQueryString('name=value')); //$
// $> Map { "name": "value" }
console.log(parseQueryString('name=value&boolean_flag&name2=value2')); //$
// $> Map { "name": "value", "boolean_flag": true, "name2": "value2" }
console.log(parseQueryString('boolean_flag1&name=value&boolean_flag2')); //$
immutable_1.Map();
/***

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

***/
function register(tree, path, handler) {
    var route = parseRouteString(path).push('');
    return tree.setIn(route, handler);
}
var tree = immutable_1.Map();
console.log(tree); //$
// $> Map {}
tree = register(tree, '/a', 'a handler');
console.log(tree); //$
// $> Map { "a": Map { "": "a handler" } }
tree = register(tree, '/a/b', 'b handler');
tree = register(tree, '/a/c', 'c handler');
tree = register(tree, '/d', 'd handler');
console.log(JSON.stringify(tree, null, '  ')); //$
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
/***

If you've ever used modern routing libraries like [sinatra](http://www.sinatrarb.com/),
[compojure](https://github.com/weavejester/compojure), [klein](https://github.com/chriso/klein.php),
[jersey](https://jersey.java.net/documentation/latest/jaxrs-resources.html),
and about a million others, you're probably familiar with the notion of a *path parameter*.

Path params let one define parts of a path which are variable and assigned to a named parameter
for consumption by the matched handler.

e.g. a handler registered with the path `'resource/:id/stats'` will be matched
against the route `resource/51/stats`, and might render a page
which shows statistics about some kind of resource with id `51`.

***/
tree = register(tree, '/d/:id/e', 'e handler');
console.log(JSON.stringify(tree, null, '  ')); //$
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
/***

So when we retrieve a handler, we also need to retrieve any matched path params.

***/
function lookup(tree, params, route) {
    var part = route.first();
    var child = tree.get(part);
    if (child) {
        if (part === '') {
            // child is the matched handler
            return [child, params];
        }
        else {
            // child is nested dispatch tree
            return lookup(child, params, route.shift());
        }
    }
    else {
        // child not found so look for path param
        var paramKeys = tree.keySeq()
            .filter(function (k) { return k.indexOf(':') === 0; })
            .toArray();
        for (var _i = 0; _i < paramKeys.length; _i++) {
            var k = paramKeys[_i];
            // extract the path param
            var paramsWithK = params.set(k.slice(1), route.first());
            // keep looking recursively to find a handler
            var result = lookup(tree.get(k), paramsWithK, route.shift());
            // if a handler was found, we can just return it
            if (result !== null) {
                return result;
            }
        }
    }
    return null;
}
console.log(lookup(tree, immutable_1.Map(), immutable_1.List(['a', '']))); //$
// $> [ 'a handler', Map {} ]
console.log(lookup(tree, immutable_1.Map({ yo: true }), immutable_1.List(['a', '']))); //$
// $> [ 'a handler', Map { "yo": true } ]
console.log(lookup(tree, immutable_1.Map(), immutable_1.List(['a', 'b', '']))); //$
// $> [ 'b handler', Map {} ]
console.log(lookup(tree, immutable_1.Map(), immutable_1.List(['d', '52', 'e', '']))); //$
// $> [ 'e handler', Map { "id": "52" } ]
console.log(lookup(tree, immutable_1.Map({ yo: true }), immutable_1.List(['d', '123', 'e', '']))); //$
// $> [ 'e handler', Map { "yo": true, "id": "123" } ]
/***

Believe it or not, we now have all the functional building blocks we need.
All we're doing is turning a hash fragment and a dispatch tree into a 'handler' and a set of params.

Here's what that looks like as one big function:

***/
function getHandler(tree, hash) {
    var _a = splitHash(hash), path = _a[0], queryString = _a[1];
    var route = parseRouteString(path).push('');
    var queryParams = parseQueryString(queryString);
    return lookup(tree, queryParams, route) || [null, queryParams];
}
console.log(getHandler(tree, '#/d/123/e?yo')); //$
// $> [ 'e handler', Map { "yo": true, "id": "123" } ]
console.log(getHandler(tree, '#/blahblahblah?404=yes')); //$
// $> [ null, Map { "404": "yes" } ]
/***

## Part 2: Reactive Glue

This is where the magic happens.

The reactivity all stems from the global state, which in this case is our dispatch tree and hash fragment.


***/
var havelock_1 = require('havelock');
var hash = havelock_1.atom("#/some/route"), dispatchTree = havelock_1.atom(immutable_1.Map());
var lookupResult = dispatchTree.derive(getHandler, hash);
// handler might be null, in which case do a 404 page
var handler = lookupResult.derive(function (r) { return r[0]; })
    .or((_a = ["404 not found: ", ""], _a.raw = ["404 not found: ", ""], havelock_1.derive(_a, hash))), params = lookupResult.derive(function (r) { return r[1]; });
/***

So now we can derive the dom from the handler by simply upacking it.

***/
var dom = handler.derive(havelock_1.unpack);
/***

Notice that it has the same type as an actual handler. That's because it is.
All this faffing has been about creating a kind of super-handler whose behaviour
depends on the state of a hash fragment and dispatch table.

All that's left is to dynamically render the dom.

***/
dom.react(function (dom) { return console.log("HELLO YES THIS IS DOM:\n  " + dom); }); //$
// $> HELLO YES THIS IS DOM:
// $>   404 not found: #/some/route
hash.set("#/greeting/jessica"); //$
// $> HELLO YES THIS IS DOM:
// $>   404 not found: #/greeting/jessica
var hello = params.derive(function (params) {
    var _a = params.toJS(), name = _a.name, caps = _a.caps;
    if (caps)
        name = name.toUpperCase();
    return "Well hello there " + name + "!";
});
var now = havelock_1.atom(+new Date());
var today = (_b = ["Today is ", ""], _b.raw = ["Today is ", ""], havelock_1.derive(_b, now.derive(renderDate)));
function renderDate(date) {
    return new Date(date).toDateString();
}
var greeting = (_c = ["", "\n  ", ""], _c.raw = ["", "\\n  ", ""], havelock_1.derive(_c, hello, today));
dispatchTree.swap(register, 'greeting/:name', greeting); //$
// $> HELLO YES THIS IS DOM:
// $>   Well hello there jessica!
// $>   Today is Wed Aug 26 2015
hash.set("#/greeting/steve"); //$
// $> HELLO YES THIS IS DOM:
// $>   Well hello there steve!
// $>   Today is Wed Aug 26 2015
// forward a day
now.swap(function (time) { return time + (1000 * 60 * 60 * 24); }); //$
// $> HELLO YES THIS IS DOM:
// $>   Well hello there steve!
// $>   Today is Thu Aug 27 2015
// and a year
now.swap(function (time) { return time + (1000 * 60 * 60 * 24 * 365); }); //$
// $> HELLO YES THIS IS DOM:
// $>   Well hello there steve!
// $>   Today is Fri Aug 26 2016
hash.set("#/greeting/steve?caps"); //$
function context(ctx) {
    var route = parseRouteString(ctx);
    return {
        get: function (dt) {
            return dt.getIn(route) || immutable_1.Map();
        },
        set: function (parent, me) {
            return parent.setIn(route, me);
        }
    };
}
/***

That's literally it. Here's how you use it:

***/
var printRoutes = dispatchTree.lens(context('/print'));
printRoutes.swap(register, "/hello", hello);
hash.set("#/print/hello?name=Bridget"); //$
// $> HELLO YES THIS IS DOM:
// $>   Well hello there Bridget!
printRoutes.swap(register, "/today", today);
hash.set("#/print/today"); //$
// $> HELLO YES THIS IS DOM:
// $>   Today is Fri Aug 26 2016
// you can still set a handler for the empty root.
printRoutes.swap(register, '/', "pick a thing to print yo");
hash.set("#/print"); //$
// $> HELLO YES THIS IS DOM:
// $>   pick a thing to print yo
// let's try a contextual query param
printRoutes.swap(register, ':echo', params.derive(function (ps) { return ps.get("echo"); }));
hash.set("#/print/wub-a-lub-a-dub-dub"); //$
// $> HELLO YES THIS IS DOM:
// $>   wub-a-lub-a-dub-dub
// it shouldn't override existing routes
hash.set("#/print"); //$
// $> HELLO YES THIS IS DOM:
// $>   pick a thing to print yo
hash.set("#/print/today"); //$
// $> HELLO YES THIS IS DOM:
// $>   Today is Fri Aug 26 2016
hash.set("#/print/hello?name=Morty"); //$
var _a, _b, _c;
// $> HELLO YES THIS IS DOM:
// $>   Well hello there Morty!
