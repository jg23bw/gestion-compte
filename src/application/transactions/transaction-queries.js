/**
 * Read-side transaction use cases.
 * Depends only on the repository port and pure domain rules.
 */
(function exposeTransactionQueries(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TransactionQueries = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function create({ repository, domain }) {
    if (!repository || !domain) throw new TypeError('repository and domain are required');
    return Object.freeze({
      listAccountTransactions(accountId) {
        return domain.sortAccountTransactions(repository.findByAccount(accountId), accountId);
      },
      balanceAt(accountId, untilDate = null) {
        const account = repository.findAccount(accountId);
        if (!account) return 0;
        return domain.balanceAt(account.opening, repository.findByAccount(accountId), untilDate);
      },
      professionalAdjustedBalanceAt(accountId, untilDate) {
        const account = repository.findAccount(accountId);
        if (!account) return 0;
        return domain.professionalAdjustedBalanceAt(
          account,
          repository.findByAccount(accountId),
          repository.findRecurringTemplates(),
          untilDate
        );
      }
    });
  }

  return Object.freeze({ create });
});
