'use strict';

require('source-map-support');
require('babel-register');
var sinon = require('sinon');
var chai = require('chai');
var originalWarn = console.warn;
var warn = sinon.spy();
console.warn = warn;
global.__DERIVABLE_INIT_FLAG__ = true;
require('../../src');
console.warn = originalWarn;

describe('multiple instances', function () {
  it('warned', function () {
    chai.expect(warn.callCount).to.equal(1);
    chai.expect(warn.firstCall.args[0].toLowerCase()).to.include('multiple instances');
  });
});
