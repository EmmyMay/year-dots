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

/** Give the year one tab stop; native Enter/Space clicks keep the toggle path. */
export function initKeyboard(container, readout) {
  const dots = Array.from(container.querySelectorAll('.dot'));
  if (dots.length === 0) return;

  let current = Math.max(0, dots.findIndex((dot) => dot.classList.contains('is-today')));
  dots.forEach((dot, index) => { dot.tabIndex = index === current ? 0 : -1; });

  function showDate(dot) {
    readout.textContent = dot.getAttribute('aria-label');
  }

  function eventDot(event) {
    const dot = event.target.closest?.('.dot');
    return dot && container.contains(dot) ? dot : null;
  }

  showDate(dots[current]);
  container.addEventListener('focusin', (event) => {
    const dot = eventDot(event);
    if (!dot) return;
    dots[current].tabIndex = -1;
    current = dots.indexOf(dot);
    dot.tabIndex = 0;
    showDate(dot);
  });

  container.addEventListener('keydown', (event) => {
    const dot = eventDot(event);
    if (!dot || event.altKey || event.ctrlKey || event.metaKey) return;
    const next = nextIndexFor(event.key, dots.length, dots.indexOf(dot));
    if (next === null) return;
    event.preventDefault();
    dots[next].focus();
  });

  container.addEventListener('pointerover', (event) => {
    const dot = eventDot(event);
    if (dot) showDate(dot);
  });
  container.addEventListener('pointerout', (event) => {
    if (eventDot(event)) showDate(dots[current]);
  });
}
