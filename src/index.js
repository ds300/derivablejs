import {derivablePrototype} from './derivable';
import {mutablePrototype} from './mutable';
import {Derivation} from './derivation';
import {Lens} from './lens';
import {Atom} from './atom';
import {assign} from './util';

import * as derivable from './module';

assign(Derivation.prototype, derivablePrototype);
assign(Lens.prototype, derivablePrototype, mutablePrototype);
assign(Atom.prototype, derivablePrototype, mutablePrototype);

module.exports = derivable;
