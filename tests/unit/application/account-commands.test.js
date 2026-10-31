'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Port = require('../../../src/ports/accounts/account-repository.js');
const StateAccountRepository = require('../../../src/adapters/persistence/state/state-account-repository.js');
const StateTransactionRepository = require('../../../src/adapters/persistence/state/state-transaction-repository.js');
const StateRecurringRepository = require('../../../src/adapters/persistence/state/state-recurring-template-repository.js');
const AccountCommands = require('../../../src/application/accounts/account-commands.js');

function setup(initial = []) {
  const state = { accounts: initial, transactions: [], recurringTemplates: [], stockHoldings: [], accountPledges: {} };
  const repository = StateAccountRepository.create(() => state);
  const transactionRepository = StateTransactionRepository.create(() => state);
  const recurringTemplateRepository = StateRecurringRepository.create(() => state);
  const stockHoldingCommands = {
    findAll: () => state.stockHoldings,
    deleteByAccount: id => {
      const removed = state.stockHoldings.filter(item => item.accountId === id);
      state.stockHoldings = state.stockHoldings.filter(item => item.accountId !== id);
      return removed;
    }
  };
  const commands = AccountCommands.create({
    repository, transactionRepository, recurringTemplateRepository, stockHoldingCommands,
    isBankKey: key => ['fortuneo', 'boursorama', 'other'].includes(key),
    accountShort: name => name.slice(0, 2).toUpperCase()
  });
  return { state, commands, repository };
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

test('removes an account and all linked records, returning cloud cleanup details', () => {
  const { state, commands } = setup([{ id: 'a', name: 'Compte A' }, { id: 'b', name: 'Compte B' }]);
  state.transactions = [{ id: 't1', accountId: 'a' }, { id: 't2', accountId: 'b' }];
  state.recurringTemplates = [{ id: 'r1', accountId: 'a' }, { id: 'r2', accountId: 'b' }];
  state.stockHoldings = [{ id: 's1', accountId: 'a' }, { id: 's2', accountId: 'b' }];
  state.accountPledges = { a: { note: 'Nanti' }, b: { note: 'Autre' } };
  const result = commands.remove('a');
  assert.equal(result.account.id, 'a');
  assert.deepEqual(result.transactions.map(item => item.id), ['t1']);
  assert.deepEqual(result.templates.map(item => item.id), ['r1']);
  assert.deepEqual(result.stockHoldings.map(item => item.id), ['s1']);
  assert.deepEqual(result.pledge, { note: 'Nanti' });
  assert.deepEqual(state.accounts.map(item => item.id), ['b']);
  assert.deepEqual(state.transactions.map(item => item.id), ['t2']);
  assert.deepEqual(state.recurringTemplates.map(item => item.id), ['r2']);
  assert.deepEqual(state.stockHoldings.map(item => item.id), ['s2']);
  assert.deepEqual(state.accountPledges, { b: { note: 'Autre' } });
});

test('returns null without changing state when the account no longer exists', () => {
  const { state, commands } = setup([{ id: 'a' }]);
  assert.equal(commands.remove('missing'), null);
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
