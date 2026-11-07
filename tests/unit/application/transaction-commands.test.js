'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/application/transactions/transaction-commands.js');
const domain = require('../../../src/domain/transactions/transaction-rules.js');

function fixture() {
  const transactions = [
    { id: 'existing', accountId: 'a', date: '2026-01-01', amount: 10, label: 'Initiale', createdAt: 5, sortOrder: 2, isPaid: true }
  ];
  const accounts = [{ id: 'a' }, { id: 'b' }];
  const repository = {
    findAll: () => transactions,
    findById: id => transactions.find(item => item.id === id) || null,
    findAccount: id => accounts.find(item => item.id === id) || null,
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

test('saveTransfer creates two linked entries with opposite signs and stable account references', () => {
  const f = fixture();
  const transfer = f.commands.saveTransfer({
    id: 'transfer-out', incomingId: 'transfer-in', transferId: 'transfer-1',
    sourceAccountId: 'a', destinationAccountId: 'b', date: '2026-01-03',
    amount: 125.5, label: 'Épargne', createdAt: 20
  });
  assert.equal(transfer.outgoing.amount, -125.5);
  assert.equal(transfer.incoming.amount, 125.5);
  assert.equal(transfer.outgoing.transferRole, 'outgoing');
  assert.equal(transfer.incoming.transferRole, 'incoming');
  assert.equal(transfer.outgoing.transferAccountId, 'b');
  assert.equal(transfer.incoming.transferAccountId, 'a');
  assert.equal(f.transactions.length, 3);
});

test('editing a transfer updates both linked rows without changing their ids or pointage', () => {
  const f = fixture();
  f.commands.saveTransfer({
    id: 'transfer-out', incomingId: 'transfer-in', transferId: 'transfer-1',
    sourceAccountId: 'a', destinationAccountId: 'b', date: '2026-01-03',
    amount: 100, label: 'Épargne', createdAt: 20
  });
  f.commands.setPaid('transfer-in', { isPaid: true, date: '2026-01-04' });
  const updated = f.commands.saveTransfer({
    id: 'transfer-out', incomingId: 'transfer-in', transferId: 'transfer-1',
    sourceAccountId: 'a', destinationAccountId: 'b', date: '2026-01-05',
    amount: 150, label: 'Épargne modifiée', createdAt: 30
  });
  assert.equal(updated.outgoing.id, 'transfer-out');
  assert.equal(updated.incoming.id, 'transfer-in');
  assert.equal(updated.outgoing.amount, -150);
  assert.equal(updated.incoming.amount, 150);
  assert.equal(updated.outgoing.date, '2026-01-05');
  assert.equal(updated.incoming.date, '2026-01-05');
  assert.equal(updated.outgoing.isPaid, true);
  assert.equal(updated.incoming.isPaid, true);
});

test('remove and pointage operate on both sides of a transfer', () => {
  const f = fixture();
  f.commands.saveTransfer({
    id: 'transfer-out', incomingId: 'transfer-in', transferId: 'transfer-1',
    sourceAccountId: 'a', destinationAccountId: 'b', date: '2026-01-03',
    amount: 40, label: 'Transfert', createdAt: 20
  });
  f.commands.setPaid('transfer-out', { isPaid: true });
  assert.equal(f.transactions.find(item => item.id === 'transfer-in').isPaid, true);
  assert.equal(f.commands.remove('transfer-in').id, 'transfer-in');
  assert.equal(f.transactions.some(item => item.transferId === 'transfer-1'), false);
});

test('saveTransfer rejects identical accounts and non-positive amounts', () => {
  const f = fixture();
  assert.throws(() => f.commands.saveTransfer({
    id: 'out', incomingId: 'in', transferId: 'x', sourceAccountId: 'a',
    destinationAccountId: 'a', date: '2026-01-02', amount: 10, label: 'Test'
  }), /Deux comptes différents/);
  assert.throws(() => f.commands.saveTransfer({
    id: 'out', incomingId: 'in', transferId: 'x', sourceAccountId: 'a',
    destinationAccountId: 'b', date: '2026-01-02', amount: 0, label: 'Test'
  }), /supérieur à zéro/);
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

test('normalizeOrder assigns missing manual order by descending date and creation time', () => {
  const f = fixture();
  f.transactions[0].sortOrder = null;
  f.transactions.push(
    { id: 'newer-date', accountId: 'a', date: '2026-02-01', createdAt: 1 },
    { id: 'same-date-newer', accountId: 'a', date: '2026-02-01', createdAt: 9 },
    { id: 'other-account', accountId: 'b', date: '2026-03-01', createdAt: 10 }
  );
  assert.equal(f.commands.normalizeOrder([{ id: 'a' }, { id: 'b' }]), 4);
  assert.equal(f.transactions.find(item => item.id === 'same-date-newer').sortOrder, 1);
  assert.equal(f.transactions.find(item => item.id === 'newer-date').sortOrder, 2);
  assert.equal(f.transactions.find(item => item.id === 'existing').sortOrder, 3);
  assert.equal(f.transactions.find(item => item.id === 'other-account').sortOrder, 1);
});
