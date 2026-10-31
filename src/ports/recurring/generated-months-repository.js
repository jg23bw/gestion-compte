/**
 * Port for reading and restoring generated recurring-month markers.
 */
(function exposeGeneratedMonthsRepository(root) {
  const api = Object.freeze({
    isGeneratedMonthsRepository(value) {
      return Boolean(value
        && typeof value.list === 'function'
        && typeof value.has === 'function'
        && typeof value.add === 'function'
        && typeof value.remove === 'function'
        && typeof value.getRaw === 'function'
        && typeof value.restoreRaw === 'function');
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.GeneratedMonthsRepositoryPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
