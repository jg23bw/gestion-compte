'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/application/transactions/transaction-commands.js');
const domain = require('../../../src/domain/transactions/transaction-rules.js');

function fixture() {
  const transactions = [
    { id: 'existing', accountId: 'a', date: '2026-01-01', amount: 10, label: 'Initiale', createdAt: 5, sortOrder: 2, isPaid: true }
  ];
  const repository = {
    findAll: () => transactions,
    findById: id => transactions.find(item => item.id === id) || null,
    save(transaction) {
      const index = transactions.findIndex(item => item.id === transaction.id);
      if (index < 0) transactions.push(transaction);
      else transactions[index] = transaction;
      return transaction;
    },
    delete(id) {
      const index = transactions.findIndex(item => item.id === id);
      return index < 0 ? null : transactions.splice(index, 1)[0];
    }
  };
  return { transactions, repository, commands: create({ repository, domain }) };
}

test('save creates a transaction through the repository and assigns its order', () => {
  const f = fixture();
  const saved = f.commands.save({
    id: 'new', accountId: 'a', date: '2026-01-02',
    amount: -4, label: 'Nouvelle', createdAt: 10
  });
  assert.equal(saved.id, 'new');
  assert.equal(saved.sortOrder, 3);
  assert.equal(f.transactions.length, 2);
});

test('save updates an existing transaction while preserving its paid state and creation date', () => {
  const f = fixture();
  const saved = f.commands.save({
    id: 'existing', accountId: 'a', date: '2026-02-01',
    amount: 20, label: 'Modifiée', createdAt: 99
  });
  assert.equal(saved.isPaid, true);
  assert.equal(saved.createdAt, 5);
  assert.equal(saved.sortOrder, 2);
  assert.equal(f.transactions.length, 1);
});

test('remove returns the deleted transaction and leaves other records intact', () => {
  const f = fixture();
  assert.equal(f.commands.remove('existing').id, 'existing');
  assert.equal(f.commands.remove('missing'), null);
  assert.equal(f.transactions.length, 0);
});

test('setPaid updates status and optional date without changing other fields', () => {
  const f = fixture();
  const paid = f.commands.setPaid('existing', { isPaid: true, date: '2026-01-03' });
  assert.equal(paid.date, '2026-01-03');
  assert.equal(paid.isPaid, true);
  assert.equal(paid.amount, 10);
  const unpaid = f.commands.setPaid('existing', { isPaid: false });
  assert.equal(unpaid.date, '2026-01-03');
  assert.equal(unpaid.isPaid, false);
  assert.equal(f.commands.setPaid('missing', { isPaid: true }), null);
});


test('reorder updates only the requested account and persists the requested order', () => {
  const f = fixture();
  f.transactions.push(
    { id: 'second', accountId: 'a', date: '2026-01-02', amount: 5, label: 'Deuxième', createdAt: 6, sortOrder: 3 },
    { id: 'other-account', accountId: 'b', date: '2026-01-01', amount: 99, label: 'Autre', createdAt: 7, sortOrder: 1 }
  );
  const reordered = f.commands.reorder('a', ['second', 'existing']);
  assert.deepEqual(reordered.map(item => [item.id, item.sortOrder]), [['second', 1], ['existing', 2]]);
  assert.equal(f.transactions.find(item => item.id === 'other-account').sortOrder, 1);
});
