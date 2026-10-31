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
  saveAccountMetadata:options.saveAccountMetadata|| (async()=>{}),saveStockHoldings:async()=>{},
  getAccountTypeOverrides:options.getAccountTypeOverrides||(()=>({})),
  getAccountPledgeOverrides:options.getAccountPledgeOverrides||(()=>({})),
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


test('persists account type and pledge metadata together and clears their dirty flags',async()=>{
 const saved=[];
 const f=fixture({
  getAccountTypeOverrides:()=>({'account-1':'pea'}),
  getAccountPledgeOverrides:()=>({'account-1':{note:'Crédit lombard'}}),
  saveAccountMetadata:async metadata=>saved.push(metadata)
 });
 f.dirty.accountTypes=true;
 f.dirty.accountPledges=true;
 await f.service.synchronize({client:{},userId:'u1',state,pending:f.pending,dirty:f.dirty,cryptoTableReady:false});
 assert.deepEqual(saved,[{
  overrides:{'account-1':'pea'},
  pledges:{'account-1':{note:'Crédit lombard'}}
 }]);
 assert.equal(f.dirty.accountTypes,false);
 assert.equal(f.dirty.accountPledges,false);
});

test('keeps account metadata dirty when it changes during the asynchronous save',async()=>{
 let currentTypes={'account-1':'pea'};
 let markSaveStarted;
 let releaseSave;
 const saveStarted=new Promise(resolve=>{markSaveStarted=resolve;});
 const saveGate=new Promise(resolve=>{releaseSave=resolve;});
 const f=fixture({
  getAccountTypeOverrides:()=>currentTypes,
  getAccountPledgeOverrides:()=>({}),
  saveAccountMetadata:async()=>{markSaveStarted();await saveGate;}
 });
 f.dirty.accountTypes=true;
 f.dirty.accountPledges=true;
 const synchronization=f.service.synchronize({client:{},userId:'u1',state,pending:f.pending,dirty:f.dirty,cryptoTableReady:false});
 await saveStarted;
 currentTypes={'account-1':'av'};
 releaseSave();
 await synchronization;
 assert.equal(f.dirty.accountTypes,true);
 assert.equal(f.dirty.accountPledges,true);
});
