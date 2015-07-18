import imut from 'immutable';
import _, {atom, derive, transact} from '../src/havelock';
import assert from 'assert';





//
// describe("boolean logic", () => {
//   it("is well understood", () => {
//     let a = atom(true),
//         b = atom(true),
//         aANDb = _.and(a, b),
//         aORb = _.or(a, b),
//         NOTa = _.not(a);
//
//     assert.strictEqual(aANDb.get(), true, "true & true = true");
//     assert.strictEqual(aORb.get(), true, "true | true = true");
//     assert.strictEqual(NOTa.get(), false, "!true = false")
//
//     b.set(false);
//
//     assert.strictEqual(aANDb.get(), false, "true & false = false");
//     assert.strictEqual(aORb.get(), true, "true | false = true");
//
//     a.set(false);
//
//     assert.strictEqual(aANDb.get(), false, "false & false = false");
//     assert.strictEqual(aORb.get(), false, "false | false = false");
//     assert.strictEqual(NOTa.get(), true, "!false = true");
//   });
// });
//
// describe("control flow", () => {
//   it ("allows different paths to be taken depending on conditions", () => {
//     let number = atom(0);
//     let even = number.derive(n => n % 2 === 0);
//
//     let message = _.if(even, "even", "odd");
//
//     assert.strictEqual(message.get(), "even");
//
//     number.set(1);
//
//     assert.strictEqual(message.get(), "odd");
//   });
//
//   it("doesn't evaluate untaken paths", () => {
//     let number = atom(0);
//     let even = number.derive(n => n % 2 === 0);
//
//     let dideven = false;
//     let didodd = false;
//
//     let chooseAPath = _.if(even,
//       derive(() => {
//         dideven = true;
//       }),
//       derive(() => {
//         didodd = true;
//       })
//     );
//
//     chooseAPath.get();
//
//     assert(dideven && !didodd, "didnt eval odd path");
//
//     dideven = false;
//
//     assert(!dideven && !didodd, "didnt eval anything yet1");
//
//     number.set(1);
//
//     assert(!dideven && !didodd, "didnt eval anything yet2");
//
//     chooseAPath.get();
//
//     assert(!dideven && didodd, "didnt eval even path");
//   });
//
//   it("same goes for the switch statement", () => {
//     let thing = atom("Tigran");
//
//     let result = _.switch(thing,
//       "Banana", "YUMMY",
//       532,      "FiveThreeTwo",
//       "Tigran", "Hamasayan"
//     );
//
//     assert.strictEqual("Hamasayan", result.get());
//
//     thing.set("Banana");
//
//     assert.strictEqual("YUMMY", result.get());
//
//     thing.set(532);
//
//     assert.strictEqual("FiveThreeTwo", result.get());
//
//     thing.set("nonsense");
//
//     assert(result.get() === void 0);
//
//     let switcheroo = atom("a");
//
//     let dida = false,
//         didb = false,
//         didc = false,
//         didx = false;
//
//     let conda = atom("a"),
//         condb = atom("b"),
//         condc = atom("c");
//
//     let chooseAPath = _.switch(switcheroo,
//       conda, derive(() => dida = true),
//       condb, derive(() => didb = true),
//       condc, derive(() => didc = true),
//       //else
//       derive(() => didx = true)
//     );
//
//     assert(!dida && !didb && !didc && !didx, "did nothing yet 1");
//
//     chooseAPath.get();
//     assert(dida && !didb && !didc && !didx, "did a");
//
//     dida = false;
//     switcheroo.set("b");
//     assert(!dida && !didb && !didc && !didx, "did nothing yet 2");
//
//     chooseAPath.get();
//     assert(!dida && didb && !didc && !didx, "did b");
//
//     didb = false;
//     switcheroo.set("c");
//     assert(!dida && !didb && !didc && !didx, "did nothing yet 3");
//
//     chooseAPath.get();
//     assert(!dida && !didb && didc && !didx, "did b");
//
//     didc = false;
//     switcheroo.set("blubr");
//     assert(!dida && !didb && !didc && !didx, "did nothing yet 4");
//
//     chooseAPath.get();
//     assert(!dida && !didb && !didc && didx, "did else");
//   });
// });
//
// describe("the lift function", () => {
//   it("lifts a function which operates on values to operate on derivables", () => {
//     let plus = (a, b) => a + b;
//     let dPlus = _.lift(plus);
//
//     let a = atom(5);
//     let b = atom(10);
//     let c = dPlus(a, b);
//
//     assert.equal(15, c.get());
//   });
// });
//
//
// describe("lenses", () => {
//   let cursor = (lensable, ...path) => lensable.lens({
//     get (state) {
//       return state.getIn(path);
//     },
//     set (state, val) {
//       return state.setIn(path, val);
//     }
//   });
//
//   it("makes a functional lens over an atom", () => {
//     let root = atom(imut.fromJS({things: ["zero", "one", "three"]}));
//
//     let two = cursor(root, "things", 2);
//     assert.equal("three", two.get());
//
//     two.set("two");
//
//     assert(imut.fromJS({things: ["zero", "one", "two"]}).equals(root.get()));
//
//     let things = cursor(root, "things");
//
//     assert(imut.fromJS(["zero", "one", "two"]).equals(things.get()));
//
//     let one = cursor(things, 1);
//
//     assert.equal("one", one.get());
//
//
//     let reactions = 0;
//
//     one.react(() => reactions++);
//
//     assert.equal(1, reactions);
//     one.set("five");
//     assert.equal(2, reactions);
//
//     assert(imut.fromJS(["zero", "five", "two"]).equals(things.get()));
//   });
//
//   it("works on numbers too", () => {
//     const num = atom(3.14159);
//
//     const afterDecimalPoint = num.lens({
//       get (number) {
//         return parseInt(number.toString().split(".")[1]) || 0;
//       },
//       set (number, newVal) {
//         let beforeDecimalPoint = number.toString().split(".")[0];
//         return parseFloat(`${beforeDecimalPoint}.${newVal}`);
//       }
//     });
//
//     assert.strictEqual(14159, afterDecimalPoint.get());
//
//     afterDecimalPoint.set(4567);
//
//     assert.strictEqual(3.4567, num.get());
//
//     afterDecimalPoint.swap(x => x * 2);
//
//     assert.strictEqual(9134, afterDecimalPoint.get());
//
//     assert.strictEqual(3.9134, num.get());
//   });
// })
