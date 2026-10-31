'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/adapters/persistence/local-storage/legacy-state-loader.js');
const defaults = [{ id: 'cic-montevrayn', name: 'CIC Montévrain', bank: 'cic', kind: 'bank' }, { id: 'new', name: 'Nouveau', kind: 'bank' }];
function fixture(value) {
  return create({
    storage: { getItem: () => value },
    storageKey: 'state',
    defaultAccounts: defaults,
    bankKeyForAccount: account => account.bank || 'other',
    normalizeStockHoldings: value => Array.isArray(value) ? value : [],
    normalizeAccountPledges: value => value && typeof value === 'object' ? value : {}
  });
}

test('loads legacy state, normalizes account names and merges newly introduced defaults', () => {
  const loader = fixture(JSON.stringify({
    accounts: [{ id: 'cic-montevrayn', name: 'CIC Montévrayn', bank: 'cic', kind: 'bank' }],
    transactions: [{ id: 't1' }],
    recurringTemplates: [{ id: 'r1' }],
    stockHoldings: [{ id: 's1' }],
    accountPledges: { a1: { note: 'Nanti' } },
    lombardCredit: { amount: 100 }
  }));
  const state = loader.load();
  assert.equal(state.accounts[0].name, 'CIC Montévrain');
  assert.equal(state.accounts.length, 2);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.recurringTemplates.length, 1);
  assert.deepEqual(state.stockHoldings, [{ id: 's1' }]);
  assert.deepEqual(state.accountPledges, { a1: { note: 'Nanti' } });
  assert.deepEqual(state.lombardCredit, { amount: 100 });
});

test('returns default state for missing, malformed or incomplete legacy data', () => {
  assert.equal(fixture(null).load().accounts.length, 2);
  assert.equal(fixture('{broken').load().transactions.length, 0);
  assert.equal(fixture(JSON.stringify({ accounts: [] })).load().accounts.length, 2);
});
