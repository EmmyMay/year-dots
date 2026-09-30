/** Store achieved date keys for one year; keep working in memory if storage fails. */
export function createStore(year, storage) {
  const storageKey = `year-dots:v1:${year}`;
  let achieved = new Set();

  try {
    // Accessing localStorage itself can throw when browser storage is blocked.
    if (storage === undefined) storage = globalThis.localStorage;
    const saved = JSON.parse(storage.getItem(storageKey));
    if (Array.isArray(saved) && saved.every((key) => typeof key === 'string')) {
      achieved = new Set(saved);
    }
  } catch {
    // Missing, corrupt or inaccessible storage starts with an empty set.
  }

  return {
    getAchieved() {
      return new Set(achieved);
    },

    has(key) {
      return achieved.has(key);
    },

    toggle(key) {
      const next = !achieved.has(key);
      if (next) achieved.add(key);
      else achieved.delete(key);

      try {
        storage.setItem(storageKey, JSON.stringify([...achieved]));
      } catch {
        // A quota or privacy restriction must not prevent an in-memory toggle.
      }
      return next;
    },

    clear() {
      achieved.clear();
      try {
        storage.removeItem(storageKey);
      } catch {
        // Clearing this session still works when persistence is unavailable.
      }
    },
  };
}
