'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/domain/portfolio/stock-holding-rules.js');
const rules = create({
  currencies: ['EUR', 'USD', 'GBX'],
  markets: { ETR: { label: 'Xetra', currency: 'EUR' }, US: { label: 'États-Unis', currency: 'USD' } },
  today: () => '2026-10-31'
});

test('normalizes persisted stock holding metadata without changing its shape', () => {
  assert.deepEqual(rules.normalize([{
    id: 'h1', accountId: 'a1', priceId: 'ETR-SXR8', isin: 'ie00b5bmr087',
    symbol: 'sxr8', invested: '1200', quantity: '4', sortOrder: '2'
  }]), [{
    id: 'h1', accountId: 'a1', priceId: 'ETR-SXR8', symbol: 'SXR8', isin: 'IE00B5BMR087',
    name: 'SXR8', market: 'Xetra', currency: 'EUR', invested: 1200, quantity: 4,
    manualValue: false, manualValueDate: '2026-10-31', sortOrder: 2
  }]);
});

test('deduplicates IDs, rejects invalid rows and preserves manual-value holdings', () => {
  const result = rules.normalize([
    { id: 'x', accountId: 'a', priceId: 'SUR-SUR000001737', symbol: 'SUR000001737', isin: 'SUR000001737', invested: 100, manualValue: true },
    { id: 'x', accountId: 'a', priceId: 'US-ABC', symbol: 'ABC', invested: 200, quantity: 1 },
    { id: 'bad', accountId: 'a', priceId: 'US-DEF', symbol: 'DEF', invested: -1, quantity: 1 },
    null
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].manualValue, true);
  assert.equal(result[0].quantity, 0);
  assert.equal(result[0].currency, 'EUR');
});

test('normalizes supported currencies and falls back to EUR', () => {
  assert.equal(rules.normalizeCurrency(' gbx '), 'GBX');
  assert.equal(rules.normalizeCurrency('XYZ'), 'EUR');
});
