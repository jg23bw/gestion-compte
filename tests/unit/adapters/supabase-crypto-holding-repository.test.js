'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/adapters/persistence/supabase/crypto-holding-repository.js');

function fakeClient({ rows = [], readError = null, writeError = null, deleteError = null } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      assert.equal(table, 'crypto_holdings');
      return {
        select(columns) { calls.push({ operation: 'select', columns }); return Promise.resolve({ data: rows, error: readError }); },
        upsert(payload, options) { calls.push({ operation: 'upsert', payload, options }); return Promise.resolve({ error: writeError }); },
        delete() { calls.push({ operation: 'delete' }); return { eq(column,value) {
          calls.push({ operation: 'eq', column, value }); return { eq(secondColumn,secondValue) {
            calls.push({ operation: 'eq', column:secondColumn, value:secondValue }); return Promise.resolve({ error: deleteError });
          }};
        }}; }
      };
    }
  };
}

test('lists crypto holdings and propagates read errors', async () => {
  const client=fakeClient({rows:[{id:'crypto-1'}]});
  assert.deepEqual(await create({client,userId:'user-1'}).listAll(),[{id:'crypto-1'}]);
  const failing=create({client:fakeClient({readError:new Error('read failed')}),userId:'user-1'});
  await assert.rejects(failing.listAll(),error=>error.message==='read failed');
});

test('upserts holdings with user_id,id conflict target and propagates errors', async () => {
  const client=fakeClient();
  await create({client,userId:'user-1'}).upsertMany([{id:'crypto-1',user_id:'user-1'}]);
  assert.deepEqual(client.calls[0],{operation:'upsert',payload:[{id:'crypto-1',user_id:'user-1'}],options:{onConflict:'user_id,id'}});
  const failing=create({client:fakeClient({writeError:new Error('write failed')}),userId:'user-1'});
  await assert.rejects(failing.upsertMany([{id:'crypto-1'}]),error=>error.message==='write failed');
});

test('deletes holdings scoped to authenticated user', async () => {
  const client=fakeClient();
  await create({client,userId:'user-1'}).deleteById('crypto-1');
  assert.deepEqual(client.calls,[
    {operation:'delete'},
    {operation:'eq',column:'id',value:'crypto-1'},
    {operation:'eq',column:'user_id',value:'user-1'}
  ]);
});
