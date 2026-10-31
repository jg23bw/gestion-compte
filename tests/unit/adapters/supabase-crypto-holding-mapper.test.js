'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const mapper = require('../../../src/adapters/persistence/supabase/crypto-holding-mapper.js');
test('maps crypto holdings without changing persisted column names', () => {
  const row = mapper.toCloud({ id: 'c1', symbol: 'BTC', invested: '100', quantity: '0.01', sortOrder: 2 }, 'u1');
  assert.equal(row.user_id, 'u1'); assert.equal(row.coingecko_id, undefined); assert.equal(row.invested, 100);
  assert.deepEqual(mapper.fromCloud(row), { id: 'c1', symbol: 'BTC', name: 'BTC', coingeckoId: undefined, invested: 100, quantity: 0.01, sortOrder: 2 });
});
