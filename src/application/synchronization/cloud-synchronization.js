/**
 * Application use case coordinating cloud synchronization across repositories.
 * UI notifications, sync locking and retry scheduling remain in the composition root.
 */
(function exposeCloudSynchronization(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CloudSynchronization = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create({
    accountRepository, recurringTemplateRepository, transactionRepository,
    cryptoHoldingRepository, mapAccount, mapTemplate, mapTransaction, mapCryptoHolding,
    sameCloudValues, isMissingCryptoTable, saveAccountMetadata, saveStockHoldings,
    getAccountTypeOverrides, getAccountPledgeOverrides, normalizeStockHoldings,
    onCompatibilityFallback = () => {}
  }) {
    const required = { accountRepository, recurringTemplateRepository, transactionRepository,
      cryptoHoldingRepository, mapAccount, mapTemplate, mapTransaction, mapCryptoHolding,
      sameCloudValues, isMissingCryptoTable, saveAccountMetadata, saveStockHoldings,
      getAccountTypeOverrides, getAccountPledgeOverrides, normalizeStockHoldings };
    for (const [name, value] of Object.entries(required)) {
      if (typeof value !== 'function') throw new TypeError(name + ' must be a function');
    }
    return Object.freeze({
      async synchronize({ client, userId, state, pending, dirty, cryptoTableReady }) {
        if (!client || !userId || !state || !pending || !dirty) throw new TypeError('client, userId, state, pending and dirty are required');
        const accountsRepo=accountRepository({client,userId});
        const templatesRepo=recurringTemplateRepository({client,userId});
        const transactionsRepo=transactionRepository({client,userId});
        const accounts=(state.accounts||[]).map(row=>mapAccount(row,userId));
        const templates=(state.recurringTemplates||[]).map(row=>mapTemplate(row,userId));
        const transactions=(state.transactions||[]).map(row=>mapTransaction(row,userId));
        const cryptoHoldings=(state.cryptoHoldings||[]).map(row=>mapCryptoHolding(row,userId));
        const [remoteAccountRows,remoteTransactionRows,remoteTemplateRows]=await Promise.all([
          accountsRepo.listAll(),transactionsRepo.listAll(),templatesRepo.listAll()
        ]);
        const remoteAccounts=new Map(remoteAccountRows.map(row=>[row.id,row]));
        const remoteTransactions=new Map(remoteTransactionRows.map(row=>[row.id,row]));
        const remoteTemplates=new Map(remoteTemplateRows.map(row=>[row.id,row]));
        const changedAccounts=accounts.filter(row=>!remoteAccounts.has(row.id)||!sameCloudValues(row,remoteAccounts.get(row.id),['name','short','kind','opening','vat_rate','social_rate','net_opening']));
        const changedTemplates=templates.filter(row=>!remoteTemplates.has(row.id)||!sameCloudValues(row,remoteTemplates.get(row.id),['account_id','day_of_month','frequency','months','start_month','end_month','once_date','label','amount','enabled']));
        const changedTransactions=transactions.filter(row=>!remoteTransactions.has(row.id)||!sameCloudValues(row,remoteTransactions.get(row.id),['account_id','transaction_date','label','amount','is_paid','sort_order','source','recurring_template_id','generated_month','recurring_key']));
        if(changedAccounts.length)await accountsRepo.upsertMany(changedAccounts);
        for(const id of [...pending.accounts]){await accountsRepo.deleteById(id);pending.accounts.delete(id);}
        if(changedTemplates.length)await templatesRepo.upsertMany(changedTemplates);
        if(changedTransactions.length){
          const result=await transactionsRepo.upsertMany(changedTransactions);
          if(result.compatibilityFallback)onCompatibilityFallback();
        }
        for(const id of [...pending.transactions]){await transactionsRepo.deleteById(id);pending.transactions.delete(id);}
        for(const id of [...pending.templates]){await templatesRepo.deleteById(id);pending.templates.delete(id);}
        if(cryptoTableReady!==false){
          const cryptoRepo=cryptoHoldingRepository({client,userId});
          let remoteCryptoRows;
          try{remoteCryptoRows=await cryptoRepo.listAll();cryptoTableReady=true;}
          catch(error){if(isMissingCryptoTable(error))cryptoTableReady=false;else throw error;}
          if(cryptoTableReady){
            const remoteCrypto=new Map(remoteCryptoRows.map(row=>[row.id,row]));
            const changedCrypto=cryptoHoldings.filter(row=>!remoteCrypto.has(row.id)||!sameCloudValues(row,remoteCrypto.get(row.id),['symbol','name','coingecko_id','status','invested','quantity','sort_order']));
            if(changedCrypto.length)await cryptoRepo.upsertMany(changedCrypto);
            for(const id of [...pending.crypto]){await cryptoRepo.deleteById(id);pending.crypto.delete(id);}
          }
        }
        if(dirty.accountTypes||dirty.accountPledges){
          const overrides=getAccountTypeOverrides(),pledges=getAccountPledgeOverrides();
          const snapshot=JSON.stringify({overrides,pledges});
          await saveAccountMetadata({overrides,pledges});
          if(JSON.stringify({overrides:getAccountTypeOverrides(),pledges:getAccountPledgeOverrides()})===snapshot){
            dirty.accountTypes=false;dirty.accountPledges=false;
          }
        }
        if(dirty.stockHoldings){
          const payload=normalizeStockHoldings(state.stockHoldings);
          const snapshot=JSON.stringify(payload);
          await saveStockHoldings(payload);
          if(JSON.stringify(normalizeStockHoldings(state.stockHoldings))===snapshot)dirty.stockHoldings=false;
        }
        return {cryptoTableReady};
      }
    });
  }
  return Object.freeze({create});
});
