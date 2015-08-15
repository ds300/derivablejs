const parentsStack = [];

function parents_capturingParents(f) {
  parentsStack.push([]);
  f();
  return parentsStack.pop();
}

function parents_maybeCaptureParent(p) {
  if (parentsStack.length > 0) {
    util_addToArray(parentsStack[parentsStack.length - 1], p);
  }
}
