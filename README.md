# Year Dots

A small web app that shows every day of the current year as a dot.

- Past days are small dimmed dots, days still ahead in the year are larger
  highlighted dots with a ring edge, and today has an outer ring.
- Click (or press Enter/Space on) a day to mark it as a day you achieved your
  goal; it gets a halo ring and a glow. Click again to unmark it.
- States differ by size and shape as well as colour, and the palette follows
  the system light or dark setting.
- Marked days are saved in `localStorage`, keyed by year, so they survive a
  page refresh and each year starts fresh.
- The header shows the year, how many days are left, and how many goals you
  have achieved.
- The grid is a single Tab stop. Arrow keys move between days (Left/Right by
  a day, Up/Down by a week), Home/End jump to the first/last day of the year,
  and the focused or hovered date is shown above the grid.
- Animations are disabled when the system asks for reduced motion, and the
  layout works down to small phone screens.

Built by a team of agents in a LetAgents Git Room as a QA exercise.

## Run it

No install or build step is needed. From the repository root:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (`npm run serve` runs the same command.)

The app uses ES modules, so it has to be served over HTTP; opening
`index.html` directly from the file system will not work.

## Test it

Tests use Node's built-in test runner (Node 18 or newer):

```sh
node --test
```

(`npm test` runs the same command.)

## Constraints

- Plain HTML, CSS and ES modules only.
- No dependencies, no lockfile, no bundler, no CDN, no build step.
- Logic lives in DOM-free functions (`dates.js`, `stats.js`, `storage.js`
  with injectable storage, and `nextIndexFor` in `keyboard.js`) so it can be
  tested directly with `node --test`.

## File layout

```text
index.html          Page shell: header counters, keyboard help, date readout
                    and the #js-grid container
styles.css          All styling: light/dark palettes, reduced motion and
                    forced colours
package.json        Script aliases only (test, serve); no dependencies
src/
  main.js           Entry point: renders one button per day, grouped by month,
                    and wires the click-to-toggle path
  dates.js          Pure date helpers (leap years, day keys, past/today/future)
  storage.js        localStorage-backed set of achieved days for one year
  stats.js          Pure header numbers (days left, goals achieved)
  header.js         Writes the year and stats into the header
  keyboard.js       Arrow/Home/End navigation with one roving Tab stop, and
                    the date readout
test/
  *.test.js         Unit tests per module (main.js is covered by main and
                    toggle), run with node --test
  integration.test.js  Grid, toggle and header wired together
```

Achieved days are stored under the key `year-dots:v1:<year>` as a JSON array
of `YYYY-MM-DD` strings. If storage is blocked or full, marking still works
for the current visit but is not saved.
