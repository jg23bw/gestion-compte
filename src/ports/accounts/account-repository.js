/**
 * Port for account persistence and account-owned pledge metadata.
 */
(function exposeAccountRepositoryPort(root) {
  const api = Object.freeze({
    assert(repository) {
      if (!repository || typeof repository.findAll !== 'function'
        || typeof repository.findById !== 'function'
        || typeof repository.save !== 'function'
        || typeof repository.delete !== 'function'
        || typeof repository.findPledgeByAccount !== 'function'
        || typeof repository.deletePledgeByAccount !== 'function') {
        throw new TypeError('account repository port is required');
      }
      return repository;
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AccountRepositoryPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
