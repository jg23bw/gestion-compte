'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/adapters/persistence/supabase/account-mapper.js');
const mapper = create({
  bankKeyForAccount: () => 'fortuneo', accountShort: name => name.slice(0, 3),
  bankKeyFromId: () => 'other', isBankKey: key => key === 'fortuneo',
  accountTypeCommands: { typeFor: (kind, override) => override || kind }
});
test('maps account records to and from the existing Supabase schema', () => {
  const row = mapper.toCloud({ id: 'a1', name: 'Fortuneo', kind: 'bank', opening: '100', vatRate: 20, socialRate: 45, netOpening: 5 }, 'u1');
  assert.deepEqual(row, { id: 'a1', user_id: 'u1', name: 'Fortuneo', short: 'bank:fortuneo', kind: 'bank', opening: 100, vat_rate: 20, social_rate: 45, net_opening: 5 });
  assert.deepEqual(mapper.fromCloud(row, { a1: 'pea' }), { id: 'a1', name: 'Fortuneo', short: 'For', bank: 'fortuneo', kind: 'bank', accountType: 'pea', opening: 100, vatRate: 20, socialRate: 45, netOpening: 5 });
});
