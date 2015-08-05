import imut from 'immutable'

function clamp (a, b, c) {
  return Math.min(Math.max(a, b), c);
}

export function historical (data) {
  // root atom contains list of previous states and index of current state in
  // that list
  let a = atom(imut.Map().set("history", data).set("idx", 0));

  // create a cursor into the history list based on the index to represent
  // the current state.
  let dataAtom = a.cursor({
    get (a) {
      return a.get("history").get(a.get("idx"));
    },
    set (a, data) {
      // instead of replacing the state at history[idx], we push the new state
      // to the end of the list and increment the index, truncating if
      // necessary
      let idx = a.get("idx");
      let history = a.get("history").setSize(idx+1);
      return a.set("history", history.push(data)).set("idx", idx+1);
    }
  });

  // let the user do back/forward by directly modifying the idx
  let idxAtom = a.cursor({
    get (a) {
      return a.get("idx");
    },
    set (a, i) {
      // just need to clamp it to avoid out of bounds nonsense
      let n = a.get("history").size;
      return a.set("idx", clamp(0, i, n-1));
    }
  });

  // finally, expose the history itself. but only the history, not the
  // current state
  let historyAtom = a.cursor({
    get (a) {
      let h = a.get("history");
      return h.setSize(h.size - 1);
    },
    set (a, newHistory) {
      let h = a.get("history");
      let idx = a.get("idx");
      if (!newHistory) {
        h = imut.List(h.last());
        idx = 0;
      } else {
        h = newHistory.push(h.last());
        idx = clamp(0, idx, h.size-1);
      }
      return a.set("history", h).set("idx", idx);
    }
  });

  return { state: dataAtom, cursor: idxAtom, history: historyAtom };
}
