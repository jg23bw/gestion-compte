'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/application/portfolio/wealth-snapshot-queries.js');

test('computes gross, net, investment and liquid wealth from injected portfolio queries', () => {
  const queries = create({
    totalAccountsBalance: () => 1000, totalStockValue: () => 500, totalCryptoValue: () => 200,
    lombardAmount: () => 300, stockHoldings: () => [
      { id: 'quoted', quantity: 2, invested: 80 }, { id: 'manual', invested: 90 }
    ],
    isManualValueHolding: holding => holding.id === 'manual',
    manualHoldingValue: () => 95, stockPriceDetails: () => ({ price: 60 }),
    accounts: () => [{ id: 'a', accountType: 'bank' }, { id: 'p', accountType: 'pro' }],
    effectiveAccountType: account => account.accountType,
    accountOverviewBalance: id => id === 'a' ? 900 : 100
  });
  assert.deepEqual(queries.snapshot(), { accounts: 1000, stocks: 500, crypto: 200, gross: 1700, debt: 300, net: 1400, investments: 215, liquid: 900 });
});

test('falls back to invested amount when a quoted stock price is unavailable', () => {
  const queries = create({
    totalAccountsBalance: () => 0, totalStockValue: () => 0, totalCryptoValue: () => 0, lombardAmount: () => 0,
    stockHoldings: () => [{ invested: 125, quantity: 3 }], isManualValueHolding: () => false,
    manualHoldingValue: () => 0, stockPriceDetails: () => ({ price: null }), accounts: () => [],
    effectiveAccountType: () => 'bank', accountOverviewBalance: () => 0
  });
  assert.equal(queries.snapshot().investments, 125);
});
