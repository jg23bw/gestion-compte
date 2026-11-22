'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Rules = require('../../../src/domain/finance/pro-remuneration-rules.js');

const transactions = [
  { id: 'past-charge', accountId: 'pro', date: '2026-10-20', amount: -1500, isPaid: true, label: 'Comptabilité' },
  { id: 'unpaid-past', accountId: 'pro', date: '2026-10-25', amount: -900, isPaid: false, label: 'À pointer' },
  { id: 'internal-transfer', accountId: 'pro', date: '2026-10-22', amount: -500, isPaid: true, transferId: 'transfer-1', label: 'Virement personnel' },
  { id: 'future-charge', accountId: 'pro', date: '2026-11-15', amount: -800, isPaid: false, label: 'Assurance' },
  { id: 'future-urssaf', accountId: 'pro', date: '2026-11-18', amount: -400, isPaid: false, professionalCategory: 'social', label: 'URSSAF' },
  { id: 'too-far-future', accountId: 'pro', date: '2026-12-10', amount: -1200, isPaid: false, label: 'Charge du cycle suivant' },
  { id: 'other-account', accountId: 'personal', date: '2026-10-21', amount: -3000, isPaid: true, label: 'Autre compte' }
];

test('calculates remuneration, social provision and transfer with historical and future charges', () => {
  const result = Rules.calculate({
    transactions, accountId: 'pro', previousInvoiceDate: '2026-10-05',
    invoiceDate: '2026-11-05', caHt: 12000, socialRate: 45, cashBalance: 15000
  });
  assert.equal(result.pastCharges, 1500);
  assert.equal(result.availableResult, 10500);
  assert.equal(result.remuneration, 7241.38);
  assert.equal(result.socialProvision, 3258.62);
  assert.equal(result.futureCharges, 800);
  assert.equal(result.futurePeriodEndDate, '2026-12-05');
  assert.equal(result.transferAmount, 6441.38);
  assert.equal(result.cashRemaining, 7758.62);
  assert.deepEqual(result.pastChargeItems.map(item => item.id), ['past-charge']);
  assert.deepEqual(result.futureChargeItems.map(item => item.id), ['future-charge']);
});

test('does not propose remuneration when historical charges exceed turnover', () => {
  const result = Rules.calculate({
    transactions, accountId: 'pro', previousInvoiceDate: '2026-10-05',
    invoiceDate: '2026-11-05', caHt: 1000, socialRate: 45
  });
  assert.equal(result.availableResult, -500);
  assert.equal(result.remuneration, 0);
  assert.equal(result.socialProvision, 0);
  assert.equal(result.transferAmount, 0);
  assert.equal(result.resultIsNegative, true);
});

test('shows a future charge shortfall without returning a negative transfer', () => {
  const result = Rules.calculate({
    transactions: [{ id: 'future', accountId: 'pro', date: '2026-11-15', amount: -9000, isPaid: false }],
    accountId: 'pro', previousInvoiceDate: '2026-10-05',
    invoiceDate: '2026-11-05', caHt: 12000, socialRate: 45
  });
  assert.equal(result.transferAmount, 0);
  assert.equal(result.futureShortfall, 7241.38);
  assert.equal(result.futureChargesExceedRemuneration, true);
});

test('rejects reversed invoice dates and invalid contribution rates', () => {
  assert.throws(() => Rules.calculate({
    accountId: 'pro', previousInvoiceDate: '2026-11-05',
    invoiceDate: '2026-10-05', caHt: 1000
  }), /postérieure/);
  assert.throws(() => Rules.calculate({
    accountId: 'pro', previousInvoiceDate: '2026-10-05',
    invoiceDate: '2026-11-05', caHt: 1000, socialRate: 145
  }), /compris/);
});

test('normalizes stored simulations and ignores malformed entries', () => {
  const rows = Rules.normalizeSimulations([
    { id: 'ok', accountId: 'pro', invoiceDate: '2026-11-05', caHt: 12000, remuneration: '1000' },
    { id: 'bad', accountId: 'pro', invoiceDate: 'not-a-date', caHt: 12000 }
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].remuneration, 1000);
});
