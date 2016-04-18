import {addToArray} from './util'

const parentsStack = [];

export function capturingParentsEpochs(f: () => any) {
  var i = parentsStack.length;
  parentsStack.push([]);
  try {
    f();
    return parentsStack[i];
  } finally {
    parentsStack.pop();
  }
}

export function captureParent(p: any) {
  if (parentsStack.length > 0) {
    const top = parentsStack[parentsStack.length - 1];
    top.push(p, 0);
    return top.length-1;
  } else {
    return -1;
  }
}

export function captureEpoch(idx: number, epoch: number) {
  if (parentsStack.length > 0) {
    const top = parentsStack[parentsStack.length - 1];
    top[idx] = epoch;
  }
}
