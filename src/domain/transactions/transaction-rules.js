/**
 * Pure transaction and professional-account rules.
 *
 * This module has no DOM, persistence, clock, or network dependency.
 * It is exposed as a browser global for the current classic-script entrypoint
 * and as CommonJS for the Node test runner during the incremental migration.
 */
(function exposeTransactionRules(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TransactionRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createTransactionRules() {
  'use strict';

  function transactionOrder(a, b) {
    return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
  }

  function sortAccountTransactions(transactions, accountId) {
    return transactions.filter(transaction => transaction.accountId === accountId).sort(transactionOrder);
  }

  function balanceAt(openingBalance, transactions, untilDate = null) {
    return Number(openingBalance || 0) + transactions
      .filter(transaction => !untilDate || transaction.date <= untilDate)
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  }

  // Classification explicite : aucun calcul ne dépend du libellé ou du modèle récurrent.
  function professionalRecurringKind(transaction) {
    if (transaction.professionalCategory === 'provision') return 'margin';
    if (transaction.professionalCategory === 'vat') return 'vat';
    if (transaction.professionalCategory === 'social') return 'social';
    return null;
  }

  function professionalAdjustedAmount(transaction) {
    return Number(transaction.professionalAmount ?? transaction.amount) || 0;
  }

  function professionalAdjustedDelta(transaction) {
    return professionalAdjustedAmount(transaction);
  }

  function professionalAdjustedBalanceAt(account, transactions, recurringTemplates = [], untilDate) {
    // The professional balance starts from the net opening amount when available.
    // Fall back to the regular opening balance for legacy accounts.
    const opening = Number(account.netOpening ?? account.opening) || 0;
    return opening + sortAccountTransactions(transactions, account.id)
      .filter(transaction => transaction.date <= untilDate)
      .reduce((sum, transaction) => sum + professionalAdjustedDelta(transaction, recurringTemplates), 0);
  }

  function professionalAdjustedBalanceAfterTransaction(account, transactions, recurringTemplates = [], transactionId) {
    const opening = Number(account.netOpening ?? account.opening) || 0;
    let balance = opening;
    for (const transaction of sortAccountTransactions(transactions, account.id)) {
      balance += professionalAdjustedDelta(transaction, recurringTemplates);
      if (transaction.id === transactionId) return balance;
    }
    return balance;
  }

  function createTransactionRecord({ transactions, previous = null, id, accountId, date, amount, label, createdAt }) {
    const oldOrder = previous?.sortOrder;
    const keepsManualOrder = previous
      && previous.accountId === accountId
      && Number.isFinite(Number(oldOrder))
      && oldOrder !== null;
    const nextOrder = keepsManualOrder
      ? Number(oldOrder)
      : Math.max(0, ...transactions
        .filter(transaction => transaction.accountId === accountId && transaction.id !== id)
        .map(transaction => Number(transaction.sortOrder) || 0)) + 1;
    return {
      ...(previous || {}),
      id,
      accountId,
      date,
      amount,
      label,
      isPaid: previous?.isPaid === true,
      sortOrder: nextOrder,
      createdAt: previous?.createdAt || createdAt
    };
  }

  function calculateProfessionalAmounts(account, amount) {
    const vatRate = Math.min(100, Math.max(0, Number(account.vatRate) || 0)) / 100;
    const socialRate = Math.min(100, Math.max(0, Number(account.socialRate) || 0)) / 100;
    if (amount > 0) {
      const beforeTax = amount / (1 + vatRate);
      return {
        vat: amount - beforeTax,
        social: beforeTax * socialRate,
        net: beforeTax * (1 - socialRate)
      };
    }
    return { vat: 0, social: 0, net: amount };
  }

  return Object.freeze({
    transactionOrder,
    sortAccountTransactions,
    balanceAt,
    professionalRecurringKind,
    professionalAdjustedAmount,
    professionalAdjustedDelta,
    professionalAdjustedBalanceAt,
    professionalAdjustedBalanceAfterTransaction,
    calculateProfessionalAmounts,
    createTransactionRecord
  });
});
