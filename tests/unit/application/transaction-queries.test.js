'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/application/transactions/transaction-queries.js');

function fixture() {
  const transactions = [
    { id: 'in', accountId: 'a', date: '2026-01-01', createdAt: 1, amount: 50 },
    { id: 'out', accountId: 'a', date: '2026-01-02', createdAt: 2, amount: -10 },
    { id: 'other', accountId: 'b', date: '2026-01-01', createdAt: 1, amount: 900 }
  ];
  const accounts = [{ id: 'a', opening: 100, netOpening: 100 }];
  return {
    transactions, accounts, recurringTemplates: [],
    repository: {
      findAll: () => transactions,
      findByAccount: id => transactions.filter(t => t.accountId === id),
      findAccount: id => accounts.find(a => a.id === id) || null,
      findRecurringTemplates: () => []
    }
  };
}
const domain = require('../../../src/domain/transactions/transaction-rules.js');

test('list account transactions delegates sorting to domain and filters by account', () => {
  const f = fixture();
  const queries = create({ repository: f.repository, domain });
  assert.deepEqual(queries.listAccountTransactions('a').map(t => t.id), ['out', 'in']);
});

test('balance use case obtains account and transactions through repository port', () => {
  const f = fixture();
  const queries = create({ repository: f.repository, domain });
  assert.equal(queries.balanceAt('a'), 140);
  assert.equal(queries.balanceAt('a', '2026-01-01'), 150);
});

test('unknown account returns zero without throwing', () => {
  const f = fixture();
  const queries = create({ repository: f.repository, domain });
  assert.equal(queries.balanceAt('missing'), 0);
});

test('professional adjusted balance uses repository templates', () => {
  const f = fixture();
  f.transactions.push({ id: 'vat', accountId: 'a', date: '2026-01-03', createdAt: 3, amount: 0, recurringKey: '2026-01', recurringTemplateId: 'vat-template', label: 'TVA' });
  f.repository.findRecurringTemplates = () => [{ id: 'vat-template', label: 'TVA', amount: 20 }];
  const queries = create({ repository: f.repository, domain });
  assert.equal(queries.professionalAdjustedBalanceAt('a', '2026-01-31'), 120);
});

test('balance after transaction follows the account display order and stops at the requested row', () => {
  const f = fixture();
  const queries = create({ repository: f.repository, domain });
  assert.equal(queries.balanceAfterTransaction(f.transactions[0]), 140);
  assert.equal(queries.balanceAfterTransaction(f.transactions[1]), 90);
});

test('balance after transaction returns zero when the account no longer exists', () => {
  const f = fixture();
  const queries = create({ repository: f.repository, domain });
  assert.equal(queries.balanceAfterTransaction({ id: 'gone', accountId: 'missing' }), 0);
});


test('monthly history filters, sorts and aggregates rows without changing stored transactions', () => {
  const f = fixture();
  f.accounts.push({ id: 'b', name: 'Compte B', opening: 0 });
  f.transactions.push(
    { id: 'rent', accountId: 'a', date: '2026-01-03', createdAt: 3, amount: 700, label: 'Loyer' },
    { id: 'food', accountId: 'b', date: '2026-01-02', createdAt: 2, amount: -80, label: 'Courses' },
    { id: 'other-month', accountId: 'a', date: '2026-02-01', createdAt: 4, amount: 1000, label: 'Hors période' }
  );
  const queries = create({ repository: f.repository, domain });
  const result = queries.monthlyHistory({ month: '2026-01', accountFilter: 'all', typeFilter: 'all', query: '', sort: 'date-asc' });
  assert.deepEqual(result.rows.map(item => item.id), ['in', 'other', 'out', 'food', 'rent']);
  assert.equal(result.incoming, 1650);
  assert.equal(result.outgoing, -90);
  assert.equal(result.net, 1560);
  assert.equal(f.transactions.length, 6);
});

test('monthly history applies account, type and text filters with amount sorting', () => {
  const f = fixture();
  f.accounts[0].name = 'Compte courant';
  f.transactions[0].label = 'Salaire complémentaire';
  f.transactions.push(
    { id: 'salary', accountId: 'a', date: '2026-01-03', createdAt: 3, amount: 2000, label: 'Salaire' },
    { id: 'bill', accountId: 'a', date: '2026-01-04', createdAt: 4, amount: -30, label: 'Facture énergie' }
  );
  const queries = create({ repository: f.repository, domain });
  const result = queries.monthlyHistory({ month: '2026-01', accountFilter: 'a', typeFilter: 'income', query: 'salaire', sort: 'amount-desc' });
  assert.deepEqual(result.rows.map(item => item.id), ['salary']);
  assert.equal(result.incoming, 2000);
  assert.equal(result.outgoing, 0);
  assert.equal(result.net, 2000);
});


test('account transaction query filters by account, type and text, then applies the requested sort', () => {
  const f = fixture();
  f.accounts[0].name = 'Compte courant';
  f.transactions.push(
    { id: 'salary', accountId: 'a', date: '2026-01-03', createdAt: 3, amount: 2000, label: 'Salaire', isPaid: true },
    { id: 'bill', accountId: 'a', date: '2026-01-04', createdAt: 4, amount: -30, label: 'Facture énergie' },
    { id: 'other-account', accountId: 'b', date: '2026-01-05', createdAt: 5, amount: 500, label: 'Salaire' }
  );
  const queries = create({ repository: f.repository, domain });
  const result = queries.filterAccountTransactions({
    accountId: 'a', typeFilter: 'income', query: ' salaire ', sort: 'amount-desc'
  });
  assert.deepEqual(result.map(item => item.id), ['salary', 'in']);
});

test('account transaction query preserves manual order and supports pointed-first sorting', () => {
  const f = fixture();
  f.transactions[0].sortOrder = 2;
  f.transactions[1].sortOrder = 1;
  f.transactions[0].isPaid = true;
  const queries = create({ repository: f.repository, domain });
  assert.deepEqual(queries.filterAccountTransactions({ accountId: 'a', sort: 'manual' }).map(item => item.id), ['out', 'in']);
  assert.deepEqual(queries.filterAccountTransactions({ accountId: 'a', sort: 'pointed' }).map(item => item.id), ['in', 'out']);
});
