import { daysOfYear, dayStatus, formatLong } from './dates.js';

const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long' });

function createMonth(doc, date) {
  const section = doc.createElement('section');
  section.className = 'month';

  const heading = doc.createElement('h2');
  heading.className = 'month-name';
  heading.id = `month-${date.getMonth() + 1}`;
  heading.textContent = monthName.format(date);
  section.setAttribute('aria-labelledby', heading.id);

  const dots = doc.createElement('div');
  dots.className = 'month-dots';

  section.append(heading, dots);
  return { section, dots };
}

function createDot(doc, day, today) {
  const status = dayStatus(day.date, today);
  const dot = doc.createElement('button');
  dot.type = 'button';
  dot.className = 'dot';
  dot.dataset.key = day.key;

  let label = formatLong(day.date);
  if (status === 'past') {
    dot.classList.add('is-past');
  } else {
    dot.classList.add('is-future');
  }
  if (status === 'today') {
    dot.classList.add('is-today');
    dot.setAttribute('aria-current', 'date');
    label += ', today';
  }
  dot.setAttribute('aria-label', label);
  return dot;
}

export function renderYear(container, today, doc = container.ownerDocument) {
  const fragment = doc.createDocumentFragment();
  let month = -1;
  let dots;

  for (const day of daysOfYear(today.getFullYear())) {
    if (day.date.getMonth() !== month) {
      month = day.date.getMonth();
      const group = createMonth(doc, day.date);
      fragment.append(group.section);
      dots = group.dots;
    }
    dots.append(createDot(doc, day, today));
  }

  container.replaceChildren(fragment);
}

const grid = globalThis.document?.getElementById('js-grid');
if (grid) {
  renderYear(grid, new Date());
}
