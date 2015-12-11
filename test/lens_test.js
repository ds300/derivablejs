import imut from 'immutable';
import _, {atom} from '../dist/derivable';
import assert from 'assert';

describe("lenses", () => {
  let cursor = (lensable, ...path) => lensable.lens({
    get (state) {
      return state.getIn(path);
    },
    set (state, val) {
      return state.setIn(path, val);
    }
  });

  it("makes a functional lens over an atom", () => {
    let root = atom(imut.fromJS({things: ["zero", "one", "three"]}));

    let two = cursor(root, "things", 2);
    assert.equal("three", two.get());

    two.set("two");

    assert(imut.fromJS({things: ["zero", "one", "two"]}).equals(root.get()));

    let things = cursor(root, "things");

    assert(imut.fromJS(["zero", "one", "two"]).equals(things.get()));

    let one = cursor(things, 1);

    assert.equal("one", one.get());


    let reactors = 0;

    one.react(() => reactors++);

    assert.equal(1, reactors);
    one.set("five");
    assert.equal(2, reactors);

    assert(imut.fromJS(["zero", "five", "two"]).equals(things.get()));
  });

  it("works on numbers too", () => {
    const num = atom(3.14159);

    const afterDecimalPoint = num.lens({
      get (number) {
        return parseInt(number.toString().split(".")[1]) || 0;
      },
      set (number, newVal) {
        let beforeDecimalPoint = number.toString().split(".")[0];
        return parseFloat(`${beforeDecimalPoint}.${newVal}`);
      }
    });

    assert.strictEqual(14159, afterDecimalPoint.get());

    afterDecimalPoint.set(4567);

    assert.strictEqual(3.4567, num.get());

    afterDecimalPoint.swap(x => x * 2);

    assert.strictEqual(9134, afterDecimalPoint.get());

    assert.strictEqual(3.9134, num.get());
  });
});

describe('composite lenses', () => {
  it('allow multiple atoms to be lensed over', () => {
    const $FirstName = atom('John');
    const $LastName = atom('Steinbeck');
    const $Name = _.lens({
      get () {
        return `${$FirstName.get()} ${$LastName.get()}`;
      },
      set (val) {
        const [first, last] = val.split(' ');
        $FirstName.set(first);
        $LastName.set(last);
      }
    });

    assert.strictEqual($Name.get(), 'John Steinbeck');

    $Name.set('James Joyce');
    assert.strictEqual($Name.get(), 'James Joyce');
    assert.strictEqual($FirstName.get(), 'James');
    assert.strictEqual($LastName.get(), 'Joyce');
  });

  it('runs `set` opeartions atomically', () => {
    const $A = atom('a');
    const $B = atom('b');

    let numReactions = 0;
    $A.reactor(() => numReactions++).start();
    $B.reactor(() => numReactions++).start();

    _.lens({
      get () {},
      set () {
        $A.set('A');
        assert.strictEqual(numReactions, 0);
        $B.set('B');
        assert.strictEqual(numReactions, 0);
      }
    }).set();
    assert.strictEqual(numReactions, 2);
  });
});
