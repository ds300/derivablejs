'use strict';

const originalWarn = console.warn;
const warn = jest.fn();
console.warn = warn;
global.__DERIVABLE_INIT_FLAG__ = true;
require('../');
console.warn = originalWarn;

test('warn about multiple instances', function () {
  expect(warn.mock.calls.length).toEqual(1);
  expect(warn.mock.calls[0][0].toLowerCase()).toEqual(
    expect.stringContaining('multiple instances')
  );
});
