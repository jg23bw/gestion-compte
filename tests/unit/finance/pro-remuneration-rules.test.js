'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Rules = require('../../../src/domain/finance/pro-remuneration-rules.js');

const transactions = [
  { id: 'past-charge', accountId: 'pro', date: '2026-10-20', amount: -1500, isPaid: true, label: 'Comptabilité' },
  { id: 'same-day-previous-invoice', accountId: 'pro', date: '2026-10-05', amount: -1020, isPaid: true, label: 'Crédit Mercedes' },
  { id: 'unpaid-past', accountId: 'pro', date: '2026-10-25', amount: -900, isPaid: false, label: 'À pointer' },
  { id: 'internal-transfer', accountId: 'pro', date: '2026-10-22', amount: -500, isPaid: true, transferId: 'transfer-1', label: 'Virement personnel' },
  { id: 'external-personal-transfer', accountId: 'pro', date: '2026-10-26', amount: -1800, isPaid: true, label: 'Vers Fortunéo' },
  { id: 'paid-social', accountId: 'pro', date: '2026-10-23', amount: -12657, isPaid: true, professionalCategory: 'social', label: 'Paiement charges sociales' },
  { id: 'paid-vat', accountId: 'pro', date: '2026-10-24', amount: -2500, isPaid: true, professionalCategory: 'vat', label: 'Paiement TVA' },
  { id: 'future-charge', accountId: 'pro', date: '2026-11-15', amount: -800, isPaid: false, label: 'Assurance' },
  { id: 'future-external-transfer', accountId: 'pro', date: '2026-11-16', amount: -900, isPaid: false, label: 'Vers compte personnel' },
  { id: 'future-urssaf', accountId: 'pro', date: '2026-11-18', amount: -400, isPaid: false, professionalCategory: 'social', label: 'URSSAF' },
  { id: 'future-vat', accountId: 'pro', date: '2026-11-19', amount: -700, isPaid: false, professionalCategory: 'vat', label: 'TVA à payer' },
  { id: 'too-far-future', accountId: 'pro', date: '2026-12-10', amount: -1200, isPaid: false, label: 'Charge du cycle suivant' },
  { id: 'other-account', accountId: 'personal', date: '2026-10-21', amount: -3000, isPaid: true, label: 'Autre compte' }
];

test('calculates remuneration, social provision and transfer with historical and future charges', () => {
  const result = Rules.calculate({
    transactions, accountId: 'pro', previousInvoiceDate: '2026-10-05',
    invoiceDate: '2026-11-05', caHt: 12000, socialRate: 45, cashBalance: 15000
  });
  assert.equal(result.pastCharges, 3420);
  assert.equal(result.availableResult, 8580);
  assert.equal(result.remuneration, 5917.24);
  assert.equal(result.socialProvision, 2662.76);
  assert.equal(result.futureCharges, 800);
  assert.equal(result.futurePeriodEndDate, '2026-12-05');
  assert.equal(result.transferAmount, 5117.24);
  assert.equal(result.cashRemaining, 9082.76);
  assert.deepEqual(result.pastChargeItems.map(item => item.id), ['unpaid-past', 'past-charge', 'same-day-previous-invoice']);
  assert.equal(result.pastChargeItems.some(item => item.id === 'external-personal-transfer'), false);
  assert.deepEqual(result.futureChargeItems.map(item => item.id), ['future-charge']);
  assert.equal(result.futureChargeItems.some(item => item.id === 'future-external-transfer'), false);
});

test('does not propose remuneration when historical charges exceed turnover', () => {
  const result = Rules.calculate({
    transactions, accountId: 'pro', previousInvoiceDate: '2026-10-05',
    invoiceDate: '2026-11-05', caHt: 1000, socialRate: 45
  });
  assert.equal(result.availableResult, -2420);
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
  assert.equal(result.futureShortfall, 724.14);
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

test('uses invoice rows as exclusive bounds and table order for same-date operations', () => {
  const ledger = [
    { id: 'current-invoice', accountId: 'pro', date: '2026-11-05', amount: 12000, label: 'Facture 12', professionalOperationType: 'invoice', isPaid: false, createdAt: 500 },
    { id: 'same-day-after-current', accountId: 'pro', date: '2026-11-05', amount: -200, label: 'Frais après facture', isPaid: true, createdAt: 400 },
    { id: 'same-day-before-previous', accountId: 'pro', date: '2026-10-05', amount: -999, label: 'Frais date précédente', isPaid: true, createdAt: 75 },
    { id: 'previous-invoice', accountId: 'pro', date: '2026-10-05', amount: 9000, label: 'Facture 11', professionalOperationType: 'invoice', isPaid: true, createdAt: 50 },
    { id: 'between-invoices', accountId: 'pro', date: '2026-10-20', amount: -350, label: 'Comptabilité', isPaid: true, createdAt: 200 },
    { id: 'same-day-after-previous', accountId: 'pro', date: '2026-10-05', amount: -150, label: 'À exclure avant facture précédente', isPaid: true, createdAt: 25 }
  ];
  const result = Rules.calculate({ transactions: ledger, accountId: 'pro', previousInvoiceDate: '2026-10-05', invoiceDate: '2026-11-05', caHt: 12000, socialRate: 45 });
  assert.deepEqual(result.pastChargeItems.map(item => item.id), ['same-day-after-current', 'between-invoices', 'same-day-before-previous']);
  assert.equal(result.pastCharges, 1549);
});

test('recognizes legacy invoice labels only when they match Facture XX and are positive', () => {
  assert.equal(Rules.isInvoice({ label: 'Facture 23', amount: 1200 }), true);
  assert.equal(Rules.isInvoice({ label: '  facture 004 ', amount: 1 }), true);
  assert.equal(Rules.isInvoice({ label: 'Facture client 23', amount: 1200 }), false);
  assert.equal(Rules.isInvoice({ label: 'Facture 23', amount: -1200 }), false);
});

test('future charges use rows below the current invoice until the next invoice', () => {
  const ledger = [
    { id: 'current', accountId: 'pro', date: '2026-11-05', amount: 10000, label: 'Facture 12', professionalOperationType: 'invoice', isPaid: false, createdAt: 500 },
    { id: 'future-one', accountId: 'pro', date: '2026-11-05', amount: -300, label: 'Assurance', isPaid: false, createdAt: 400 },
    { id: 'next-invoice', accountId: 'pro', date: '2026-10-05', amount: 9000, label: 'Facture 11', professionalOperationType: 'invoice', isPaid: true, createdAt: 300 },
    { id: 'after-next-invoice', accountId: 'pro', date: '2026-10-04', amount: -500, label: 'Cycle précédent', isPaid: true, createdAt: 200 }
  ];
  const result = Rules.calculate({ transactions: ledger, accountId: 'pro', previousInvoiceDate: '2026-10-05', invoiceDate: '2026-11-05', caHt: 10000 });
  assert.deepEqual(result.futureChargeItems.map(item => item.id), ['future-one']);
  assert.equal(result.futureCharges, 300);
  assert.equal(result.futurePeriodEndDate, '2026-10-05');
});


test('finds the two latest invoices and converts TTC to HT at 20 percent', () => {
  const ledger = [
    { id: 'invoice-new', accountId: 'pro', date: '2026-11-05', amount: 12000, label: 'Facture 12', professionalOperationType: 'invoice', isPaid: false, createdAt: 500 },
    { id: 'invoice-old', accountId: 'pro', date: '2026-10-05', amount: 9000, label: 'Facture 11', professionalOperationType: 'invoice', isPaid: true, createdAt: 300 },
    { id: 'ordinary-income', accountId: 'pro', date: '2026-09-20', amount: 4000, label: 'Autre entrée', professionalOperationType: 'expense', isPaid: true }
  ];
  const pair = Rules.findLatestInvoicePair(ledger, 'pro');
  assert.equal(pair.currentInvoice.id, 'invoice-new');
  assert.equal(pair.previousInvoice.id, 'invoice-old');
  assert.equal(pair.invoiceTtc, 12000);
  assert.equal(pair.caHt, 10000);
  assert.equal(pair.currentInvoicePaid, false);
});

test('finds an unencashed invoice as a period marker without counting it as cash', () => {
  const ledger = [
    { id: 'new', accountId: 'pro', date: '2026-11-05', amount: 6000, label: 'Facture 2', professionalOperationType: 'invoice', isPaid: false },
    { id: 'old', accountId: 'pro', date: '2026-10-05', amount: 3000, label: 'Facture 1', professionalOperationType: 'invoice', isPaid: true }
  ];
  const pair = Rules.findLatestInvoicePair(ledger, 'pro');
  assert.equal(pair.currentInvoicePaid, false);
  assert.equal(pair.caHt, 5000);
});
