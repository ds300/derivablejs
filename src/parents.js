import * as util from './util';

var parentsStack = [];
var child = null;

export function startCapturingParents (_child) {
  parentsStack.push([]);
  child = _child;
}
export function retrieveParents () {
  return parentsStack[parentsStack.length - 1];
}
export function stopCapturingParents () {
  parentsStack.pop();
  child = null;
}

export function maybeCaptureParent (p) {
  if (child !== null) {
    parentsStack[parentsStack.length - 1].push(p);
    util.addToArray(p._activeChildren, child);
  }
};
