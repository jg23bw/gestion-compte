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
      monthlyHistory({ month, accountFilter = 'all', typeFilter = 'all', query = '', sort = 'date-asc' } = {}) {
        const normalizedQuery = String(query).trim().toLocaleLowerCase('fr');
        const rows = repository.findAll().filter(transaction => {
          const account = repository.findAccount(transaction.accountId);
          const accountName = account?.name || '';
          const amount = Number(transaction.amount);
          return String(transaction.date || '').slice(0, 7) === month
            && (accountFilter === 'all' || transaction.accountId === accountFilter)
            && (typeFilter === 'all' || (typeFilter === 'income' ? amount >= 0 : amount < 0))
            && (String(transaction.label || '') + ' ' + accountName).toLocaleLowerCase('fr').includes(normalizedQuery);
        });
        rows.sort((a, b) => {
          if (sort === 'date-desc') return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
          if (sort === 'label') return a.label.localeCompare(b.label, 'fr');
          if (sort === 'amount-asc') return Number(a.amount) - Number(b.amount);
          if (sort === 'amount-desc') return Number(b.amount) - Number(a.amount);
          if (sort === 'account') {
            const accountA = repository.findAccount(a.accountId)?.name || '';
            const accountB = repository.findAccount(b.accountId)?.name || '';
            return accountA.localeCompare(accountB, 'fr') || a.date.localeCompare(b.date);
          }
          return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
        });
        const incoming = rows.filter(item => Number(item.amount) > 0).reduce((sum, item) => sum + Number(item.amount), 0);
        const outgoing = rows.filter(item => Number(item.amount) < 0).reduce((sum, item) => sum + Number(item.amount), 0);
        return Object.freeze({ rows, incoming, outgoing, net: incoming + outgoing });
      },
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
