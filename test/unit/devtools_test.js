'use strict';

require('source-map-support');
require('babel-register');
var sinon = require('sinon');
var hook = sinon.spy();
global.__DERIVABLE_DEVTOOLS_HOOK__ = hook;
var { atom } = require('../../src');
var chai = require('chai');

describe('devtools', function () {
  it('captures atoms', function () {
    const a = atom(1);
    a.react(() => {});

    chai.expect(hook.callCount).to.equal(2);
    chai.expect(hook.firstCall.args[0]).to.equal('captureAtom');
    chai.expect(hook.lastCall.args[0]).to.equal('captureAtom');
    chai.expect(hook.firstCall.args[1]).to.equal(a);
    chai.expect(hook.lastCall.args[1]).to.equal(a);
  });
});
