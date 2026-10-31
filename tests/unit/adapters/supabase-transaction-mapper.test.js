'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/adapters/persistence/supabase/transaction-mapper.js');

test('maps an ordinary transaction to the existing Supabase schema', () => {
  const mapper = create({ now: () => new Date('2026-10-31T10:00:00.000Z') });
  const row = mapper.toCloud({
    id: 'tx-1', accountId: 'account-1', date: '2026-10-30',
    label: 'Loyer', amount: 850.5, isPaid: true, sortOrder: 2, createdAt: 1000
  }, 'user-1');
  assert.deepEqual(row, {
    id: 'tx-1', user_id: 'user-1', account_id: 'account-1',
    transaction_date: '2026-10-30', label: 'Loyer', amount: 850.5,
    is_paid: true, sort_order: 2, source: 'manual',
    recurring_template_id: null, generated_month: null, recurring_key: null,
    created_at: '1970-01-01T00:00:01.000Z',
    updated_at: '2026-10-31T10:00:00.000Z'
  });
});

test('maps recurring transaction metadata without changing its keys', () => {
  const mapper = create({ now: () => new Date('2026-10-31T10:00:00.000Z') });
  const row = mapper.toCloud({
    id: 'tx-2', accountId: 'account-1', date: '2026-10-12',
    label: 'Abonnement', amount: -12, recurringTemplateId: 'template-1',
    recurringKey: 'template-1:2026-10'
  }, 'user-1');
  assert.equal(row.source, 'recurring');
  assert.equal(row.recurring_template_id, 'template-1');
  assert.equal(row.generated_month, '2026-10');
  assert.equal(row.recurring_key, 'template-1:2026-10');
  assert.equal(row.is_paid, false);
  assert.equal(row.sort_order, null);
});

test('maps Supabase rows back to the canonical transaction model', () => {
  const mapper = create({ now: () => new Date('2026-10-31T10:00:00.000Z') });
  const transaction = mapper.fromCloud({
    id: 'tx-3', account_id: 'account-2', transaction_date: '2026-10-02',
    amount: '-25.75', label: 'Courses', is_paid: true, sort_order: 4,
    created_at: '2026-10-02T08:30:00.000Z', recurring_key: null,
    recurring_template_id: null
  });
  assert.deepEqual(transaction, {
    id: 'tx-3', accountId: 'account-2', date: '2026-10-02',
    amount: -25.75, label: 'Courses', isPaid: true, sortOrder: 4,
    createdAt: Date.parse('2026-10-02T08:30:00.000Z'),
    recurringKey: undefined, recurringTemplateId: undefined
  });
});

test('uses injected clock for missing creation timestamps and nullable sort order', () => {
  const mapper = create({ now: () => new Date('2026-10-31T10:00:00.000Z') });
  const transaction = mapper.fromCloud({
    id: 'tx-4', account_id: 'a', transaction_date: '2026-10-01',
    amount: 1, label: 'Test', is_paid: false, sort_order: null,
    created_at: null, recurring_key: null, recurring_template_id: null
  });
  assert.equal(transaction.createdAt, Date.parse('2026-10-31T10:00:00.000Z'));
  assert.equal(transaction.sortOrder, undefined);
});
