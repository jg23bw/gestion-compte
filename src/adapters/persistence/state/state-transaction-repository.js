/**
 * Adapter over the legacy in-memory application state.
 * This keeps the existing persistence model intact while use cases stop
 * reading global state directly.
 */
(function exposeStateTransactionRepository(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.StateTransactionRepository = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function create(state) {
    if (!state || !Array.isArray(state.transactions) || !Array.isArray(state.accounts)) {
      throw new TypeError('A valid application state is required');
    }
    return Object.freeze({
      findByAccount(accountId) {
        return state.transactions.filter(transaction => transaction.accountId === accountId);
      },
      findAccount(accountId) {
        return state.accounts.find(account => account.id === accountId) || null;
      },
      findRecurringTemplates() {
        return Array.isArray(state.recurringTemplates) ? state.recurringTemplates : [];
      }
    });
  }

  return Object.freeze({ create });
});
