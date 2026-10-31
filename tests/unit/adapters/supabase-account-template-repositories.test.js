'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create: createAccounts } = require('../../../src/adapters/persistence/supabase/account-repository.js');
const { create: createTemplates } = require('../../../src/adapters/persistence/supabase/recurring-template-repository.js');

function fakeClient(tableName, { rows = [], readError = null, writeError = null, deleteError = null } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      assert.equal(table, tableName);
      return {
        select(columns) {
          calls.push({ operation: 'select', table, columns });
          return Promise.resolve({ data: rows, error: readError });
        },
        upsert(payload, options) {
          calls.push({ operation: 'upsert', table, payload, options });
          return Promise.resolve({ error: writeError });
        },
        delete() {
          calls.push({ operation: 'delete', table });
          return { eq(column, value) {
            calls.push({ operation: 'eq', column, value });
            return { eq(secondColumn, secondValue) {
              calls.push({ operation: 'eq', column: secondColumn, value: secondValue });
              return Promise.resolve({ error: deleteError });
            }};
          }};
        }
      };
    }
  };
}

for (const [label, create, table, conflict] of [
  ['account', createAccounts, 'accounts', 'user_id,id'],
  ['recurring template', createTemplates, 'recurring_templates', 'user_id,id']
]) {
  test(label + ' repository reads rows and propagates read errors', async () => {
    const client = fakeClient(table, { rows: [{ id: 'row-1' }] });
    assert.deepEqual(await create({ client, userId: 'user-1' }).listAll(), [{ id: 'row-1' }]);
    const failing = create({ client: fakeClient(table, { readError: new Error('read failed') }), userId: 'user-1' });
    await assert.rejects(failing.listAll(), error => error.message === 'read failed');
  });

  test(label + ' repository upserts with the existing conflict target', async () => {
    const client = fakeClient(table);
    await create({ client, userId: 'user-1' }).upsertMany([{ id: 'row-1', user_id: 'user-1' }]);
    assert.deepEqual(client.calls[0], {
      operation: 'upsert', table, payload: [{ id: 'row-1', user_id: 'user-1' }],
      options: { onConflict: conflict }
    });
  });

  test(label + ' repository deletes only rows belonging to the authenticated user', async () => {
    const client = fakeClient(table);
    await create({ client, userId: 'user-1' }).deleteById('row-1');
    assert.deepEqual(client.calls, [
      { operation: 'delete', table },
      { operation: 'eq', column: 'id', value: 'row-1' },
      { operation: 'eq', column: 'user_id', value: 'user-1' }
    ]);
  });

  test(label + ' repository propagates write errors', async () => {
    const repository = create({ client: fakeClient(table, { writeError: new Error('write failed') }), userId: 'user-1' });
    await assert.rejects(repository.upsertMany([{ id: 'row-1' }]), error => error.message === 'write failed');
  });
}
