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
  assert.deepEqual(queries.listAccountTransactions('a').map(t => t.id), ['in', 'out']);
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

test('professional adjusted balance uses the explicit adjusted amount, not recurring template labels', () => {
  const f = fixture();
  f.transactions.push({ id: 'vat', accountId: 'a', date: '2026-01-03', createdAt: 3, amount: 0, professionalCategory: 'vat', professionalTreatment: 'provision', professionalAmount: -20, label: 'N’importe quel libellé' });
  const queries = create({ repository: f.repository, domain });
  assert.equal(queries.professionalAdjustedBalanceAt('a', '2026-01-31'), 120);
});

test('balance after transaction follows the account display order and stops at the requested row', () => {
  const f = fixture();
  const queries = create({ repository: f.repository, domain });
  assert.equal(queries.balanceAfterTransaction(f.transactions[0]), 150);
  assert.equal(queries.balanceAfterTransaction(f.transactions[1]), 140);
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
  f.transactions[0].label = 'Salaire complémentaire';
  f.transactions.push(
    { id: 'salary', accountId: 'a', date: '2026-01-03', createdAt: 3, amount: 2000, label: 'Salaire', isPaid: true },
    { id: 'bill', accountId: 'a', date: '2026-01-04', createdAt: 4, amount: -30, label: 'Facture énergie' },
    { id: 'other-account', accountId: 'b', date: '2026-01-05', createdAt: 5, amount: 500, label: 'Salaire' }
  );
  const queries = create({ repository: f.repository, domain });
  const result = queries.filterAccountTransactions({
    accountId: 'a', typeFilter: 'income', query: ' salaire ', sort: 'amount-desc'
  });
  assert.deepEqual(result.map(item => item.id), ['in', 'salary']);
});

test('monthly history groups transfer pairs and excludes them from income and expense totals', () => {
  const f = fixture();
  f.accounts[0].name = 'Compte A';
  f.accounts.push({ id: 'b', name: 'Compte B', opening: 0 });
  f.transactions.push(
    { id: 'transfer-out', accountId: 'a', date: '2026-01-03', createdAt: 3, amount: -75, label: 'Épargne', transferId: 'transfer-1', transferRole: 'outgoing', transferAccountId: 'b' },
    { id: 'transfer-in', accountId: 'b', date: '2026-01-03', createdAt: 3, amount: 75, label: 'Épargne', transferId: 'transfer-1', transferRole: 'incoming', transferAccountId: 'a' }
  );
  const queries = create({ repository: f.repository, domain });
  const all = queries.monthlyHistory({ month: '2026-01', accountFilter: 'all', typeFilter: 'all' });
  assert.equal(all.rows.filter(item => item.isTransfer).length, 1);
  assert.equal(all.rows.find(item => item.isTransfer).displayAccountName, 'Compte A → Compte B');
  assert.equal(all.rows.find(item => item.isTransfer).amount, 75);
  assert.equal(all.incoming, 950);
  assert.equal(all.outgoing, -10);
  assert.equal(all.net, 940);
  const selected = queries.monthlyHistory({ month: '2026-01', accountFilter: 'b', typeFilter: 'transfer' });
  assert.equal(selected.rows.length, 1);
  assert.equal(selected.incoming, 0);
  assert.equal(selected.outgoing, 0);
});

test('account transaction type filters classify transfers separately from income and expenses', () => {
  const f = fixture();
  f.accounts.push({ id: 'b', name: 'Compte B', opening: 0 });
  f.transactions.push(
    { id: 'transfer-out', accountId: 'a', date: '2026-01-03', createdAt: 3, amount: -75, label: 'Épargne', transferId: 'transfer-1', transferRole: 'outgoing', transferAccountId: 'b' },
    { id: 'transfer-in', accountId: 'b', date: '2026-01-03', createdAt: 3, amount: 75, label: 'Épargne', transferId: 'transfer-1', transferRole: 'incoming', transferAccountId: 'a' }
  );
  const queries = create({ repository: f.repository, domain });
  assert.deepEqual(queries.filterAccountTransactions({ accountId: 'a', typeFilter: 'transfer' }).map(item => item.id), ['transfer-out']);
  assert.deepEqual(queries.filterAccountTransactions({ accountId: 'a', typeFilter: 'expense' }).map(item => item.id), ['out']);
});

test('account transaction query always prioritizes pending rows, then applies the selected sort', () => {
  const f = fixture();
  f.transactions[0].sortOrder = 2;
  f.transactions[1].sortOrder = 1;
  f.transactions[0].isPaid = true;
  const queries = create({ repository: f.repository, domain });
  assert.deepEqual(queries.filterAccountTransactions({ accountId: 'a', sort: 'date-desc' }).map(item => item.id), ['out', 'in']);
  assert.deepEqual(queries.filterAccountTransactions({ accountId: 'a', sort: 'date-asc' }).map(item => item.id), ['out', 'in']);
});

test('account transaction display sorting prioritizes pending rows and does not mutate repository rows', () => {
  const f = fixture();
  f.transactions[0].sortOrder = 2;
  f.transactions[1].sortOrder = 1;
  f.transactions[0].isPaid = true;
  const original = f.transactions.map(item => ({ ...item }));
  const queries = create({ repository: f.repository, domain });
  assert.deepEqual(queries.filterAccountTransactions({ accountId: 'a', sort: 'date-desc' }).map(item => item.id), ['out', 'in']);
  assert.deepEqual(queries.filterAccountTransactions({ accountId: 'a', sort: 'date-asc' }).map(item => item.id), ['out', 'in']);
  assert.deepEqual(f.transactions, original);
});


test('account transaction display rows calculate balances and manual positions in one query', () => {
  const f = fixture();
  f.transactions.push(
    { id: 'later', accountId: 'a', date: '2026-01-03', createdAt: 3, amount: 25, label: 'Loyer' }
  );
  const queries = create({ repository: f.repository, domain });
  const rows = queries.accountTransactionDisplayRows({
    accountId: 'a', typeFilter: 'all', query: '', sort: 'date-desc'
  });
  assert.deepEqual(rows.map(row => row.transaction.id), ['later', 'out', 'in']);
  assert.deepEqual(rows.map(row => row.balance), [165, 140, 150]);
  assert.deepEqual(rows.map(row => row.position), [2, 1, 0]);
  assert.ok(rows.every(row => row.accountTransactionCount === 3));
});

test('account transaction display rows retain zero balance and missing position for a deleted account', () => {
  const f = fixture();
  const queries = create({ repository: f.repository, domain });
  const rows = queries.accountTransactionDisplayRows({ accountId: 'missing' });
  assert.deepEqual(rows, []);
});

test('account projection starts from today balance, includes future operations and finds the forward cash low', () => {
  const f = fixture();
  f.transactions.push(
    { id: 'past', accountId: 'a', date: '2025-12-31', createdAt: 0, amount: -500 },
    { id: 'future-out', accountId: 'a', date: '2026-02-01', createdAt: 4, amount: -180 },
    { id: 'future-in', accountId: 'a', date: '2026-03-01', createdAt: 5, amount: 250 }
  );
  const queries = create({ repository: f.repository, domain });
  const result = queries.projectAccountBalance('a', '2026-01-31');
  assert.equal(result.endingBalance, -290);
  assert.equal(result.lowestBalance, -540);
  assert.equal(result.lowestDate, '2026-02-01');
  assert.equal(result.futureCount, 2);
});

test('professional projection uses adjusted amounts for future movements and ignores historical lows', () => {
  const f = fixture();
  f.transactions.push(
    { id: 'old-loss', accountId: 'a', date: '2025-12-01', createdAt: 0, amount: -900, professionalAmount: -900 },
    { id: 'future-provision', accountId: 'a', date: '2026-02-01', createdAt: 4, amount: 0, professionalAmount: -35 },
    { id: 'future-payment', accountId: 'a', date: '2026-03-01', createdAt: 5, amount: -20, professionalCategory: 'vat', professionalTreatment: 'effective', professionalAmount: 0 }
  );
  const queries = create({ repository: f.repository, domain });
  const result = queries.projectProfessionalAdjustedBalance('a', '2026-01-31');
  assert.equal(result.endingBalance, -795);
  assert.equal(result.lowestBalance, -795);
  assert.equal(result.lowestDate, '2026-02-01');
  assert.equal(result.futureCount, 2);
});
