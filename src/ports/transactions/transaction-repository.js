/**
 * Transaction repository port.
 *
 * Implementations must return transaction objects in the application's
 * canonical shape. Dates are calendar dates (YYYY-MM-DD).
 *
 * @typedef {Object} TransactionRepository
 * @property {(accountId: string) => Object[]} findByAccount
 * @property {(accountId: string, untilDate?: string|null) => Object|null} findAccount
 * @property {() => Object[]} findRecurringTemplates
 * @property {() => Object[]} findAll
 * @property {(id: string) => Object|null} findById
 * @property {(transaction: Object) => Object} save
 * @property {(id: string) => Object|null} delete
 */
(function exposeTransactionRepositoryPort(root) {
  const api = Object.freeze({
    isTransactionRepository(value) {
      return Boolean(value
        && typeof value.findByAccount === 'function'
        && typeof value.findAccount === 'function'
        && typeof value.findRecurringTemplates === 'function'
        && typeof value.findAll === 'function'
        && typeof value.findById === 'function'
        && typeof value.save === 'function'
        && typeof value.delete === 'function');
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TransactionRepositoryPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
