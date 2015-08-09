/// <reference path="./node_modules/havelock/dist/havelock.d.ts"/>
/// <reference path="./node_modules/immutable/dist/immutable.d.ts"/>
var havelock_1 = require('havelock');
function makeRoot() {
    var hash = havelock_1.atom(window.location.hash);
    window.addEventListener('hashchange', function () { return hash.set(window.location.hash); });
    return hash;
}
var hash = havelock_1.atom("");
var immutable_1 = require('immutable');
function path2route(path) {
    return immutable_1.List(path.split("/").filter(function (x) { return x !== ""; }));
}
function splitHash(hash) {
    var queryIdx = hash.indexOf("?");
    if (queryIdx < 0) {
        return [hash.slice(1), ""];
    }
    else {
        return [hash.slice(1, queryIdx), hash.slice(queryIdx + 1)];
    }
}
function parseQueryString(query) {
    var result = immutable_1.Map().asMutable();
    var parts = query.split("&");
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
console.log(route.get());
console.log(queryParams.get());
hash.set("#/route");
console.log(route.get());
hash.set("#/some/route");
console.log(route.get());
hash.set("#/some/route/with?a=param");
console.log(route.get());
console.log(queryParams.get());
hash.set("#/some/route/with?a=param&more=params&others&evenmore");
console.log(route.get());
console.log(queryParams.get());
hash.set("#/home");
var havelock_2 = require('havelock');
var dispatchTree = havelock_1.atom(immutable_1.Map());
function register(dt, path, handler) {
    return dt.setIn(path2route(path).push(""), handler);
}
var lookup = function (dt, route) {
    return dt.getIn(route.push(""));
};
var fourOhFour = route.derive(function (route) {
    return "404 route not found: /" + route.join("/");
});
var chosenHandler = dispatchTree.derive(lookup, route)
    .or(fourOhFour);
var reaction = chosenHandler.derive(havelock_2.unpack)
    .react(function (dom) { return console.log(dom); });
dispatchTree.swap(register, '/home', "Hello World!");
dispatchTree.swap(register, '/print-params', queryParams.derive(renderParams));
function renderParams(params) {
    var result = "the params are:";
    for (var _i = 0, _a = params.entrySeq().toArray(); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], val = _b[1];
        result += "\n  " + key + ": " + val;
    }
    return result;
}
hash.set("#/print-params?today=thursday&tomorrow=friday&almost=party_time");
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
hash.set("#/print/params?a=b&c");
printRoutes.swap(register, "/hello", queryParams.derive(function (ps) {
    return "Hello, " + ps.get('name') + "!";
}));
hash.set("#/print/hello?name=Sadie");
printRoutes.swap(register, '/', "You need to pick a thing to print, dawg");
hash.set("#/print");
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
lookup = function (dt, route) {
    return lookupWithParams(dt, route.push(""), immutable_1.Map()) || [null, immutable_1.Map()];
};
var _b = raiseTuple(dispatchTree.derive(lookup, route)), lookupResult = _b[0], inlineParams = _b[1];
chosenHandler = lookupResult.or(fourOhFour);
var merge = function (x, y) { return x.merge(y); };
var params = queryParams.derive(merge, inlineParams);
reaction.stop();
reaction = chosenHandler.derive(havelock_2.unpack).react(function (dom) { return console.log(dom); });
;
dispatchTree.swap(register, "resource/:id/home", params.derive(function (params) {
    var _a = params.toJS(), id = _a.id, fruit = _a.fruit;
    var result = "This is the home of the resource with id " + id;
    if (fruit) {
        result += "\nToday the fruit is " + fruit;
    }
    return result;
}));
hash.set("#/resource/343/home");
hash.set("#/resource/wub-a-lub-a-dub-dub/home?fruit=banana");
printRoutes.swap(register, "/:echo", params.derive(function (ps) {
    return ps.get('echo');
}));
hash.set("#/print/params?buns=5");
hash.set("#/print/whatevs");
