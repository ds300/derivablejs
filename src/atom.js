import * as util from './util';
import * as transactions from './transactions';
import * as parents from './parents';
import {ATOM} from './types';
import {UNCHANGED, CHANGED} from './states';

export function Atom (value) {
  this._id = util.nextId();
  this._activeChildren = [];
  this._value = value;
  this._state = UNCHANGED;
  this._type = ATOM;
  this._equals = null;
  return this;
};

util.assign(Atom.prototype, {
  _clone: function () {
    return util.setEquals(atom(this._value), this._equals);
  },

  set: function (value) {
    transactions.maybeTrack(this);

    var oldValue = this._value;
    this._value = value;

    if (!transactions.inTransaction()) {
      if (!this.__equals(value, oldValue)) {
        try {
          this._state = CHANGED;
          var reactors = [];
          transactions.mark(this, reactors);
          transactions.processReactors(reactors);
        } finally {
          this._state = UNCHANGED;
        }
      }
    }
  },

  get: function () {
    parents.maybeCaptureParent(this);
    return this._value;
  },
});

export function atom (value) {
  return new Atom(value);
}
