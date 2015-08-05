import {derive, get} from 'havelock'
import imut from 'immutable'

/*** Cursor for Immutable ***/

function cursor (...path) {
  return {
    get: x => x.getIn(path),
    set: (x, v) => x.setIn(path, v)
  }
}

export function explode(derivableListT, idF) {
  idF = idF || ((x) => x);
  const ids = derivableListT.derive(list => list.map(idF).toList());

  let cache = imut.Map();

  let id2idx = ids.derive(ids => {
    let startTime = +new Date();
    let map = imut.Map();
    ids.forEach((id, idx) => {
      let idxs = map.get(id) || imut.List();
      map = map.set(id, idxs.push(idx));
    });
    let endTime = +new Date();
    console.log(`id2idx: ${endTime - startTime}`);
    return map;
  });

  return ids.derive(ids => {
    let startTime = +new Date();
    let newCache = imut.Map();
    let result = ids.map(id => {
      let itemDs = cache.get(id);
      let itemD = null;

      if (itemDs) {
        itemD = itemDs.last();
        if (itemDs.size === 1) {
          cache = cache.delete(id);
        } else {
          cache = cache.set(id, itemDs.pop());
        }
      } else {
        let idxD = id2idx.derive(map => map.get(id).get(itemD.idxidx));
        itemD = derive(derivableListT, idxD, (xs, i) => xs.get(i));
      }

      let idAcc = newCache.get(id) || imut.List();
      itemD.idxidx = idAcc.size;

      newCache = newCache.set(id, idAcc.push(itemD));
      return itemD;
    }).toList();

    cache = newCache;
    let endTime = +new Date();
    console.log(`explode: ${endTime - startTime}`);
    return result;
  })
}

export function innerMap(derivableListDerivableT, fn) {
  return derivableListDerivableT.derive(dxs => dxs.map((x, i) => x.derive(x => fn(x, i))));
}

export function dmap(fn, derivableListT) {
  return innerMap(explode(derivableListT), fn).derive(xs => xs.map(get).toList());
}


function historical (data) {
  let a = atom(imut.Map().set("history", data).set("idx", 0));

  let dataAtom = a.cursor({
    get (a) {
      return a.get("history").get(a.get("idx"));
    },
    set (a, data) {
      return a.update("history", h => h.push(data)).update("idx", i => i+1);
    }
  });

  let idxAtom = a.cursor({
    get (a) {
      return a.get("idx");
    },
    set (a, i) {
      let n = a.get("history").size;
      return a.set("idx", Math.min(Math.max(i, 0), n-1));
    }
  });

  return [dataAtom, idxAtom]
}
