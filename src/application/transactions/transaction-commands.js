/**
 * Write-side transaction use cases.
 * State changes go through the repository port; UI concerns (undo, rendering,
 * cloud sync flags) remain in the legacy composition layer for now.
 */
(function exposeTransactionCommands(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TransactionCommands = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function create({ repository, domain }) {
    if (!repository || !domain) throw new TypeError('repository and domain are required');
    return Object.freeze({
      findById(id) {
        return repository.findById(id);
      },
      save(input) {
        const previous = input.id ? repository.findById(input.id) : null;
        const transaction = domain.createTransactionRecord({
          transactions: repository.findAll(),
          previous,
          ...input
        });
        repository.save(transaction);
        return transaction;
      },
      remove(id) {
        return repository.delete(id);
      },
      setPaid(id, { isPaid, date } = {}) {
        const previous = repository.findById(id);
        if (!previous) return null;
        const transaction = {
          ...previous,
          ...(date ? { date } : {}),
          isPaid: isPaid === true
        };
        repository.save(transaction);
        return transaction;
      }
    });
  }

  return Object.freeze({ create });
});
