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
    const getState = typeof state === 'function' ? state : () => state;
    const initialState = getState();
    if (!initialState || !Array.isArray(initialState.transactions) || !Array.isArray(initialState.accounts)) {
      throw new TypeError('A valid application state is required');
    }
    return Object.freeze({
      findByAccount(accountId) {
        return getState().transactions.filter(transaction => transaction.accountId === accountId);
      },
      findAccount(accountId) {
        return getState().accounts.find(account => account.id === accountId) || null;
      },
      findRecurringTemplates() {
        const templates = getState().recurringTemplates;
        return Array.isArray(templates) ? templates : [];
      },
      findAll() {
        return getState().transactions;
      },
      findById(id) {
        return getState().transactions.find(transaction => transaction.id === id) || null;
      },
      save(transaction) {
        const current = getState().transactions;
        const index = current.findIndex(item => item.id === transaction.id);
        if (index < 0) current.push(transaction);
        else current[index] = transaction;
        return transaction;
      },
      delete(id) {
        const current = getState().transactions;
        const index = current.findIndex(transaction => transaction.id === id);
        if (index < 0) return null;
        return current.splice(index, 1)[0];
      }
    });
  }

  return Object.freeze({ create });
});
