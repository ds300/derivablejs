import * as types from './types';
import * as util from './util';
import {DISCONNECTED, UNKNOWN, UNCHANGED, CHANGED} from './states';
import {detach, derive} from './derivation';

export function Reactor(parent, react, governor) {
  this._parent = parent;
  this.react = react;
  this._governor = governor || null;
  this._active = false;
  this._reacting = false;
  this._type = types.REACTOR;

  if (util.DEBUG_MODE) {
    this.stack = Error().stack;
  }
}

util.assign(Reactor.prototype, {
  start: function () {
    this._active = true;

    util.addToArray(this._parent._activeChildren, this);

    this._parent.get();
    return this;
  },

  _force: function (nextValue) {
    try {
      this._reacting = true;
      this.react(nextValue);
    } catch (e) {
      if (util.DEBUG_MODE) {
        console.error(this.stack);
      }
      throw e;
    } finally {
      this._reacting = false;
    }
  },

  force: function () {
    this._force(this._parent.get());

    return this;
  },

  _maybeReact: function () {
    if (!this._reacting && this._active) {
      if (this._governor !== null) {
        this._governor._maybeReact();
      }
      // maybe the reactor was stopped by the parent
      if (this._active) {
        var nextValue = this._parent.get();
        if (this._parent._state === CHANGED) {
          this._force(nextValue);
        }
      }
    }
  },
  stop: function () {
    detach(this._parent, this);
    this._active = false;
    return this;
  },
});

export function makeReactor (derivable, f, opts) {
  if (typeof f !== 'function') {
    throw Error('the first argument to .react must be a function');
  }

  opts = util.assign({
    once: false,
    from: true,
    until: false,
    when: true,
    skipFirst: false,
  }, opts);

  var skipFirst = opts.skipFirst;

  // coerce fn or bool to derivable<bool>
  function condDerivable(fOrD, name) {
    if (!types.isDerivable(fOrD)) {
      if (typeof fOrD === 'function') {
        return derive(function () { return fOrD(derivable); });
      } else if (typeof fOrD === 'boolean') {
        return derive(function () { return fOrD; });
      } else {
        throw Error('react ' + name + ' condition must be derivable, got: ' + JSON.stringify(fOrD));
      }
    }
    return fOrD;
  }

  // wrap reactor so f doesn't get a .this context, and to allow
  // stopping after one reaction if desired.
  var reactor = new Reactor(derivable, function (val) {
    if (skipFirst) {
      skipFirst = false;
    } else {
      f(val);
      if (opts.once) {
        this.stop();
        controller.stop();
      }
    }
  });

  // listen to when and until conditions, starting and stopping the
  // reactor as appropriate, and stopping this controller when until
  // condition becomes true
  var $until = condDerivable(opts.until, 'until');
  var $when = condDerivable(opts.when, 'when');

  var $whenUntil = derive(function () {
    return {
      until: $until.get(),
      when: $when.get(),
    };
  });

  var controller = new Reactor($whenUntil, function (conds) {
    if (conds.until) {
      reactor.stop();
      this.stop();
    } else if (conds.when) {
      if (!reactor._active) {
        reactor.start().force();
      }
    } else if (reactor._active) {
      reactor.stop();
    }
  });

  reactor._governor = controller;

  // listen to from condition, starting the reactor controller
  // when appropriate
  var $from = condDerivable(opts.from, 'from');
  var initiator = new Reactor($from, function (from) {
    if (from) {
      controller.start().force();
      this.stop();
    }
  });

  initiator.start().force();
}
