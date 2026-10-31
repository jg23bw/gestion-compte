'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { selectGroups } = require('../../../src/domain/accounts/account-list-rules.js');

const accounts = [
  { id: 'bank', type: 'bank' }, { id: 'pro', type: 'pro' },
  { id: 'pea', type: 'pea' }, { id: 'av', type: 'av' }, { id: 'savings', type: 'savings' }
];
const effectiveType = account => account.type;

test('account selector groups separate operational, personal, professional and investment accounts', () => {
  const groups = selectGroups(accounts, { effectiveType });
  assert.deepEqual(groups.operational.map(account => account.id), ['bank', 'pro', 'savings']);
  assert.deepEqual(groups.personal.map(account => account.id), ['bank', 'savings']);
  assert.deepEqual(groups.professional.map(account => account.id), ['pro']);
  assert.deepEqual(groups.investment.map(account => account.id), ['pea', 'av']);
  assert.deepEqual(accounts.map(account => account.id), ['bank', 'pro', 'pea', 'av', 'savings']);
});

test('account selector groups reject a missing type selector', () => {
  assert.throws(() => selectGroups(accounts), /effective account type selector is required/);
});
