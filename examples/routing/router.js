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
        return immutable_1.Map();
    }
});
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
var havelock_2 = require('havelock');
var join = function (x, y) { return x.join(y); };
hash.set("#/home");
var dispatchTable = havelock_1.atom(immutable_1.Map());
var fourOhFour = (_a = ["404 route not found: /", ""], _a.raw = ["404 route not found: /", ""], havelock_2.derive(_a, route.derive(join, "/")));
var chosenHandler = dispatchTable.derive(function (dt) {
    return dt.get(route.get());
}).or(fourOhFour);
var reaction = chosenHandler.react(function (dom) { return console.log(havelock_2.unpack(dom)); });
dispatchTable.swap(function (dt) { return dt.set(immutable_1.List(["home"]), "Hello World!"); });
dispatchTable.swap(function (dt) { return dt.set(immutable_1.List(["print-params"]), queryParams.derive(printParams)); });
function printParams(params) {
    var result = "the params are:";
    for (var _i = 0, _a = params.entrySeq().toArray(); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], val = _b[1];
        result += "\n  " + key + ": " + val;
    }
    return result;
}
hash.set("#/print-params?today=thursday&tomorrow=friday&almost=party_time");
function register(dt, path, handler) {
    return registerRoute(dt, path2route(path), handler);
}
function registerRoute(dt, route, handler) {
    if (route.size === 0) {
        return dt.set("", handler);
    }
    else {
        var ctx = route.first();
        var child = dt.get(ctx) || immutable_1.Map();
        return dt.set(ctx, registerRoute(child, route.shift(), handler));
    }
}
function context(ctx) {
    return {
        get: function (dt) {
            var child = dt.get(ctx);
            if (!child) {
                return immutable_1.Map();
            }
            else if (child instanceof immutable_1.Map) {
                return child;
            }
            else {
                return immutable_1.Map().set("", child);
            }
        },
        set: function (parent, me) {
            return parent.set(ctx, me);
        }
    };
}
var dispatchTree = havelock_1.atom(immutable_1.Map());
dispatchTree.swap(register, "/", "Hello Again, World!");
function lookup(dt, route) {
    if (route.size === 0) {
        if (dt instanceof immutable_1.Map) {
            return dt.get("");
        }
        else {
            return dt;
        }
    }
    else {
        var child = dt.get(route.first());
        if (child) {
            return lookup(child, route.shift());
        }
        else {
            return null;
        }
    }
}
chosenHandler = dispatchTree.derive(lookup, route).or(fourOhFour);
reaction.stop();
reaction = chosenHandler.react(function (dom) { return console.log(havelock_2.unpack(dom)); });
hash.set("");
dispatchTree.lens(context("params"))
    .swap(register, "print", queryParams.derive(printParams));
hash.set("#/params/print?yes");
dispatchTree.swap(register, "params", "you are at '/params'");
hash.set("#/params");
hash.set("#/params/print?yes");
dispatchTree.lens(context("params"))
    .swap(register, "", "you are back at '/params'");
hash.set("#/params");
hash.set("#/params/");
hash.set("#/params/print?yes");
var _a;
