/// <reference path="./node_modules/havelock/dist/havelock.d.ts"/>
/// <reference path="./node_modules/immutable/dist/immutable.d.ts"/>
/***

# Router

This file will walk you through the implemetation of a simple but powerful
routing system.

## Routing

Everything descends from a raw hash string.

***/
var havelock_1 = require('havelock');
// this is what we'd use in a browser
function makeRoot() {
    var hash = havelock_1.atom(window.location.hash);
    window.addEventListener('hashchange', function () { return hash.set(window.location.hash); });
    return hash;
}
// but this isn't running in a browser so we'll do this:
var hash = havelock_1.atom("");
/***

Let's convert the hash into a route. Actually, the hash might have params
at the end so let's convert the hash into a route and a parameter map

***/
var immutable_1 = require('immutable');
// e.g. '#/some/path?query=something' becomes ['/some/path', 'query=something']
function splitHash(hash) {
    var queryIdx = hash.indexOf("?");
    if (queryIdx < 0) {
        return [hash.slice(1), ""];
    }
    else {
        return [hash.slice(1, queryIdx), hash.slice(queryIdx + 1)];
    }
}
// e.g. 'some/path' or '/some/path' or '/some/path/'
//       becomes List ['some', 'path']
function path2route(path) {
    return immutable_1.List(path.split("/").filter(function (x) { return x !== ""; }));
}
// e.g. 'query=something&anotherThing'
//       becomes Map {query: 'something', anotherThing: true}
function parseQueryString(query) {
    var result = immutable_1.Map().asMutable();
    var parts = query.split("&").filter(function (x) { return x != ''; });
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
function raiseTuple(tuple) {
    return [tuple.derive(function (t) { return t[0]; }), tuple.derive(function (t) { return t[1]; })];
}
var _a = raiseTuple(hash.derive(splitHash)), path = _a[0], queryString = _a[1];
var route = path.derive(path2route);
var queryParams = queryString.derive(parseQueryString);
/***

Ok, lets see if that all works:

***/
console.log(route.get()); //$
// $> List []
console.log(queryParams.get()); //$
// $> Map {}
hash.set("#/route");
console.log(route.get()); //$
// $> List [ "route" ]
console.log(queryParams.get()); //$
// $> Map {}
hash.set("#/some/route");
console.log(route.get()); //$
// $> List [ "some", "route" ]
hash.set("#/some/route/with?a=param");
console.log(route.get()); //$
// $> List [ "some", "route", "with" ]
console.log(queryParams.get()); //$
// $> Map { "a": "param" }
hash.set("#/some/route/with?a=param&more=params&others&evenmore");
console.log(route.get()); //$
// $> List [ "some", "route", "with" ]
console.log(queryParams.get()); //$
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
var havelock_2 = require('havelock');
// unfortunately Typescript doesn't allow recursive type aliases, otherwise that
// `any` at the end there would be `DispatchTree`
var dispatchTree = havelock_1.atom(immutable_1.Map());
function register(dt, path, handler) {
    return dt.setIn(path2route(path).push(""), handler);
}
function lookup(dt, route) {
    return dt.getIn(route.push(""));
}
/***

So, e.g. the `DispatchTree` containing routes `/a` `/a/b`, `/a/c`, and `/d` would look like the following:

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

Now we need to use `lookup` to derive the handler based on the contents of
`dispatchTree`. We can then unpack that handler to create the view.

***/
// 404 handler in case we request an invalid route
var fourOhFour = route.derive(function (route) {
    return '404 route not found: /' + route.join("/");
});
var chosenHandler = dispatchTree.derive(lookup, route)
    .or(fourOhFour);
var renderDom = function (dom) { return console.log("DOM: " + dom); };
var reaction = chosenHandler.derive(havelock_2.unpack).react(renderDom); //$
// $> DOM: 404 route not found: /home
dispatchTree.swap(register, '/home', "Hello There World!"); //$
// $> DOM: Hello There World!
dispatchTree.swap(register, '/print-params', queryParams.derive(renderParams));
function renderParams(params) {
    var result = "the params are:";
    for (var _i = 0, _a = params.entrySeq().toArray(); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], val = _b[1];
        result += "\n  " + key + ": " + val;
    }
    return result;
}
hash.set("#/print-params?today=thursday&tomorrow=friday&almost=party_time"); //$
function context(ctx) {
    var route = path2route(ctx);
    return {
        get: function (dt) {
            return dt.getIn(route) || immutable_1.Map();
        },
        set: function (parent, me) {
            return parent.setIn(route, me);
        }
    };
}
var printRoutes = dispatchTree.lens(context('/print'));
printRoutes.swap(register, "/params", queryParams.derive(renderParams));
hash.set("#/print/params?a=b&c"); //$
// $> DOM: the params are:
// $>   a: b
// $>   c: true
printRoutes.swap(register, "/hello", queryParams.derive(function (ps) {
    return "Hello, " + ps.get('name') + "!";
}));
hash.set("#/print/hello?name=Sadie"); //$
// $> DOM: Hello, Sadie!
printRoutes.swap(register, '/', "pick a thing to print yo");
hash.set("#/print"); //$
// $> DOM: pick a thing to print yo
/***

Splendid. The last feature I want to support is inline path parameters, e.g. one should be
able to specify a path like `/resource/:id/home`, for which a hash like
`#/resource/32/home` might render the home page of the resource with id `32`.

I don't think I'll need to change the register function for this, but the lookup
function will definitely need to be expanded in order to accumulate the parameters
and put them somewhere.

***/
function lookupWithParams(dt, route, params) {
    if (route.size === 0) {
        return [dt, params];
    }
    else {
        var child = dt.get(route.first());
        if (child) {
            return lookupWithParams(child, route.shift(), params);
        }
        else {
            // look for param routes
            var paramKeys = dt.keySeq().filter(function (k) { return k.indexOf(':') === 0; }).toArray();
            for (var _i = 0; _i < paramKeys.length; _i++) {
                var k = paramKeys[_i];
                var result = lookupWithParams(dt.get(k), route.shift(), params.set(k.slice(1), route.first()));
                if (result) {
                    return result;
                }
            }
        }
    }
    return null;
}
function lookup2(dt, route) {
    return lookupWithParams(dt, route.push(""), immutable_1.Map()) || [null, immutable_1.Map()];
}
;
var _b = raiseTuple(dispatchTree.derive(lookup2, route)), lookupResult = _b[0], inlineParams = _b[1];
chosenHandler = lookupResult.or(fourOhFour);
// now merge query params and inline params
var merge = function (x, y) { return x.merge(y); };
var params = queryParams.derive(merge, inlineParams);
// re-bind reaction to use new `chosenHandler`
reaction.stop();
reaction = chosenHandler.derive(havelock_2.unpack).react(renderDom);
; //$
// $> DOM: pick a thing to print yo
dispatchTree.swap(register, "resource/:id/home", params.derive(function (params) {
    var _a = params.toJS(), id = _a.id, fruit = _a.fruit;
    var result = "This is the home of the resource with id " + id;
    if (fruit) {
        result += "\nToday the fruit is " + fruit;
    }
    return result;
}));
hash.set("#/resource/343/home"); //$
// $> DOM: This is the home of the resource with id 343
hash.set("#/resource/whatever/home?fruit=banana"); //$
// $> DOM: This is the home of the resource with id whatever
// $> Today the fruit is banana
printRoutes.swap(register, "/:echo", params.derive(function (ps) {
    return ps.get('echo');
}));
// /print /print/params and /print/hello should still be there
hash.set("#/print"); //$
// $> DOM: pick a thing to print yo
hash.set("#/print/params?buns=5"); //$
// $> DOM: the params are:
// $>   buns: 5
hash.set("#/print/hello?name=Morty"); //$
// $> DOM: Hello, Morty!
// the :echo parameter should pick up anything else
hash.set("#/print/wub-a-lub-a-dub-dub"); //$
// $> DOM: wub-a-lub-a-dub-dub
/***

I don't know about you, but that's everything I ever wanted in a router right there.

***/
