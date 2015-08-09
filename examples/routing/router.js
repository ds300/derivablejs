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
var route = hash.derive(function (hash) {
    switch (hash) {
        case "":
        case "#":
        case "#/":
            return immutable_1.List();
        default:
            var queryIdx = hash.indexOf("?");
            if (queryIdx >= 0) {
                hash = hash.slice(2, queryIdx);
            }
            else {
                hash = hash.slice(2);
            }
            return path2route(hash);
    }
});
var queryParams = hash.derive(function (hash) {
    var queryIdx = hash.indexOf("?");
    if (queryIdx >= 0) {
        var result = immutable_1.Map().asMutable();
        var parts = hash.slice(queryIdx + 1).split(/&/);
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
    else {
        return null;
    }
}).or(immutable_1.Map());
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
dispatchTree.swap(register, '/print-params', queryParams.derive(printParams));
function printParams(params) {
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
printRoutes.swap(register, "/params", queryParams.derive(printParams));
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
    return lookupWithParams(dt, route.push(""), immutable_1.Map()) || [null, null];
};
var inlineParams;
{
    var lookupResult = dispatchTree.derive(lookup, route);
    inlineParams = lookupResult.derive(function (_a) {
        var _ = _a[0], ps = _a[1];
        return ps;
    }).or(immutable_1.Map());
    chosenHandler = lookupResult.derive(function (_a) {
        var h = _a[0], _ = _a[1];
        return h;
    }).or(fourOhFour);
}
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
