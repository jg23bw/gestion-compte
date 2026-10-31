'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Port = require('../../../src/ports/accounts/account-repository.js');
const StateRepository = require('../../../src/adapters/persistence/state/state-account-repository.js');
const AccountCommands = require('../../../src/application/accounts/account-commands.js');

function setup(initial = []) {
  const state = { accounts: initial };
  const repository = StateRepository.create(() => state);
  const commands = AccountCommands.create({
    repository,
    isBankKey: key => ['fortuneo', 'boursorama', 'other'].includes(key),
    accountShort: name => name.slice(0, 2).toUpperCase()
  });
  return { state, commands };
}

test('creates an account with normalized fields and professional defaults', () => {
  const { state, commands } = setup();
  const account = commands.save({ id: 'new', name: '  Compte pro ', accountType: 'pro', bank: 'other', opening: '125.5' });
  assert.deepEqual(account, {
    id: 'new', name: 'Compte pro', short: 'CO', bank: 'other', kind: 'pro',
    accountType: 'pro', opening: 125.5, vatRate: 20, socialRate: 45, netOpening: 0
  });
  assert.equal(state.accounts.length, 1);
});

test('maps investment account types to savings storage kind', () => {
  const { commands } = setup();
  const account = commands.save({ id: 'pea', name: 'PEA', accountType: 'pea', bank: 'fortuneo' });
  assert.equal(account.kind, 'savings');
  assert.equal(account.accountType, 'pea');
});

test('updates an existing account without losing unrelated professional settings', () => {
  const original = { id: 'pro', name: 'Old', kind: 'pro', accountType: 'pro', vatRate: 10, socialRate: 30, netOpening: 5 };
  const { state, commands } = setup([original]);
  const updated = commands.save({ existing: original, name: 'New', accountType: 'pro', bank: 'other', opening: 20 });
  assert.equal(updated.id, 'pro');
  assert.equal(state.accounts[0], original, 'updates preserve the existing account object identity');
  assert.equal(updated.vatRate, 10);
  assert.equal(updated.socialRate, 30);
  assert.equal(updated.netOpening, 5);
  assert.equal(state.accounts.length, 1);
});

test('rejects invalid input and stale account references', () => {
  const { commands } = setup([{ id: 'existing' }]);
  assert.throws(() => commands.save({ id: 'x', name: '', accountType: 'bank', bank: 'other' }), /name is required/);
  assert.throws(() => commands.save({ id: 'x', name: 'X', accountType: 'bad', bank: 'other' }), /invalid account type/);
  assert.throws(() => commands.save({ id: 'x', name: 'X', accountType: 'bank', bank: 'bad' }), /invalid bank/);
  assert.throws(() => commands.save({ existing: { id: 'deleted' }, name: 'X', accountType: 'bank', bank: 'other' }), /no longer exists/);
  assert.throws(() => Port.assert({}), /port is required/);
});
