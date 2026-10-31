'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const StateAccountRepository = require('../../../src/adapters/persistence/state/state-account-repository.js');
const AccountPledgeCommands = require('../../../src/application/accounts/account-pledge-commands.js');
const Rules = require('../../../src/domain/accounts/account-pledge-rules.js');

function setup() {
  const state = { accounts: [{ id: 'a' }, { id: 'b' }], accountPledges: { b: { note: 'Existing' } } };
  const repository = StateAccountRepository.create(() => state);
  return { state, commands: AccountPledgeCommands.create({ repository, rules: Rules }) };
}

test('reads, saves and removes a pledge through the repository', () => {
  const { state, commands } = setup();
  assert.deepEqual(commands.find('b'), { note: 'Existing' });
  assert.deepEqual(commands.save({ accountId: 'a', pledged: true, note: '  Banque  ' }), { note: 'Banque' });
  assert.deepEqual(commands.overrides(state.accounts), { a: { note: 'Banque' }, b: { note: 'Existing' } });
  assert.deepEqual(commands.save({ accountId: 'a', pledged: false }), { note: 'Banque' });
  assert.deepEqual(state.accountPledges, { b: { note: 'Existing' } });
});

test('rejects writes for accounts that no longer exist', () => {
  const { commands } = setup();
  assert.throws(() => commands.save({ accountId: 'missing', pledged: true }), /no longer exists/);
});

test('normalizes imported metadata without changing the stored format', () => {
  const { commands } = setup();
  assert.deepEqual(commands.normalize({ old: true }), { old: { note: '' } });
});
