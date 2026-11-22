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
  assert.equal(result.pastCharges, 2400);
  assert.equal(result.availableResult, 9600);
  assert.equal(result.remuneration, 6620.69);
  assert.equal(result.socialProvision, 2979.31);
  assert.equal(result.futureCharges, 800);
  assert.equal(result.futurePeriodEndDate, '2026-12-05');
  assert.equal(result.transferAmount, 5820.69);
  assert.equal(result.cashRemaining, null);
  assert.deepEqual(result.pastChargeItems.map(item => item.id), ['past-charge', 'unpaid-past']);
  assert.equal(result.pastChargeItems.some(item => item.id === 'external-personal-transfer'), false);
  assert.deepEqual(result.futureChargeItems.map(item => item.id), ['future-charge']);
  assert.equal(result.futureChargeItems.some(item => item.id === 'future-external-transfer'), false);
});

test('does not propose remuneration when historical charges exceed turnover', () => {
  const result = Rules.calculate({
    transactions, accountId: 'pro', previousInvoiceDate: '2026-10-05',
    invoiceDate: '2026-11-05', caHt: 1000, socialRate: 45
  });
  assert.equal(result.availableResult, -1400);
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

test('uses both invoice rows as exclusive chronological bounds and table order for same-day operations', () => {
  const ledger = [
    { id: 'current-invoice', accountId: 'pro', date: '2026-11-05', amount: 12000, label: 'Facture 12', professionalOperationType: 'invoice', isPaid: false, createdAt: 500 },
    { id: 'same-day-before-current', accountId: 'pro', date: '2026-11-05', amount: -200, label: 'Frais avant facture', isPaid: true, createdAt: 400 },
    { id: 'same-day-before-previous', accountId: 'pro', date: '2026-10-05', amount: -999, label: 'Frais avant facture précédente', isPaid: true, createdAt: 75 },
    { id: 'previous-invoice', accountId: 'pro', date: '2026-10-05', amount: 9000, label: 'Facture 11', professionalOperationType: 'invoice', isPaid: true, createdAt: 50 },
    { id: 'between-invoices', accountId: 'pro', date: '2026-10-20', amount: -350, label: 'Comptabilité', isPaid: true, createdAt: 200 },
    { id: 'same-day-after-previous', accountId: 'pro', date: '2026-10-05', amount: -150, label: 'Frais après facture précédente', isPaid: true, createdAt: 25 }
  ];
  const result = Rules.calculate({
    transactions: ledger, accountId: 'pro',
    previousInvoiceDate: '2026-10-05', invoiceDate: '2026-11-05',
    caHt: 12000, socialRate: 45
  });
  assert.deepEqual(result.pastChargeItems.map(item => item.id), ['same-day-before-previous', 'between-invoices', 'same-day-before-current']);
  assert.equal(result.pastCharges, 1549);
  assert.deepEqual(result.futureChargeItems.map(item => item.id), []);
  assert.equal(result.futureCharges, 0);
});

test('recognizes legacy invoice labels only when they match Facture XX and are positive', () => {
  assert.equal(Rules.isInvoice({ label: 'Facture 23', amount: 1200 }), true);
  assert.equal(Rules.isInvoice({ label: '  facture 004 ', amount: 1 }), true);
  assert.equal(Rules.isInvoice({ label: 'Facture client 23', amount: 1200 }), false);
  assert.equal(Rules.isInvoice({ label: 'Facture 23', amount: -1200 }), false);
});

test('future charges include every expense after the current invoice until the next invoice, regardless of pointage', () => {
  const ledger = [
    { id: 'current', accountId: 'pro', date: '2026-11-05', amount: 10000, label: 'Facture 12', professionalOperationType: 'invoice', isPaid: false, createdAt: 500 },
    { id: 'future-one', accountId: 'pro', date: '2026-11-05', amount: -300, label: 'Assurance', isPaid: false, createdAt: 600 },
    { id: 'next-invoice', accountId: 'pro', date: '2026-10-05', amount: 9000, label: 'Facture 11', professionalOperationType: 'invoice', isPaid: true, createdAt: 300 },
    { id: 'after-next-invoice', accountId: 'pro', date: '2026-10-04', amount: -500, label: 'Cycle précédent', isPaid: true, createdAt: 200 }
  ];
  const result = Rules.calculate({ transactions: ledger, accountId: 'pro', previousInvoiceDate: '2026-10-05', invoiceDate: '2026-11-05', caHt: 10000 });
  assert.deepEqual(result.futureChargeItems.map(item => item.id), ['future-one']);
  assert.equal(result.futureCharges, 300);
  assert.equal(result.futurePeriodEndDate, '2026-12-05');
});


test('reproduces invoice 10 to invoice 11: mixed pointage never moves a charge across invoice boundaries', () => {
  const ledger = [
    { id: 'invoice-11', accountId: 'pro', date: '2026-12-01', amount: 15840, label: 'Facture 11', professionalOperationType: 'invoice', isPaid: false, createdAt: 900 },
    { id: 'future-dec-02-unpaid', accountId: 'pro', date: '2026-12-02', amount: -40, label: 'Electra+', isPaid: false, createdAt: 800 },
    { id: 'future-margin-11', accountId: 'pro', date: '2026-12-03', amount: -500, professionalAmount: -500, label: 'Marge 11 (bilan + AEN...)', isPaid: false, createdAt: 750 },
    { id: 'future-dec-02-paid', accountId: 'pro', date: '2026-12-02', amount: -1020, label: 'Crédit Mercedes', isPaid: true, createdAt: 700 },
    { id: 'future-dec-30', accountId: 'pro', date: '2026-12-30', amount: -118.8, label: 'Frais I-expert', isPaid: false, createdAt: 600 },
    { id: 'past-nov-30-paid', accountId: 'pro', date: '2026-11-30', amount: -25, label: 'Charge pointée', isPaid: true, createdAt: 500 },
    { id: 'past-nov-30-unpaid', accountId: 'pro', date: '2026-11-30', amount: -118.8, label: 'Frais I-expert', isPaid: false, createdAt: 400 },
    { id: 'past-margin-10', accountId: 'pro', date: '2026-11-30', amount: -500, professionalAmount: -500, label: 'Marge 10 (bilan + AEN...)', isPaid: false, createdAt: 450 },
    { id: 'past-nov-21', accountId: 'pro', date: '2026-11-21', amount: -226.4, label: 'Déplacements', isPaid: false, createdAt: 300 },
    { id: 'past-social', accountId: 'pro', date: '2026-11-20', amount: -12657, label: 'Paiement charges sociales', isPaid: true, professionalCategory: 'social', createdAt: 250 },
    { id: 'credit-mercedes-same-day-invoice10', accountId: 'pro', date: '2026-10-30', amount: -1020, label: 'Crédit Mercedes', isPaid: true, createdAt: 300 },
    { id: 'transfer-fortuneo-same-day-invoice10', accountId: 'pro', date: '2026-10-30', amount: -4510.36, label: 'Vers Fortuneo', isPaid: true, createdAt: 250 },
    { id: 'invoice-10', accountId: 'pro', date: '2026-10-30', amount: 11520, label: 'Facture 10', professionalOperationType: 'invoice', isPaid: true, createdAt: 200 },
    { id: 'before-invoice-10', accountId: 'pro', date: '2026-10-30', amount: -999, label: 'Avant facture 10', isPaid: true, createdAt: 100 }
  ];
  const pair = Rules.findLatestInvoicePair(ledger, 'pro');
  assert.equal(pair.currentInvoice.id, 'invoice-11');
  assert.equal(pair.previousInvoice.id, 'invoice-10');
  const result = Rules.calculate({
    transactions: ledger, accountId: 'pro',
    previousInvoiceDate: pair.previousInvoice.date, invoiceDate: pair.currentInvoice.date,
    previousInvoiceId: pair.previousInvoice.id, invoiceId: pair.currentInvoice.id,
    caHt: pair.caHt, invoiceTtc: pair.invoiceTtc, currentInvoicePaid: pair.currentInvoicePaid
  });
  assert.deepEqual(result.pastChargeItems.map(item => item.id), [
    'credit-mercedes-same-day-invoice10', 'past-nov-21', 'past-nov-30-paid', 'past-nov-30-unpaid'
  ]);
  assert.equal(result.pastChargeItems.some(item => item.id === 'past-margin-10'), false);
  assert.equal(result.pastCharges, 1390.2);
  assert.deepEqual(result.futureChargeItems.map(item => item.id), [
    'future-dec-02-paid', 'future-dec-02-unpaid', 'future-dec-30'
  ]);
  assert.equal(result.futureChargeItems.some(item => item.id === 'future-margin-11'), false);
  assert.equal(result.futureCharges, 1178.8);
  const pastIds = new Set(result.pastChargeItems.map(item => item.id));
  assert.equal(result.futureChargeItems.some(item => pastIds.has(item.id)), false);
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


test('optimises the transfer against the real adjusted ending balance and replaces cycle URSSAF provision', () => {
  const result = Rules.calculate({
    transactions: [
      { id: 'invoice', accountId: 'pro', date: '2026-11-05', amount: 12000, label: 'Facture 12', professionalOperationType: 'invoice', isPaid: false },
      { id: 'future-charge', accountId: 'pro', date: '2026-11-15', amount: -800, isPaid: false, label: 'Assurance' },
      { id: 'old-social-provision', accountId: 'pro', date: '2026-11-20', amount: 0, professionalAmount: -900, professionalCategory: 'social', professionalTreatment: 'provision', isPaid: false, label: 'Provision URSSAF' },
      { id: 'old-personal-transfer', accountId: 'pro', date: '2026-11-21', amount: -500, professionalAmount: -500, label: 'Vers compte personnel', isPaid: false }
    ],
    accountId: 'pro', previousInvoiceDate: '2026-10-05', invoiceDate: '2026-11-05',
    caHt: 10000, invoiceTtc: 12000, currentInvoicePaid: false,
    socialRate: 45, professionalAdjustedBalance: 5000
  });
  assert.equal(result.existingSocialProvision, 900);
  assert.equal(result.existingPersonalTransfers, 500);
  assert.ok(result.cashRemaining >= 0.01);
  const nextTransfer = roundMoneyForTest(result.transferAmount + 0.01);
  const nextRemuneration = roundMoneyForTest(nextTransfer + result.futureCharges);
  const nextSocial = roundMoneyForTest(nextRemuneration * 0.45);
  assert.ok(roundMoneyForTest(result.professionalAdjustedBalance + result.existingSocialProvision
    + result.existingPersonalTransfers - nextTransfer - nextSocial) < 0.01);
  assert.equal(result.remuneration, result.transferAmount + result.futureCharges);
  assert.equal(result.socialProvision, roundMoneyForTest(result.remuneration * 0.45));
});

test('ignores bank balance and invoice status when the real adjusted projection is supplied', () => {
  const common = {
    transactions: [{ id: 'future-charge', accountId: 'pro', date: '2026-11-15', amount: -800, isPaid: false }],
    accountId: 'pro', previousInvoiceDate: '2026-10-05', invoiceDate: '2026-11-05',
    caHt: 10000, invoiceTtc: 12000, socialRate: 45, cashBalance: 20000,
    professionalAdjustedBalance: 5000
  };
  const paid = Rules.calculate({ ...common, currentInvoicePaid: true });
  const unpaid = Rules.calculate({ ...common, currentInvoicePaid: false });
  assert.equal(paid.transferAmount, unpaid.transferAmount);
  assert.equal(paid.cashRemaining, unpaid.cashRemaining);
});

test('optimises only an additional transfer without neutralising existing transfers or URSSAF provisions', () => {
  const result = Rules.calculate({
    transactions: [
      { id: 'previous-invoice', accountId: 'pro', date: '2026-10-05', amount: 9000, label: 'Facture 11', professionalOperationType: 'invoice', isPaid: true },
      { id: 'invoice', accountId: 'pro', date: '2026-11-05', amount: 15840, label: 'Facture 12', professionalOperationType: 'invoice', isPaid: false },
      { id: 'future-charge', accountId: 'pro', date: '2026-11-30', amount: -3106.89, isPaid: false, label: 'Charges déjà saisies' },
      { id: 'old-social-provision', accountId: 'pro', date: '2026-11-20', amount: 0, professionalAmount: -6217.67, professionalCategory: 'social', professionalTreatment: 'provision', isPaid: false, label: 'Provision URSSAF existante' },
      { id: 'old-personal-transfer', accountId: 'pro', date: '2026-11-21', amount: -10710.16, professionalAmount: -10710.16, isPaid: false, label: 'Vers compte personnel' }
    ],
    accountId: 'pro', previousInvoiceDate: '2026-10-05', invoiceDate: '2026-11-05',
    previousInvoiceId: 'previous-invoice', invoiceId: 'invoice',
    caHt: 13200, invoiceTtc: 15840, socialRate: 45,
    professionalAdjustedBalance: 288.03
  });
  assert.equal(result.existingSocialProvision, 6217.67);
  assert.equal(result.existingPersonalTransfers, 10710.16);
  assert.equal(result.transferAmount, 198.63);
  assert.equal(result.socialProvision, 89.38);
  assert.equal(result.remuneration, 288.01);
  assert.equal(result.cashRemaining, 0.02);
});

function roundMoneyForTest(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
