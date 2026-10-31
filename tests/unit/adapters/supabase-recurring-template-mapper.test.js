'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const mapper = require('../../../src/adapters/persistence/supabase/recurring-template-mapper.js');
test('maps recurring templates to the existing Supabase schema and back', () => {
  const row = mapper.toCloud({ id: 't1', accountId: 'a1', day: 5, frequency: 'monthly', months: [1], label: 'Loyer', amount: '', enabled: true }, 'u1');
  assert.equal(row.account_id, 'a1'); assert.equal(row.user_id, 'u1'); assert.equal(row.amount, null);
  assert.deepEqual(mapper.fromCloud(row), { id: 't1', accountId: 'a1', day: 5, frequency: 'monthly', months: [1], startMonth: undefined, endMonth: undefined, date: undefined, label: 'Loyer', amount: null, enabled: true });
});
