import imut from 'immutable';
import atom from '../ratom.js';
import assert from 'assert';


let root = atom(imut.fromJS({foo: "bar"}));

describe("blah", () => {
  it("blahs all day", () => {
    assert.equal(root.get().get("foo"), "bar");
    root.swap(root => root.set("foo", "baz"));
    assert.equal(root.get().get("foo"), "baz");
  })
})


const hello = nm => `Hello ${nm}!`;

const firstName = atom("John");

console.log(firstName.get()) // $> John

let greeting = firstName.derive(hello);

console.log(greeting.get()); // $> Hello John!

firstName.set("Wilbur");

console.log(greeting.get()); // $> Hello Wilbur!

let surname = atom("Force");

let fullName = derive(() => `${firstName.get()} ${surname.get()}`);

greeting = fullName.derive(hello);

console.log(greeting.get()); // $> Hello Wilbur Force!
