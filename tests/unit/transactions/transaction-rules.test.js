'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../../../src/domain/transactions/transaction-rules.js');

const tx = (id, overrides = {}) => ({
  id, accountId: 'bank-1', date: '2026-01-01', createdAt: 1,
  amount: 0, label: 'Opération', ...overrides
});

test('manual ordering takes precedence over date ordering', () => {
  const rows = [
    tx('later', { sortOrder: 2, date: '2026-02-01' }),
    tx('first', { sortOrder: 1, date: '2026-01-01' })
  ];
  assert.deepEqual(rules.sortAccountTransactions(rows, 'bank-1').map(row => row.id), ['first', 'later']);
});

test('transactions with manual order precede rows without one', () => {
  const rows = [tx('unset', { date: '2026-12-01' }), tx('manual', { sortOrder: 8 })];
  assert.deepEqual(rows.sort(rules.transactionOrder).map(row => row.id), ['manual', 'unset']);
});

test('transactions without manual order sort newest date and creation first', () => {
  const rows = [
    tx('older', { date: '2026-01-01', createdAt: 9 }),
    tx('newer', { date: '2026-01-02', createdAt: 1 }),
    tx('same-date-old', { date: '2026-01-02', createdAt: 2 })
  ];
  assert.deepEqual(rows.sort(rules.transactionOrder).map(row => row.id), ['same-date-old', 'newer', 'older']);
});

test('account transaction sorting filters out other accounts', () => {
  const rows = [tx('a'), tx('b', { accountId: 'bank-2' })];
  assert.deepEqual(rules.sortAccountTransactions(rows, 'bank-1').map(row => row.id), ['a']);
});

test('balance starts with opening balance and includes positive and negative transactions', () => {
  assert.equal(rules.balanceAt(100, [tx('in', { amount: 50 }), tx('out', { amount: -20 })]), 130);
});

test('balance at date excludes future transactions and includes the boundary date', () => {
  assert.equal(rules.balanceAt(100, [
    tx('before', { date: '2026-01-01', amount: 10 }),
    tx('boundary', { date: '2026-01-10', amount: -5 }),
    tx('after', { date: '2026-01-11', amount: 100 })
  ], '2026-01-10'), 105);
});

test('professional recurring classification requires a recurring origin', () => {
  assert.equal(rules.professionalRecurringKind(tx('manual', { label: 'TVA mensuelle' })), null);
  assert.equal(rules.professionalRecurringKind(tx('generated', { label: 'TVA mensuelle', recurringKey: '2026-01' })), 'vat');
});

test('professional recurring classification prefers the template label', () => {
  const transaction = tx('generated', { label: 'Autre libellé', recurringTemplateId: 'template-1' });
  assert.equal(rules.professionalRecurringKind(transaction, [{ id: 'template-1', label: 'Charges sociales URSSAF' }]), 'social');
});

test('professional recurring classification is case and accent locale insensitive for known labels', () => {
  assert.equal(rules.professionalRecurringKind(tx('vat', { recurringKey: 'k', label: 'TVA' })), 'vat');
  assert.equal(rules.professionalRecurringKind(tx('margin', { recurringKey: 'k', label: 'Marge de sécurité' })), 'margin');
});

test('adjusted provision amount uses recurring template amount, including zero real amount', () => {
  const transaction = tx('provision', { amount: 0, recurringTemplateId: 'vat-template' });
  const templates = [{ id: 'vat-template', label: 'TVA', amount: 425.5 }];
  assert.equal(rules.professionalAdjustedAmount(transaction, templates), 425.5);
  assert.equal(rules.professionalAdjustedDelta(transaction, templates), -425.5);
});

test('adjusted margin is deducted only from adjusted balance', () => {
  const account = { id: 'bank-1', opening: 1000, netOpening: 1000 };
  const transactions = [
    tx('real', { amount: 200, date: '2026-01-01' }),
    tx('margin', { amount: 0, date: '2026-01-02', recurringTemplateId: 'margin-template' })
  ];
  const templates = [{ id: 'margin-template', label: 'Marge sécurité', amount: 150 }];
  assert.equal(rules.balanceAt(account.opening, transactions), 1200);
  assert.equal(rules.professionalAdjustedBalanceAt(account, transactions, templates, '2026-01-31'), 1050);
});

test('ordinary recurring transaction keeps its signed amount', () => {
  const transaction = tx('rent', { amount: -75, recurringKey: '2026-01', label: 'Loyer' });
  assert.equal(rules.professionalAdjustedDelta(transaction), -75);
});

test('professional balance uses netOpening when provided and respects date cutoff', () => {
  const account = { id: 'bank-1', opening: 100, netOpening: 80 };
  const transactions = [
    tx('current', { amount: 20, date: '2026-01-01' }),
    tx('future', { amount: 500, date: '2026-02-01' })
  ];
  assert.equal(rules.professionalAdjustedBalanceAt(account, transactions, [], '2026-01-31'), 100);
});

test('professional amounts calculate VAT, social charges and net for positive income', () => {
  const result = rules.calculateProfessionalAmounts({ vatRate: 20, socialRate: 22 }, 120);
  assert.equal(result.vat, 20);
  assert.equal(result.social, 22);
  assert.equal(result.net, 78);
});

test('professional rates are clamped to the 0-100 percent range', () => {
  assert.deepEqual(
    rules.calculateProfessionalAmounts({ vatRate: 150, socialRate: -10 }, 100),
    { vat: 50, social: 0, net: 50 }
  );
});

test('non-positive professional amount has no VAT or social charge', () => {
  assert.deepEqual(
    rules.calculateProfessionalAmounts({ vatRate: 20, socialRate: 22 }, -100),
    { vat: 0, social: 0, net: -100 }
  );
});

test('transaction record keeps the existing manual order when editing in the same account', () => {
  const previous = tx('edit', { sortOrder: 4, isPaid: true, createdAt: 10 });
  const record = rules.createTransactionRecord({
    transactions: [previous, tx('other', { sortOrder: 8 })],
    previous, id: 'edit', accountId: 'bank-1', date: '2026-02-01',
    amount: 25, label: 'Modifiée', createdAt: 99
  });
  assert.equal(record.sortOrder, 4);
  assert.equal(record.isPaid, true);
  assert.equal(record.createdAt, 10);
  assert.equal(record.amount, 25);
});

test('transaction record gets the next manual order for a new account placement', () => {
  const record = rules.createTransactionRecord({
    transactions: [tx('a', { sortOrder: 2 }), tx('b', { sortOrder: 7 })],
    previous: tx('edit', { sortOrder: 1, accountId: 'bank-2' }),
    id: 'edit', accountId: 'bank-1', date: '2026-02-01',
    amount: -5, label: 'Déplacée', createdAt: 100
  });
  assert.equal(record.sortOrder, 8);
  assert.equal(record.isPaid, false);
});

test('transaction record assigns order one when the account has no other transactions', () => {
  const record = rules.createTransactionRecord({
    transactions: [], id: 'new', accountId: 'bank-1',
    date: '2026-02-01', amount: 0, label: 'Nouvelle', createdAt: 100
  });
  assert.equal(record.sortOrder, 1);
});
