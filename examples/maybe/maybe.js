/// <reference path="./node_modules/havelock/dist/havelock.d.ts"/>
/***

Sometimes as you're threading values through a processing pipeline it can be
convenient to have a way to say 'if this computation fails, then none of the
others should even be attempted. Just propogate the failure.'

Here's one way to do that.

***/
var havelock_1 = require('havelock');
var char = havelock_1.atom("a");
var c = char.derive(function (char) { return char.toUpperCase(); });
var name = c.derive(function (c) { return ({ "A": "Adam", "B": "Bertie" })[c]; });
console.log(name.get()); //$
// $> Adam
char.set(null);
try {
    name.get();
}
catch (e) {
    console.log(e); //$
}
/***

To avoid this we can wrap the uppercasing function in another function which
checks for null values and propagtes them install of calling the
function on them.

***/
function maybe(f) {
    return function (x) {
        if (x == null) {
            return null;
        }
        else {
            return f(x);
        }
    };
}
c = char.derive(maybe(function (char) { return char.toUpperCase; }));
name = c.derive(maybe(function (c) { return ({ "A": "Adam", "B": "Bertie" })[c]; }));
console.log(name.get()); //$
// $> null
/***

That'd definitely better than throwing an error.

But sometimes a derivation function might throw errors even with non-null inputs.
You could propagate the error using a similar technique:

***/
function maybeE(f) {
    return function (x) {
        if (x instanceof Error) {
            return x;
        }
        else {
            try {
                return f(x);
            }
            catch (e) {
                return e;
            }
        }
    };
}
c = char.derive(maybeE(function (c) { return c.toUpperCase(); }));
name = c.derive(maybeE(function (c) { return ({ "A": "Adam", "B": "Bertie" })[c]; }));
console.log(name.get()); //$
// $> [TypeError: Cannot read property 'toUpperCase' of null]
char.set("b");
console.log(name.get()); //$
// $> Bertie
/***

And you can use the same wrappers for reactions:

***/
var reaction = name.react(maybeE(function (name) { return console.log("the name is " + name); })); //$
// $> the name is Bertie
char.set("a"); //$
// $> the name is Adam
char.set([]); //$
// ... no output
char.set(null); //$
// ... no output
char.set("b"); //$
// $> the name is Bertie
char.set("y"); //$
// $> the name is undefined
/***

The wrappers compose too:

***/
var m = function (f) { return maybe(maybeE(f)); };
c = char.derive(m(function (c) { return c.toUpperCase(); }));
name = c.derive(m(function (c) { return ({ "A": "Adam", "B": "Bertie" })[c]; }));
reaction.stop();
reaction = name.react(m(function (name) { return console.log("the name is " + name); })); //$
// ... no output
char.set("b"); //$
// $> the name is Bertie
char.set("x"); // caught by maybe //$
// ... no output
char.set(null); // caught by maybeE //$
// ... no output
/***

Multi-arity versions left as an exercise for the reader.

***/
