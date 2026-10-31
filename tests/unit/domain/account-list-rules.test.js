'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { filterAndSort } = require('../../../src/domain/accounts/account-list-rules.js');

const accounts = [
  { id: 'b', name: 'BoursoBank', short: 'B', type: 'bank', bank: 'BoursoBank' },
  { id: 'p', name: 'PEA Fortuneo', short: 'P', type: 'pea', bank: 'Fortuneo' },
  { id: 'c', name: 'Compte CIC', short: 'CIC', type: 'bank', bank: 'CIC' }
];
const selectors = {
  effectiveType: account => account.type,
  kindLabel: account => account.type === 'pea' ? 'PEA' : 'Compte courant',
  bankName: account => account.bank,
  balance: id => ({ b: 200, p: 1000, c: 50 })[id]
};

test('account list filters by name, bank and account type without mutating source', () => {
  const result = filterAndSort({ accounts, query: 'fortuneo', kind: 'pea', ...selectors });
  assert.deepEqual(result.map(account => account.id), ['p']);
  assert.equal(accounts.length, 3);
});

test('account list sorts by balance in ascending and descending order', () => {
  assert.deepEqual(filterAndSort({ accounts, sort: 'balance-asc', ...selectors }).map(a => a.id), ['c', 'b', 'p']);
  assert.deepEqual(filterAndSort({ accounts, sort: 'balance-desc', ...selectors }).map(a => a.id), ['p', 'b', 'c']);
});

test('account list sorts by type then name and rejects missing selectors', () => {
  assert.deepEqual(filterAndSort({ accounts, sort: 'kind', ...selectors }).map(a => a.id), ['b', 'c', 'p']);
  assert.throws(() => filterAndSort({ accounts }), /selectors are required/);
});
