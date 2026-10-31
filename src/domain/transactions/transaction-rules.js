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
    const ao = Number.isFinite(Number(a.sortOrder)) && a.sortOrder !== null ? Number(a.sortOrder) : null;
    const bo = Number.isFinite(Number(b.sortOrder)) && b.sortOrder !== null ? Number(b.sortOrder) : null;
    if (ao !== null && bo !== null && ao !== bo) return ao - bo;
    if (ao !== null && bo === null) return -1;
    if (ao === null && bo !== null) return 1;
    return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
  }

  function sortAccountTransactions(transactions, accountId) {
    return transactions.filter(transaction => transaction.accountId === accountId).sort(transactionOrder);
  }

  function balanceAt(openingBalance, transactions, untilDate = null) {
    return Number(openingBalance || 0) + transactions
      .filter(transaction => !untilDate || transaction.date <= untilDate)
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  }

  function professionalRecurringKind(transaction, recurringTemplates = []) {
    if (!transaction.recurringTemplateId && !transaction.recurringKey) return null;
    const template = recurringTemplates.find(item => item.id === transaction.recurringTemplateId);
    const label = String(template?.label || transaction.label || '').trim().toLocaleLowerCase('fr');
    if (/^tva(?:\s|$)/i.test(label)) return 'vat';
    if (/^charges sociales(?:\s|$)/i.test(label)) return 'social';
    if (/^marge(?:\s|$)/i.test(label)) return 'margin';
    return null;
  }

  function professionalAdjustedAmount(transaction, recurringTemplates = []) {
    const kind = professionalRecurringKind(transaction, recurringTemplates);
    if (kind) {
      const template = recurringTemplates.find(item => item.id === transaction.recurringTemplateId);
      return Number(template?.amount ?? transaction.amount) || 0;
    }
    return Number(transaction.amount) || 0;
  }

  function professionalAdjustedDelta(transaction, recurringTemplates = []) {
    const kind = professionalRecurringKind(transaction, recurringTemplates);
    const amount = professionalAdjustedAmount(transaction, recurringTemplates);
    return kind ? -Math.abs(amount) : amount;
  }

  function professionalAdjustedBalanceAt(account, transactions, recurringTemplates = [], untilDate) {
    const opening = Number(account.netOpening ?? account.opening) || 0;
    return opening + sortAccountTransactions(transactions, account.id)
      .filter(transaction => transaction.date <= untilDate)
      .reduce((sum, transaction) => sum + professionalAdjustedDelta(transaction, recurringTemplates), 0);
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
    calculateProfessionalAmounts,
    createTransactionRecord
  });
});
