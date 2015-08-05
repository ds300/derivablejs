import { expect } from 'chai'
import { historical } from './history'
import imut from 'immutable'

const { state, cursor, history } = historical("the first state");
const inc = x => x+1
const dec = x => x-1

describe("the history bits", () => {
  const { state, cursor, history } = historical("the first state");
  it("can be created", () => {
    expect(state.get()).to.equal("the first state");
    expect(cursor.get()).to.equal(0);
    expect(history.get().toJS()).to.eql([]);
  });

  it("should save states in history", () => {
    state.set("the second state");
    expect(history.get().toJS()).to.eql(["the first state"]);
    expect(state.get()).to.eql("the second state");
    state.set("the third state");
    expect(history.get().toJS()).to.eql(["the first state", "the second state"]);
    expect(state.get()).to.eql("the third state");
  });

  it("should allow one to cycle through history", () => {
    cursor.swap(dec);
    expect(state.get()).to.eql("the second state");
    cursor.swap(dec);
    expect(state.get()).to.eql("the first state");
  });

  it("should not let the cursor go beyond the history bounds", () => {
    expect(cursor.get()).to.eql(0);
    expect(state.get()).to.eql("the first state");
    cursor.swap(dec);
    expect(cursor.get()).to.eql(0);
    expect(state.get()).to.eql("the first state");
    cursor.swap(dec);
    expect(cursor.get()).to.eql(0);
    expect(state.get()).to.eql("the first state");

    cursor.set(-50023);
    expect(cursor.get()).to.eql(0);
    expect(state.get()).to.eql("the first state");

    cursor.set(203493);
    expect(cursor.get()).to.eql(2);
    expect(state.get()).to.eql("the third state");

    cursor.swap(inc);
    expect(cursor.get()).to.eql(2);
    expect(state.get()).to.eql("the third state");

    cursor.swap(inc);
    expect(cursor.get()).to.eql(2);
    expect(state.get()).to.eql("the third state");
  });

  it("should let one edit history", () => {
    history.swap(h => h.set(0, "the new first state"));

    expect(history.get().toJS()).to.eql(["the new first state", "the second state"]);

    cursor.set(0);

    expect(state.get()).to.eql("the new first state");
  });

  it("should truncte the history when the cursor is not at the most recent state when a new state is added", () => {
    cursor.set(0);
    state.set("the new second state");

    expect(cursor.get()).to.eql(1);
    expect(history.get().toJS()).to.eql(["the new first state"]);

    state.set("the new third state");
    expect(cursor.get()).to.eql(2);
    expect(history.get().toJS()).to.eql(["the new first state", "the new second state"]);
  });

  it("should delete the history when you set the history to be a falsey value", () => {
    history.set(null);

    expect(state.get()).to.eql("the new third state");

    expect(history.get().toJS()).to.eql([]);
  });

});
