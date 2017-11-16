"use strict";

const hook = jest.fn();
global.__DERIVABLE_DEVTOOLS_HOOK__ = hook;
const atom = require("../").atom;

test("capture every atom get and pass to devtools hook", () => {
  const a = atom(1);
  a.react(() => {});

  expect(hook.mock.calls.length).toEqual(2);
  expect(hook.mock.calls[0][0]).toEqual("captureAtom");
  expect(hook.mock.calls[1][0]).toEqual("captureAtom");
  expect(hook.mock.calls[0][1]).toEqual(a);
  expect(hook.mock.calls[1][1]).toEqual(a);
});
