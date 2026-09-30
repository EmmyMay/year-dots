/** Return the next day index, or null when the key should keep its native behavior. */
export function nextIndexFor(key, count, index) {
  if (count === 0) return null;

  let next;
  switch (key) {
    case 'ArrowLeft': next = index - 1; break;
    case 'ArrowRight': next = index + 1; break;
    case 'ArrowUp': next = index - 7; break;
    case 'ArrowDown': next = index + 7; break;
    case 'Home': next = 0; break;
    case 'End': next = count - 1; break;
    default: return null;
  }

  return Math.max(0, Math.min(count - 1, next));
}
