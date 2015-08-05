import { expect } from 'chai'
import { historical } from './history'
import imut from 'immutable'

const { state, cursor, history } = historical("the first state");

describe("the `historical` function", () => {
  const { state, cursor, history } = historical("the first state");
  it("should return some stuff", () => {
    expect(state.get()).to.equal("the first state");
    expect(cursor.get()).to.equal(0);
    expect(history.get()).to.equal(imut.List());
  });
});
