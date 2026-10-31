/**
 * Contract for cloud repositories used to persist account and recurring-template rows.
 */
(function exposeCloudTableRepositoryPort(root) {
  const api = Object.freeze({
    isCloudTableRepository(value) {
      return Boolean(value
        && typeof value.listAll === 'function'
        && typeof value.upsertMany === 'function'
        && typeof value.deleteById === 'function');
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CloudTableRepositoryPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
