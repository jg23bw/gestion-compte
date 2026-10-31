'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {create}=require('../../../src/application/synchronization/cloud-synchronization.js');

function fixture(options={}){
 const calls=[];
 const repository=name=>({
  async listAll(){calls.push(name+'.list');if(name==='crypto'&&options.cryptoError)throw options.cryptoError;return [];},
  async upsertMany(rows){calls.push([name+'.upsert',rows]);return {compatibilityFallback:!!options.transactionFallback};},
  async deleteById(id){calls.push([name+'.delete',id]);if(options.deleteError)throw options.deleteError;}
 });
 const repos={accounts:repository('accounts'),templates:repository('templates'),transactions:repository('transactions'),crypto:repository('crypto')};
 const dirty={accountTypes:false,accountPledges:false,stockHoldings:false};
 const pending={accounts:new Set(),templates:new Set(),transactions:new Set(),crypto:new Set()};
 const service=create({
  accountRepository:()=>repos.accounts,recurringTemplateRepository:()=>repos.templates,
  transactionRepository:()=>repos.transactions,cryptoHoldingRepository:()=>repos.crypto,
  mapAccount:x=>x,mapTemplate:x=>x,mapTransaction:x=>x,mapCryptoHolding:x=>x,
  sameCloudValues:(a,b,keys)=>keys.every(k=>String(a[k]??'')===String(b[k]??'')),
  isMissingCryptoTable:e=>e.code==='PGRST205',
  saveAccountMetadata:async()=>{},saveStockHoldings:async()=>{},
  getAccountTypeOverrides:()=>({}),getAccountPledgeOverrides:()=>({}),
  normalizeStockHoldings:x=>x||[]
 });
 return {service,calls,dirty,pending,repos};
}
const state={accounts:[{id:'a'}],recurringTemplates:[{id:'t'}],transactions:[{id:'x'}],cryptoHoldings:[{id:'c'}],stockHoldings:[]};

test('synchronizes all repositories and clears successful deletions',async()=>{
 const f=fixture();
 for(const key of Object.keys(f.pending))f.pending[key].add(key+'-old');
 const result=await f.service.synchronize({client:{},userId:'u1',state,pending:f.pending,dirty:f.dirty,cryptoTableReady:null});
 assert.equal(result.cryptoTableReady,true);
 for(const key of Object.keys(f.pending))assert.equal(f.pending[key].size,0);
 assert.ok(f.calls.some(item=>Array.isArray(item)&&item[0]==='crypto.upsert'));
});

test('treats a missing crypto table as optional',async()=>{
 const f=fixture({cryptoError:Object.assign(new Error('missing'),{code:'PGRST205'})});
 const result=await f.service.synchronize({client:{},userId:'u1',state,pending:f.pending,dirty:f.dirty,cryptoTableReady:null});
 assert.equal(result.cryptoTableReady,false);
 assert.ok(f.calls.includes('accounts.list'));
});

test('retains pending deletion when remote deletion fails',async()=>{
 const f=fixture({deleteError:new Error('offline')});
 f.pending.transactions.add('old-id');
 await assert.rejects(f.service.synchronize({client:{},userId:'u1',state,pending:f.pending,dirty:f.dirty,cryptoTableReady:false}),/offline/);
 assert.equal(f.pending.transactions.has('old-id'),true);
});
