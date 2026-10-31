'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/adapters/persistence/state/state-transaction-repository.js');
const port = require('../../../src/ports/transactions/transaction-repository.js');

function stateWith(transactions = []) {
  return { accounts: [{ id: 'a', opening: 100 }], transactions, recurringTemplates: [] };
}

test('state adapter satisfies the transaction repository port', () => {
  const repository = create(stateWith());
  assert.equal(port.isTransactionRepository(repository), true);
});

test('state adapter reads through a getter so replaced application state stays visible', () => {
  let state = stateWith([{ id: 'old', accountId: 'a' }]);
  const repository = create(() => state);
  state = stateWith([{ id: 'new', accountId: 'a' }]);
  assert.deepEqual(repository.findAll().map(item => item.id), ['new']);
  assert.equal(repository.findById('new').id, 'new');
});

test('state adapter saves new and existing transactions without replacing the state array', () => {
  const initial = { id: 'tx', accountId: 'a', amount: 10 };
  const state = stateWith([initial]);
  const originalArray = state.transactions;
  const repository = create(state);
  const updated = { ...initial, amount: 25 };
  repository.save(updated);
  repository.save({ id: 'new', accountId: 'a', amount: 5 });
  assert.equal(state.transactions, originalArray);
  assert.equal(repository.findById('tx').amount, 25);
  assert.equal(repository.findAll().length, 2);
});

test('state adapter deletes only the requested transaction and returns the removed record', () => {
  const state = stateWith([{ id: 'keep' }, { id: 'remove' }]);
  const repository = create(state);
  assert.equal(repository.delete('remove').id, 'remove');
  assert.equal(repository.delete('missing'), null);
  assert.deepEqual(repository.findAll().map(item => item.id), ['keep']);
});

test('state adapter rejects incomplete application state', () => {
  assert.throws(() => create({ transactions: [] }), /valid application state/);
});
