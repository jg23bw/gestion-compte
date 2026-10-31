/**
 * Application use case for generating recurring transactions.
 * Undo, persistence markers and cloud synchronization remain at the UI boundary.
 */
(function exposeRecurringCommands(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.RecurringCommands = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function generateTransactions({ templates, transactions, month }) {
    return RecurringRules.buildTransactionsForMonth(templates, transactions, month);
  }
  return Object.freeze({ generateTransactions });
});
