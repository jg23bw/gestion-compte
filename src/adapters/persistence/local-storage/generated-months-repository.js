/**
 * localStorage adapter for generated recurring-month markers.
 */
(function exposeLocalStorageGeneratedMonthsRepository(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.LocalStorageGeneratedMonthsRepository = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function create(storage, key) {
    if (!storage || typeof storage.getItem !== 'function'
      || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
      throw new TypeError('A Storage-compatible object is required');
    }
    if (!key) throw new TypeError('A storage key is required');

    function list() {
      try {
        const value = JSON.parse(storage.getItem(key) || '[]');
        return Array.isArray(value) ? value : [];
      } catch (error) {
        return [];
      }
    }

    function write(months) {
      try {
        storage.setItem(key, JSON.stringify(months));
      } catch (error) {
        // Marker persistence is best-effort; transaction recurring keys remain authoritative.
      }
    }

    return Object.freeze({
      list,
      has(month) {
        return list().includes(month);
      },
      add(month) {
        const months = list();
        if (!months.includes(month)) {
          months.push(month);
          write(months);
        }
        return months;
      },
      remove(month) {
        const months = list();
        const next = months.filter(value => value !== month);
        if (next.length !== months.length) write(next);
        return next;
      },
      getRaw() {
        try { return storage.getItem(key); } catch (error) { return null; }
      },
      restoreRaw(raw) {
        if (raw === null) storage.removeItem(key);
        else storage.setItem(key, raw);
      }
    });
  }

  return Object.freeze({ create });
});
