/**
 * Port for account persistence.
 */
(function exposeAccountRepositoryPort(root) {
  const api = Object.freeze({
    assert(repository) {
      if (!repository || typeof repository.findAll !== 'function'
        || typeof repository.findById !== 'function'
        || typeof repository.save !== 'function') {
        throw new TypeError('account repository port is required');
      }
      return repository;
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AccountRepositoryPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
