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
