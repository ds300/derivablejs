import _, {atom, derive, transact} from '../src/havelock';
import assert from 'assert';

describe("a reaction", () => {
  let counter = atom(0);
  let inc = n => n+1
  let history = imut.List();
  let action = null;
  let reaction = counter.react(function (n) {
    reaction && assert.strictEqual(this, reaction, "`this` is bound to the reaction");
    history = history.push(n);
    action && action();
  });

  function checkHistory(expected, msg) {
    expected = imut.List(expected);
    if (!history.equals(expected)) {
      assert.fail(history.toString(), expected.toString(), msg);
    }
  }

  it("is like a derivation with no value, only reacting to changes", done => {
    checkHistory([0], "it is evaluated at construction time");

    action = () => {
      if (history.size === 3) {
        checkHistory(imut.List([0, 1, 2]), "history is generated sequentially");
        done();
      }
    }

    counter.swap(inc);
    counter.swap(inc);
  });

  it("can be suspended via the .stop method", () => {
    checkHistory(imut.List([0, 1, 2]), "history hasn't changed");
    // make sure it still works
    counter.swap(inc);
    checkHistory(imut.List([0, 1, 2, 3]), "history has changed");
    // now check it stops
    reaction.stop();
    counter.swap(inc); // now 4 but shouldn't get put in history

    checkHistory(imut.List([0, 1, 2, 3]), "history hasn't changud again");
  });

  it("can be restarted again via the .start method", () => {
    // check it hasn't changed
    checkHistory(imut.List([0, 1, 2, 3]), "history hasn't changed yet again");
    // check it still isn't changing
    counter.swap(inc); // now 5 but shouldn't get put in history
    checkHistory(imut.List([0, 1, 2, 3]), "history hasn't changed yet again 2");
    reaction.start(); // restart but don't force
    checkHistory(imut.List([0, 1, 2, 3]), "no history change 3");
    counter.swap(inc); // now 6 but should get put in history
    checkHistory(imut.List([0, 1, 2, 3, 6]), "history changed again!");
  });

  it("won't be evaluated in a transaction", () => {
    checkHistory(imut.List([0, 1, 2, 3, 6]), "no change 1");
    transact(() => {
      checkHistory(imut.List([0, 1, 2, 3, 6]), "no change 2");
      counter.swap(inc); // now 7
      checkHistory(imut.List([0, 1, 2, 3, 6]), "no change 3");
      counter.swap(inc); // now 8
      checkHistory(imut.List([0, 1, 2, 3, 6]), "no change 4");
    });
    // now transaction commits and 8 gets added
    checkHistory(imut.List([0, 1, 2, 3, 6, 8]), "eight");
  });
});
