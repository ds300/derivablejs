export function addToArray<T>(array: T[], item: T) {
  const idx = array.indexOf(item);
  if (idx === -1) {
    array.push(item);
  }
}

export function removeFromArray<T>(array: T[], item: T) {
  const idx = array.indexOf(item);
  if (idx > -1) {
    array.splice(idx, 1);
  }
}
