/**
 * Application use cases for recurring transaction generation.
 * State mutation, undo, cloud synchronization and rendering remain at the UI boundary.
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

  function inspectMonth({ transactions, month, generatedMonthsRepository }) {
    if (!/^\d{4}-\d{2}$/.test(month)) return { status: 'invalid-month' };
    const alreadyGenerated = transactions.some(transaction =>
      transaction.recurringKey && String(transaction.date || '').slice(0, 7) === month
    );
    // Actual transactions are authoritative; stale local markers must not block regeneration.
    if (alreadyGenerated) {
      generatedMonthsRepository.add(month);
      return { status: 'already-generated' };
    }
    generatedMonthsRepository.remove(month);
    return { status: 'not-generated' };
  }

  function prepareGeneration({ templates, transactions, month, generatedMonthsRepository }) {
    const inspection = inspectMonth({ transactions, month, generatedMonthsRepository });
    if (inspection.status !== 'not-generated') return inspection;
    const additions = generateTransactions({ templates, transactions, month });
    if (!additions.length) return { status: 'no-additions', additions: [] };
    return { status: 'ready', additions };
  }

  function commitGeneration({ additions, transactions, month, generatedMonthsRepository, beforeMutation }) {
    if (!Array.isArray(additions) || additions.length === 0) {
      return { status: 'no-additions', count: 0 };
    }
    if (!Array.isArray(transactions) || !generatedMonthsRepository ||
        typeof generatedMonthsRepository.add !== 'function') {
      throw new TypeError('Transactions and a generated-months repository are required');
    }
    // Undo snapshot must be captured before either the transaction list or marker changes.
    if (typeof beforeMutation === 'function') beforeMutation();
    transactions.push(...additions);
    generatedMonthsRepository.add(month);
    return { status: 'committed', count: additions.length };
  }

  return Object.freeze({ generateTransactions, inspectMonth, prepareGeneration, commitGeneration });
});
