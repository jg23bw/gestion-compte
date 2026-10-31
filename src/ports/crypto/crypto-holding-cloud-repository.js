/**
 * Contract for the authenticated crypto-holdings cloud repository.
 */
(function exposeCryptoHoldingCloudRepositoryPort(root) {
  const api = Object.freeze({
    isCryptoHoldingCloudRepository(value) {
      return Boolean(value
        && typeof value.listAll === 'function'
        && typeof value.upsertMany === 'function'
        && typeof value.deleteById === 'function');
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CryptoHoldingCloudRepositoryPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
