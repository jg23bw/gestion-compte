'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Rules = require('../../../src/domain/transactions/transaction-rules.js');

test('professional classification is explicit and never inferred from transaction labels', () => {
  assert.equal(Rules.professionalRecurringKind({ label: 'TVA février' }), null);
  assert.equal(Rules.professionalRecurringKind({ label: 'Charges sociales', professionalCategory: null }), null);
  assert.equal(Rules.professionalRecurringKind({ label: 'Marge AEN', professionalCategory: 'provision' }), 'margin');
  assert.equal(Rules.professionalRecurringKind({ label: 'N’importe quel libellé', professionalCategory: 'vat' }), 'vat');
  assert.equal(Rules.professionalRecurringKind({ professionalCategory: 'social' }), 'social');
});

test('classic expenses and all provision/effective treatments use the expected adjusted amount', () => {
  const cases = [
    ['classic expense', null, null, -100],
    ['generic provision', 'provision', null, -100],
    ['VAT provision', 'vat', 'provision', -100],
    ['VAT effective payment', 'vat', 'effective', 0],
    ['URSSAF provision', 'social', 'provision', -100],
    ['URSSAF effective payment', 'social', 'effective', 0]
  ];
  for (const [name, professionalCategory, professionalTreatment, expected] of cases) {
    const transaction = {
      amount: professionalCategory === 'provision' ||
        ((professionalCategory === 'vat' || professionalCategory === 'social') && professionalTreatment === 'provision')
        ? 0 : -100,
      professionalCategory,
      professionalTreatment,
      professionalAmount: expected
    };
    assert.equal(Rules.professionalAdjustedDelta(transaction), expected, name);
  }
});

test('transaction record preserves explicit classification and signed adjusted amount', () => {
  const record = Rules.createTransactionRecord({
    transactions: [],
    id: 't1',
    accountId: 'pro',
    date: '2026-11-01',
    amount: 0,
    label: 'Marge AEN',
    createdAt: 1,
    professionalCategory: 'provision',
    professionalTreatment: null,
    professionalAmount: -275.5
  });
  assert.equal(record.amount, 0);
  assert.equal(record.professionalCategory, 'provision');
  assert.equal(record.professionalTreatment, null);
  assert.equal(record.professionalAmount, -275.5);
  assert.equal(Rules.professionalAdjustedDelta(record), -275.5);
});
