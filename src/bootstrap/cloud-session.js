/**
 * Cloud session orchestration during the legacy-to-hexagonal migration.
 * The composition root supplies the referenced repositories, state and UI callbacks.
 */
async function syncCloudState(){
  if(!cloud.user||cloud.isApplyingCloud)return;
  if(cloud.isSyncing){
    cloud.syncAgain=true;
    await new Promise(resolve=>{
      const waitForSync=()=>cloud.isSyncing?setTimeout(waitForSync,50):resolve();
      waitForSync();
    });
    return syncCloudState();
  }
  cloud.isSyncing=true;
  try{
    const client=cloudClient(),uid=cloud.user.id;
    const dirty={
      get accountTypes(){return cloud.accountTypesDirty;},
      set accountTypes(value){cloud.accountTypesDirty=value;},
      get accountPledges(){return cloud.accountPledgesDirty;},
      set accountPledges(value){cloud.accountPledgesDirty=value;},
      get stockHoldings(){return cloud.stockHoldingsDirty;},
      set stockHoldings(value){cloud.stockHoldingsDirty=value;}
    };
    const synchronization=CloudSynchronization.create({
      accountRepository:options=>SupabaseAccountRepository.create(options),
      recurringTemplateRepository:options=>SupabaseRecurringTemplateRepository.create(options),
      transactionRepository:options=>SupabaseTransactionRepository.create(options),
      cryptoHoldingRepository:options=>SupabaseCryptoHoldingRepository.create(options),
      mapAccount:toCloudAccount,mapTemplate:toCloudTemplate,mapTransaction:toCloudTransaction,mapCryptoHolding:toCloudCryptoHolding,
      sameCloudValues,isMissingCryptoTable,
      saveAccountMetadata:({overrides,pledges})=>saveAccountMetadataToAuth(overrides,pledges),
      saveStockHoldings:holdings=>saveStockHoldingsToAuth(holdings),
      getAccountTypeOverrides:accountTypeOverrides,getAccountPledgeOverrides:accountPledgeOverrides,
      normalizeStockHoldings,
      onCompatibilityFallback:()=>showToast('Migration Supabase requise : exécutez supabase/migrations/202610180002_transaction_pointage_order.sql dans SQL Editor. Le pointage et l’ordre manuel ne seront pas conservés avant cela.')
    });
    const result=await synchronization.synchronize({
      client,userId:uid,state,
      pending:{accounts:cloud.pendingAccountDeletes,templates:cloud.pendingTemplateDeletes,transactions:cloud.pendingDeletes,crypto:cloud.pendingCryptoDeletes},
      dirty,cryptoTableReady
    });
    cryptoTableReady=result.cryptoTableReady;
    cloudStatus('Synchronisé en ligne',true);
    return true;
  }catch(error){
    console.error('Supabase sync failed',error);
    cloudStatus('Erreur de synchronisation',false);
    showToast('Sauvegarde en ligne impossible : '+(error.message||'vérifiez la configuration Supabase.'));
    return false;
  }finally{
    cloud.isSyncing=false;
    cloud.syncAgain=false;
    if(cryptoTableReady===false)renderCrypto();
  }
}
async function loadCloudState(user){
  if(!user||!cloud.user||cloud.user.id!==user.id)return;
  if(cloud.loadedUserId===user.id)return;
  cloud.loadedUserId=user.id;
  cloudStatus('Chargement des données…',true);
  $('auth-gate').hidden=false;
  $('app-shell').hidden=true;
  try{
    const client=cloudClient();
    const remoteData=await CloudStateLoader.create({
      accountRepository:options=>SupabaseAccountRepository.create(options),
      transactionRepository:options=>SupabaseTransactionRepository.create(options),
      recurringTemplateRepository:options=>SupabaseRecurringTemplateRepository.create(options),
      cryptoHoldingRepository:options=>SupabaseCryptoHoldingRepository.create(options),
      mapAccount:fromCloudAccount,
      mapTransaction:fromCloudTransaction,
      mapRecurringTemplate:fromCloudTemplate,
      mapCryptoHolding:fromCloudCryptoHolding,
      normalizeLombardCredit,
      normalizeAccountTypes,
      normalizeAccountPledges,
      normalizeStockHoldings,
      isMissingCryptoTable
    }).load({client,user});
    if(!cloud.user||cloud.user.id!==user.id)return;
    cryptoTableReady=remoteData.cryptoTableReady;
    const {
      accounts:remoteAccounts,
      transactions:remoteTransactions,
      recurringTemplates:remoteTemplates,
      cryptoHoldings,
      lombardCredit:remoteLombard,
      accountTypes:remoteAccountTypes,
      accountPledges:remoteAccountPledges,
      stockHoldings:remoteStockHoldings
    }=remoteData;

    // L'ancien cache local n'est consulté qu'après authentification, pour permettre une migration volontaire.
    let legacy=null;
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
      if(saved&&Array.isArray(saved.accounts)&&Array.isArray(saved.transactions))legacy=loadState();
    }catch(error){console.warn('Anciennes données locales illisibles',error);}
    const existingAccountIds=new Set(remoteAccounts.map(account=>account.id));
    const loadedStockHoldings=remoteStockHoldings.filter(holding=>existingAccountIds.has(holding.accountId));
    const loadedAccountPledges=Object.fromEntries(Object.entries(remoteAccountPledges).filter(([id])=>existingAccountIds.has(id)));
    const remoteHasData=remoteAccounts.length+remoteTransactions.length+remoteTemplates.length+(remoteLombard?1:0)+loadedStockHoldings.length+Object.keys(loadedAccountPledges).length>0;
    const hasLegacy=!!legacy&&(legacy.accounts.length+legacy.transactions.length+(legacy.recurringTemplates||[]).length>0);

    let importLocal=false;
    if(!remoteHasData){
      importLocal=hasLegacy&&window.confirm('Votre espace en ligne est vide.\n\nImporter les anciennes données présentes dans ce navigateur dans CE compte utilisateur ?\n\nAcceptez uniquement si ces données vous appartiennent. Si ce navigateur a servi à une autre personne, choisissez Annuler.');
      const importedAccounts=legacy?accountTypeCommands.applyOverrides(legacy.accounts||[],remoteAccountTypes):[];
      state=importLocal?{...legacy,accounts:importedAccounts,cryptoHoldings,stockHoldings:loadedStockHoldings,accountPledges:loadedAccountPledges,lombardCredit:remoteLombard}:{accounts:DEFAULT_ACCOUNTS.map(a=>({...a})),transactions:[],recurringTemplates:[],cryptoHoldings,stockHoldings:[],accountPledges:{},lombardCredit:remoteLombard};
    }else{
      // Le compte Supabase connecté est la source de vérité : aucune fusion avec le cache local.
      state={accounts:remoteAccounts,transactions:remoteTransactions,recurringTemplates:remoteTemplates,cryptoHoldings,stockHoldings:loadedStockHoldings,accountPledges:loadedAccountPledges,lombardCredit:remoteLombard};
    }

    cloud.accountTypesDirty=importLocal&&accountTypeCommands.hasOverrides(state.accounts);
    cloud.accountPledgesDirty=false;
    cloud.stockHoldingsDirty=false;
    normalizeTransactionOrder();
    cloud.isApplyingCloud=true;
    renderAll();
    cloud.isApplyingCloud=false;
    const synced=await syncCloudState();
    if(!synced)throw new Error('La synchronisation Supabase a échoué. Les anciennes données locales ont été conservées.');
    if(!cloud.user||cloud.user.id!==user.id)return;
    loadCryptoPrices();
    loadStockPrices();

    // Après confirmation de la sauvegarde cloud, supprimer le cache local historique.
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('gestion-comptes-cloud-migration-backup-v1');
    cloud.accountTypesDirty=false;
    cloud.accountPledgesDirty=false;
    cloud.stockHoldingsDirty=false;
    cloud.authReady=true;
    $('auth-gate').hidden=true;
    $('app-shell').hidden=false;
    if($('cloud-dialog').open)$('cloud-dialog').close();
    cloudStatus('Synchronisé en ligne',true);
    showToast(remoteHasData?'Données chargées depuis votre compte.':(hasLegacy&&importLocal?'Données importées dans votre compte.':'Votre espace en ligne est prêt.'));
  }catch(error){
    cloud.isApplyingCloud=false;
    cloud.loadedUserId=null;
    cloud.authReady=false;
    cloud.accountTypesDirty=false;
    cloud.accountPledgesDirty=false;
    cloud.stockHoldingsDirty=false;
    state={accounts:[],transactions:[],recurringTemplates:[],cryptoHoldings:[],stockHoldings:[],accountPledges:{},lombardCredit:null};
    $('app-shell').hidden=true;
    $('auth-gate').hidden=false;
    cloudStatus('Cloud indisponible',false);
    cloudMessage('Impossible de charger/sauvegarder vos données : '+(error.message||'vérifiez le schéma SQL et les règles RLS dans Supabase.'));
    console.error('Supabase load failed',error);
  }
}
