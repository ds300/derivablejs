import {assignPolyfill} from '../../src/util';
import {expect} from 'chai';

describe('the assign function polyfill', () => {
  it('merges objects together', () => {
    const caps = {a: "A", b: "B"};
    const lower = {a: "a", b: "b", c: "c"};
    expect(assignPolyfill({}, lower, caps)).to.deep.equal({
      a: "A", b: "B", c: "c"
    });

  });
});
