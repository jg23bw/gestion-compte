/**
 * Contract for updating the authenticated user's private metadata.
 */
(function exposeAuthMetadataRepositoryPort(root) {
  const api = Object.freeze({
    isAuthMetadataRepository(value) {
      return Boolean(value && typeof value.update === 'function');
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AuthMetadataRepositoryPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
