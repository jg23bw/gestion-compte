'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/adapters/persistence/supabase/auth-metadata-repository.js');

test('updates private Auth metadata and publishes refreshed user', async () => {
  const user={id:'user-1',user_metadata:{stockHoldings:[]}};
  const calls=[];
  const repository=create({auth:{async updateUser(payload){calls.push(payload);return {data:{user},error:null};}},onUserUpdated:updated=>calls.push(updated)});
  assert.equal(await repository.update({stockHoldings:[{id:'stock-1'}]}),user);
  assert.deepEqual(calls,[{data:{stockHoldings:[{id:'stock-1'}]}},user]);
});

test('propagates Auth errors without publishing a user', async () => {
  const failure=new Error('Auth update failed');
  let published=false;
  const repository=create({auth:{async updateUser(){return {data:null,error:failure};}},onUserUpdated:()=>{published=true;}});
  await assert.rejects(repository.update({lombardCredit:null}),error=>error===failure);
  assert.equal(published,false);
});

test('validates Auth client and metadata payload', async () => {
  assert.throws(()=>create({auth:{}}),/updateUser/);
  const repository=create({auth:{async updateUser(){return {data:{user:null},error:null};}}});
  await assert.rejects(repository.update([]),/metadata must be an object/);
});
