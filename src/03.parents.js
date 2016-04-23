var parentsStack = [];

function parents_capturingParentsEpochs(f) {
  var i = parentsStack.length;
  parentsStack.push([]);
  try {
    f();
    return parentsStack[i];
  } finally {
    parentsStack.pop();
  }
}

function parents_captureParent(p) {
  if (parentsStack.length > 0) {
    var top = parentsStack[parentsStack.length - 1];
    top.push(p, 0);
    return top.length-1;
  } else {
    return -1;
  }
}

function parents_captureEpoch(idx, epoch) {
  if (parentsStack.length > 0) {
    parentsStack[parentsStack.length - 1][idx] = epoch;
  }
}
