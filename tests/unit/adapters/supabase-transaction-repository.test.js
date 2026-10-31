'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/adapters/persistence/supabase/transaction-repository.js');

function fakeClient({ rows = [], upsertResults = [], selectError = null, deleteError = null } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      return {
        select(columns) {
          calls.push({ operation: 'select', table, columns });
          return Promise.resolve({ data: rows, error: selectError });
        },
        upsert(payload, options) {
          calls.push({ operation: 'upsert', table, payload, options });
          return Promise.resolve(upsertResults.shift() || { error: null });
        },
        delete() {
          calls.push({ operation: 'delete', table });
          return {
            eq(column, value) {
              calls.push({ operation: 'eq', column, value });
              return {
                eq(secondColumn, secondValue) {
                  calls.push({ operation: 'eq', column: secondColumn, value: secondValue });
                  return Promise.resolve({ error: deleteError });
                }
              };
            }
          };
        }
      };
    }
  };
}

test('lists transaction rows and propagates read errors', async () => {
  const client = fakeClient({ rows: [{ id: 'tx-1' }] });
  const repository = create({ client, userId: 'user-1' });
  assert.deepEqual(await repository.listAll(), [{ id: 'tx-1' }]);
  const failing = create({ client: fakeClient({ selectError: new Error('read failed') }), userId: 'user-1' });
  await assert.rejects(failing.listAll(), /read failed/);
});

test('upserts using the existing id conflict target', async () => {
  const client = fakeClient();
  const repository = create({ client, userId: 'user-1' });
  const result = await repository.upsertMany([{ id: 'tx-1', user_id: 'user-1' }]);
  assert.deepEqual(result, { compatibilityFallback: false });
  assert.deepEqual(client.calls[0], {
    operation: 'upsert',
    table: 'transactions',
    payload: [{ id: 'tx-1', user_id: 'user-1' }],
    options: { onConflict: 'id' }
  });
});

test('retries legacy schema errors without pointage and order columns', async () => {
  const client = fakeClient({ upsertResults: [
    { error: { message: 'column recurring_key does not exist' } },
    { error: null }
  ] });
  const repository = create({ client, userId: 'user-1' });
  const result = await repository.upsertMany([{
    id: 'tx-1', recurring_key: 'template:2026-10', is_paid: true, sort_order: 3, label: 'Loyer'
  }]);
  assert.deepEqual(result, { compatibilityFallback: true });
  assert.deepEqual(client.calls[1].payload, [{ id: 'tx-1', label: 'Loyer' }]);
  assert.deepEqual(client.calls[1].options, { onConflict: 'id' });
});

test('does not retry unrelated upsert errors and propagates fallback errors', async () => {
  const unrelated = create({ client: fakeClient({ upsertResults: [{ error: { message: 'permission denied' } }] }), userId: 'user-1' });
  await assert.rejects(unrelated.upsertMany([{ id: 'tx-1' }]), error => error.message === 'permission denied');
  const fallbackFailure = create({ client: fakeClient({ upsertResults: [
    { error: { message: 'column is_paid does not exist' } },
    { error: { message: 'fallback failed' } }
  ] }), userId: 'user-1' });
  await assert.rejects(fallbackFailure.upsertMany([{ id: 'tx-1', is_paid: true }]), error => error.message === 'fallback failed');
});

test('deletes a transaction scoped to its authenticated user', async () => {
  const client = fakeClient();
  const repository = create({ client, userId: 'user-1' });
  await repository.deleteById('tx-1');
  assert.deepEqual(client.calls, [
    { operation: 'delete', table: 'transactions' },
    { operation: 'eq', column: 'id', value: 'tx-1' },
    { operation: 'eq', column: 'user_id', value: 'user-1' }
  ]);
});
