import * as types from "./types";
import * as util from "./util";
import { CHANGED } from "./states";
import { detach, derive } from "./derivation";

export function Reactor(parent, react, governor) {
  this._parent = parent;
  this.react = react;
  this._governor = governor || null;
  this._active = false;
  this._reacting = false;
  this._type = types.REACTOR;

  if (util.isDebug()) {
    this.stack = Error().stack;
  }
}

util.assign(Reactor.prototype, {
  start() {
    this._active = true;

    util.addToArray(this._parent._activeChildren, this);

    this._parent.get();
    return this;
  },

  _force(nextValue) {
    try {
      this._reacting = true;
      this.react(nextValue);
    } catch (e) {
      if (util.isDebug()) {
        console.error(this.stack);
      }
      throw e;
    } finally {
      this._reacting = false;
    }
  },

  force() {
    this._force(this._parent.get());

    return this;
  },

  _maybeReact() {
    if (!this._reacting && this._active) {
      if (this._governor !== null) {
        this._governor._maybeReact();
      }
      // maybe the reactor was stopped by the parent
      if (this._active) {
        const nextValue = this._parent.get();
        if (this._parent._state === CHANGED) {
          this._force(nextValue);
        }
      }
    }
  },

  stop() {
    detach(this._parent, this);
    this._active = false;
    return this;
  }
});

export function makeReactor(derivable, f, opts) {
  if (typeof f !== "function") {
    throw Error("the first argument to .react must be a function");
  }

  opts = util.assign(
    {
      once: false,
      skipFirst: false
    },
    opts
  );

  let skipFirst = opts.skipFirst;

  // wrap reactor so f doesn't get a .this context, and to allow
  // stopping after one reaction if desired.
  const reactor = new Reactor(derivable, val => {
    if (skipFirst) {
      skipFirst = false;
    } else {
      f(val);
      if (opts.once) {
        reactor.stop();
        controller.stop();
      }
    }
  });

  // coerce fn or bool to derivable<bool>
  const assertCondition = (condition, name) => {
    if (types.isDerivable(condition)) {
      return condition;
    }
    if (typeof condition === "function") {
      return derive(() => condition(derivable));
    }
    if (typeof condition === "undefined") {
      return condition;
    }
    throw Error(
      `react ${name} condition must be derivable or function, got: ` +
        JSON.stringify(condition)
    );
  };

  // listen to from condition, starting the reactor controller
  // when appropriate
  const $from = assertCondition(opts.from, "from");
  // listen to when and until conditions, starting and stopping the
  // reactor as appropriate, and stopping this controller when until
  // condition becomes true
  const $until = assertCondition(opts.until, "until");
  const $when = assertCondition(opts.when, "when");

  const $conds = derive(() => {
    return {
      from: $from ? $from.get() : true,
      until: $until ? $until.get() : false,
      when: $when ? $when.get() : true
    };
  });

  let started = false;

  const controller = new Reactor($conds, conds => {
    if (conds.from) {
      started = true;
    }
    if (started) {
      if (conds.until) {
        reactor.stop();
        controller.stop();
      } else if (conds.when) {
        if (!reactor._active) {
          reactor.start().force();
        }
      } else if (reactor._active) {
        reactor.stop();
      }
    }
  });
  controller.start().force();

  reactor._governor = controller;
}
