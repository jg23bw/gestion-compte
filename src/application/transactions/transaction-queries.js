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
      balanceAfterTransaction(transaction) {
        if (!transaction) return 0;
        const account = repository.findAccount(transaction.accountId);
        if (!account) return 0;
        let balance = Number(account.opening || 0);
        for (const item of domain.sortAccountTransactions(
          repository.findByAccount(transaction.accountId),
          transaction.accountId
        )) {
          balance += Number(item.amount);
          if (item.id === transaction.id) break;
        }
        return balance;
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
