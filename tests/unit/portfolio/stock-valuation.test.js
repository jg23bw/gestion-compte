'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const valuation = require('../../../src/domain/portfolio/stock-valuation.js');

test('manual-value holdings are detected by flag, ISIN or provider identifier', () => {
  assert.equal(valuation.isManualValueHolding({ manualValue: true }), true);
  assert.equal(valuation.isManualValueHolding({ isin: 'sur000001737' }), true);
  assert.equal(valuation.isManualValueHolding({ priceId: 'sur-sur000001737' }), true);
  assert.equal(valuation.isManualValueHolding({ isin: 'FR0000121972' }), false);
});

test('manual valuation compounds the invested amount at the configured annual rate', () => {
  const now = Date.parse('2027-01-01T00:00:00Z');
  const start = Date.parse('2026-01-01T00:00:00Z');
  const result = valuation.manualHoldingValue(
    { invested: 1000, manualValueDate: '2026-01-01' },
    { now, annualRate: 0.1 }
  );
  const days = (now - start) / 86400000;
  assert.equal(result, 1000 * Math.pow(1.1, days / 365.25));
});

test('manual valuation never compounds backwards in time', () => {
  assert.equal(valuation.manualHoldingValue(
    { invested: 1200, manualValueDate: '2027-01-01' },
    { now: Date.parse('2026-01-01T00:00:00Z') }
  ), 1200);
});

test('invalid or non-positive native price and FX rate produce no market price', () => {
  assert.equal(valuation.euroPrice(null, 1), null);
  assert.equal(valuation.euroPrice(10, null), null);
  assert.equal(valuation.euroPrice(-10, 1), null);
  assert.equal(valuation.euroPrice(10, 0), null);
  assert.equal(valuation.euroPrice(10, 1.1), 11);
});

test('position metrics compute value, gain and performance from native price and FX', () => {
  assert.deepEqual(valuation.positionMetrics(
    { invested: 800, quantity: 4 },
    { nativePrice: 250, fxRate: 0.9 }
  ), {
    manual: false, invested: 800, quantity: 4,
    value: 900, gain: 100, performance: 12.5
  });
});

test('unpriced positions keep null value, gain and performance', () => {
  assert.deepEqual(valuation.positionMetrics(
    { invested: 500, quantity: 3 },
    { nativePrice: null, fxRate: 1 }
  ), {
    manual: false, invested: 500, quantity: 3,
    value: null, gain: null, performance: null
  });
});

test('manual-value position metrics ignore market price and use manual compounding', () => {
  const result = valuation.positionMetrics(
    { invested: 1000, quantity: 1, manualValue: true, manualValueDate: '2026-01-01' },
    { nativePrice: 99, fxRate: 1, now: Date.parse('2027-01-01T00:00:00Z'), annualRate: 0 }
  );
  assert.deepEqual(result, {
    manual: true, invested: 1000, quantity: 1,
    value: 1000, gain: 0, performance: 0
  });
});

test('zero invested amount has no percentage performance', () => {
  const result = valuation.positionMetrics(
    { invested: 0, quantity: 2 },
    { nativePrice: 10, fxRate: 1 }
  );
  assert.equal(result.gain, 20);
  assert.equal(result.performance, null);
});
