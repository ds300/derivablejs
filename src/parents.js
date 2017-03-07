import * as util from './util';

var parentsStack = [];
var child = null;

export function startCapturingParents (_child, parents) {
  parentsStack.push({parents: parents, offset: 0, child: _child});
  child = _child;
}
export function retrieveParentsFrame () {
  return parentsStack[parentsStack.length - 1];
}
export function stopCapturingParents () {
  parentsStack.pop();
  child = parentsStack.length === 0
          ? null
          : parentsStack[parentsStack.length - 1].child;
}

export function maybeCaptureParent (p) {
  if (child !== null) {
    var frame = parentsStack[parentsStack.length - 1];
    if (frame.parents[frame.offset] === p) {
      // nothing to do, just skip over
      frame.offset++;
    } else {
      // look for this parent elsewhere
      var idx = frame.parents.indexOf(p);
      if (idx === -1) {
        // not seen this parent yet, add it in the correct place
        // and push the one currently there to the end (likely that we'll be
        // getting rid of it)
        // sneaky hack for doing captureDereferences
        if (child !== void 0) {
          util.addToArray(p._activeChildren, child);
        }
        if (frame.offset === frame.parents.length) {
          frame.parents.push(p);
        } else {
          frame.parents.push(frame.parents[frame.offset]);
          frame.parents[frame.offset] = p;
        }
        frame.offset++;
      } else {
        if (idx > frame.offset) {
          // seen this parent after current point in array, so swap positions
          // with current point's parent
          var tmp = frame.parents[idx];
          frame.parents[idx] = frame.parents[frame.offset];
          frame.parents[frame.offset] = tmp;
          frame.offset++;
        }
        // else seen this parent at previous point and so don't increment offset
      }
    }
  }
};
