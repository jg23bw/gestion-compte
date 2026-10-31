/**
 * Port for account persistence and account-owned pledge metadata.
 */
(function exposeAccountRepositoryPort(root) {
  const api = Object.freeze({
    assert(repository) {
      const methods = ['findAll','findById','save','delete','findPledgeByAccount',
        'findAllPledges','savePledge','deletePledgeByAccount'];
      if (!repository || methods.some(method => typeof repository[method] !== 'function')) {
        throw new TypeError('account repository port is required');
      }
      return repository;
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AccountRepositoryPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
