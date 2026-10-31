'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize } = require('../../../src/domain/finance/lombard-credit-rules.js');

test('normalizes the existing Lombard metadata shape', () => {
  assert.deepEqual(normalize({ label: '  Lombard  ', amount: '60000', rate: '4.5', notes: '  BTC  ' }), {
    label: 'Lombard', amount: 60000, rate: 4.5, notes: 'BTC'
  });
});

test('applies defaults and bounds to malformed numeric values', () => {
  assert.deepEqual(normalize({ label: ' ', amount: -10, rate: 140, notes: 'x'.repeat(510) }), {
    label: 'Crédit lombard', amount: 0, rate: 100, notes: 'x'.repeat(500)
  });
  assert.equal(normalize({ rate: 'not-a-number' }).rate, null);
  assert.equal(normalize(null), null);
  assert.equal(normalize([]), null);
});
