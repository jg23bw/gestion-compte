/**
 * Supabase transaction repository port.
 *
 * listAll returns raw persisted rows; upsertMany accepts rows mapped to the
 * existing database schema and reports whether the legacy fallback was used.
 */
(function exposeTransactionCloudRepositoryPort(root) {
  const api = Object.freeze({
    isTransactionCloudRepository(value) {
      return Boolean(value
        && typeof value.listAll === 'function'
        && typeof value.upsertMany === 'function'
        && typeof value.deleteById === 'function');
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TransactionCloudRepositoryPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
