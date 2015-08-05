/// <reference path="./node_modules/havelock/dist/havelock.d.ts"/>
/// <reference path="./node_modules/immutable/dist/immutable.d.ts"/>

import {atom, Atom, Derivable} from 'havelock';
import * as _ from 'havelock';
import {List} from 'immutable';
import * as $ from 'immutable';

const numbers: Atom<List<number>> = atom(List([1,2,3]));
const doubled: Derivable<List<number>> = numbers.derive(xs => {
  return xs.map(x => x * 2).toList();
});

function explode<T>(xs: Derivable<List<T>>): Derivable<List<Derivable<T>>> {
  const size = xs.derive(xs => xs.size);
  return size.derive(size => {
    return $.Range(0, size).map(i => xs.derive(xs => xs.get(i))).toList();
  });
}

function map<I,O>(f: (x:I) => O, xs: Derivable<List<I>>): Derivable<List<O>> {
  let dxsI: Derivable<List<Derivable<I>>> = explode(xs);
  let dxsO: Derivable<List<Derivable<O>>> = dxsI.derive(dxs => {
    return dxs.map((dx: Derivable<I>) => dx.derive(f)).toList();
  });
  return dxsO.derive(dxs => dxs.map(_.get).toList());
}


const cachedDoubled: Derivable<List<number>>
  = map(x => {console.log(x); return x*2;}, numbers);

console.log("cd:", cachedDoubled.get());

numbers.set(List([1, 10, 3]));

console.log("cd:", cachedDoubled.get());
