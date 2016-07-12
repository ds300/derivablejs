import {derivablePrototype} from './derivable';
import {mutablePrototype} from './mutable';
import {observablePrototype} from './observable';
import {Derivation} from './derivation';
import {Lens} from './lens';
import {Atom} from './atom';
import {assign} from './util';

import * as derivable from './module';

assign(Derivation.prototype, derivablePrototype, observablePrototype);
assign(Lens.prototype, derivablePrototype, observablePrototype, mutablePrototype);
assign(Atom.prototype, derivablePrototype, observablePrototype, mutablePrototype);


export var __Reactor = derivable.__Reactor;
export var transact = derivable.transact;
export var setDebugMode = derivable.setDebugMode;
export var transaction = derivable.transaction;
export var ticker = derivable.ticker;
export var isDerivable = derivable.isDerivable;
export var isAtom = derivable.isAtom;
export var isLensed = derivable.isLensed;
export var isDerivation = derivable.isDerivation;
export var derivation = derivable.derivation;
export var atom = derivable.atom;
export var atomic = derivable.atomic;
export var atomically = derivable.atomically;
export var lens = derivable.lens;
export var derive = derivable.derive;
export var unpack = derivable.unpack;
export var lift = derivable.lift;
export var struct = derivable.struct;
export var wrapPreviousState = derivable.wrapPreviousState;
export var captureDereferences = derivable.captureDereferences;
export var or = derivable.or;
export var mOr = derivable.mOr;
export var and = derivable.and;
export var mAnd = derivable.mAnd;

export default derivable;
