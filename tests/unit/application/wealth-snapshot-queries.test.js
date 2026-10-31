'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/application/portfolio/wealth-snapshot-queries.js');

test('computes gross, net, investment and liquid wealth from injected portfolio queries', () => {
  const queries = create({
    accounts: () => [{ id: 'a', accountType: 'bank' }, { id: 'p', accountType: 'pro' }],
    balanceAt: id => id === 'a' ? 900 : 100,
    stockHoldings: () => [
      { id: 'quoted', accountId: 'a', quantity: 2, invested: 80 },
      { id: 'manual', accountId: 'a', invested: 90 }
    ],
    cryptoHoldings: () => [{ quantity: 10, invested: 200 }],
    stockPriceDetails: () => ({ price: 60 }),
    cryptoPrice: () => 20,
    isManualValueHolding: holding => holding.id === 'manual',
    manualHoldingValue: () => 95,
    lombardCredit: () => ({ amount: 300 }),
    effectiveAccountType: account => account.accountType
  });
  assert.deepEqual(queries.snapshot(), {
    accounts: 1000, stocks: 215, crypto: 200, gross: 1415,
    debt: 300, net: 1115, investments: 215, liquid: 1115
  });
});

test('falls back to invested amount when a quoted stock price is unavailable', () => {
  const queries = create({
    accounts: () => [{ id: 'a', accountType: 'bank' }],
    balanceAt: () => 0,
    stockHoldings: () => [{ accountId: 'a', invested: 125, quantity: 3 }],
    cryptoHoldings: () => [],
    stockPriceDetails: () => ({ price: null }),
    cryptoPrice: () => null,
    isManualValueHolding: () => false,
    manualHoldingValue: () => 0,
    lombardCredit: () => ({ amount: 0 }),
    effectiveAccountType: () => 'bank'
  });
  assert.equal(queries.snapshot().investments, 125);
});
