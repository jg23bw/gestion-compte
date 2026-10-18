const STORAGE_KEY = 'gestion-comptes-v1';
const GENERATED_MONTHS_KEY = 'gestion-comptes-generated-months-v1';
const generationInProgress = new Set();
const DEFAULT_ACCOUNTS = [
  {id:'lbp',name:'La Banque Postale',short:'LB',kind:'bank',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'fortuneo',name:'Fortuneo',short:'F',kind:'bank',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'fortuneo-plus',name:'Fortuneo livret Plus',short:'F+',kind:'savings',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'cic-montpont',name:'CIC Montpont-Ménestrol',short:'CIC',kind:'bank',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'cic-montevrayn',name:'CIC Montévrain',short:'CIC',kind:'bank',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'bourso',name:'Boursobank',short:'B',kind:'bank',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'bourso-plus',name:'Livret Boursobank Boursoplus',short:'B+',kind:'savings',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'bourso-first',name:'Livret Boursobank BoursoFirst',short:'BF',kind:'savings',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'tiime',name:'Compte professionnel Tiime',short:'T',kind:'pro',opening:0,vatRate:20,socialRate:45,netOpening:0}
];

// Les modèles de récurrence sont des données personnelles : ils ne doivent pas être codés en dur dans le dépôt public.
const DEFAULT_RECURRING_TEMPLATES = [];

const $ = id => document.getElementById(id);
const euro = value => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(value)||0);
const dateFormat = value => { if(!value)return '—'; const d=new Date(value+'T12:00:00'); return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short',year:'numeric'}).format(d); };
const today = () => {const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
let state = {accounts:[],transactions:[],recurringTemplates:[]};
let toastTimer;
let undoPoint=null;
function cloneData(value){return JSON.parse(JSON.stringify(value));}
function prepareUndo(){undoPoint={state:cloneData(state),pendingDeletes:[...cloud.pendingDeletes],pendingTemplateDeletes:[...cloud.pendingTemplateDeletes],generatedMonths:localStorage.getItem(GENERATED_MONTHS_KEY)};}
function undoLastAction(){
  if(!undoPoint)return;
  const target=undoPoint;
  const currentTransactions=state.transactions||[],currentTemplates=state.recurringTemplates||[];
  const restoredTransactionIds=new Set((target.state.transactions||[]).map(t=>t.id));
  const restoredTemplateIds=new Set((target.state.recurringTemplates||[]).map(t=>t.id));
  const currentTransactionIds=new Set(currentTransactions.map(t=>t.id));
  const currentTemplateIds=new Set(currentTemplates.map(t=>t.id));
  state=cloneData(target.state);
  cloud.pendingDeletes=new Set(target.pendingDeletes);
  cloud.pendingTemplateDeletes=new Set(target.pendingTemplateDeletes);
  // Added items are queued for deletion; deleted items restored to state are upserted again.
  if(cloud.user){
    currentTransactions.forEach(t=>{if(!restoredTransactionIds.has(t.id))cloud.pendingDeletes.add(t.id);});
    currentTemplates.forEach(t=>{if(!restoredTemplateIds.has(t.id))cloud.pendingTemplateDeletes.add(t.id);});
    (state.transactions||[]).forEach(t=>{if(!currentTransactionIds.has(t.id))cloud.pendingDeletes.delete(t.id);});
    (state.recurringTemplates||[]).forEach(t=>{if(!currentTemplateIds.has(t.id))cloud.pendingTemplateDeletes.delete(t.id);});
  }
  if(target.generatedMonths===null)localStorage.removeItem(GENERATED_MONTHS_KEY);else localStorage.setItem(GENERATED_MONTHS_KEY,target.generatedMonths);
  undoPoint=null;renderAll();showToast('Action annulée.');
}

const cloud = {client:null,session:null,user:null,syncTimer:null,isApplyingCloud:false,isSyncing:false,syncAgain:false,loadedUserId:null,pendingDeletes:new Set(),pendingTemplateDeletes:new Set(),authReady:false};
function cloudMessage(message){const el=$('cloud-message');if(el)el.textContent=message||'';}
function cloudStatus(message,connected=false){const el=$('cloud-status');if(!el)return;el.innerHTML='<i></i> '+escapeHtml(message);el.classList.toggle('cloud-connected',connected);}
function cloudClient(){
  if(cloud.client)return cloud.client;
  const config=window.GESTION_SUPABASE_CONFIG;
  if(!config?.url||!config?.publishableKey||!window.supabase?.createClient)throw new Error('Configuration Supabase introuvable. Vérifiez supabase-config.js et la connexion internet.');
  cloud.client=window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return cloud.client;
}
function toCloudAccount(a,userId){return {id:a.id,user_id:userId,name:a.name,short:a.short||'',kind:a.kind,opening:Number(a.opening)||0,vat_rate:Number(a.vatRate??20),social_rate:Number(a.socialRate??45),net_opening:Number(a.netOpening)||0};}
function fromCloudAccount(a){return {id:a.id,name:a.name,short:a.short||'',kind:a.kind,opening:Number(a.opening)||0,vatRate:Number(a.vat_rate??20),socialRate:Number(a.social_rate??45),netOpening:Number(a.net_opening)||0};}
function toCloudTransaction(t,userId){return {id:t.id,user_id:userId,account_id:t.accountId,transaction_date:t.date,label:t.label,amount:Number(t.amount),is_paid:t.isPaid===true,sort_order:Number.isFinite(Number(t.sortOrder))?Number(t.sortOrder):null,source:t.recurringTemplateId?'recurring':'manual',recurring_template_id:t.recurringTemplateId||null,generated_month:t.recurringKey?t.date.slice(0,7):null,recurring_key:t.recurringKey||null,created_at:new Date(Number(t.createdAt)||Date.now()).toISOString(),updated_at:new Date().toISOString()};}
function fromCloudTransaction(t){return {id:t.id,accountId:t.account_id,date:t.transaction_date,amount:Number(t.amount),label:t.label,isPaid:t.is_paid===true,sortOrder:Number.isFinite(Number(t.sort_order))&&t.sort_order!==null?Number(t.sort_order):undefined,createdAt:Date.parse(t.created_at)||Date.now(),recurringKey:t.recurring_key||undefined,recurringTemplateId:t.recurring_template_id||undefined};}
function toCloudTemplate(t,userId){return {id:t.id,user_id:userId,account_id:t.accountId,day_of_month:Number(t.day)||1,frequency:t.frequency,months:t.months||[],start_month:t.startMonth||null,end_month:t.endMonth||null,once_date:t.date||null,label:t.label,amount:t.amount===''||t.amount===undefined?null:t.amount,enabled:t.enabled!==false};}
function fromCloudTemplate(t){return {id:t.id,accountId:t.account_id,day:Number(t.day_of_month)||1,frequency:t.frequency,months:t.months||[],startMonth:t.start_month||undefined,endMonth:t.end_month||undefined,date:t.once_date||undefined,label:t.label,amount:t.amount===null?null:Number(t.amount),enabled:t.enabled};}
function uniqueTransactions(rows){
  const byId=new Map();rows.forEach(t=>byId.set(t.id,t));
  const byRecurring=new Map(),result=[];
  [...byId.values()].forEach(t=>{if(t.recurringKey){if(byRecurring.has(t.recurringKey))return;byRecurring.set(t.recurringKey,true);}result.push(t);});
  return result;
}
function sameCloudValues(a,b,keys){return keys.every(key=>String(a[key]??'')===String(b[key]??''));}
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
    const accounts=state.accounts.map(a=>toCloudAccount(a,uid));
    const templates=(state.recurringTemplates||[]).map(t=>toCloudTemplate(t,uid));
    const transactions=state.transactions.map(t=>toCloudTransaction(t,uid));
    const [ar,tr,rr]=await Promise.all([
      client.from('accounts').select('*'),
      client.from('transactions').select('*'),
      client.from('recurring_templates').select('*')
    ]);
    for(const result of [ar,tr,rr])if(result.error)throw result.error;
    const remoteAccounts=new Map((ar.data||[]).map(row=>[row.id,row]));
    const remoteTransactions=new Map((tr.data||[]).map(row=>[row.id,row]));
    const remoteTemplates=new Map((rr.data||[]).map(row=>[row.id,row]));
    const changedAccounts=accounts.filter(row=>!remoteAccounts.has(row.id)||!sameCloudValues(row,remoteAccounts.get(row.id),['name','short','kind','opening','vat_rate','social_rate','net_opening']));
    const changedTemplates=templates.filter(row=>!remoteTemplates.has(row.id)||!sameCloudValues(row,remoteTemplates.get(row.id),['account_id','day_of_month','frequency','months','start_month','end_month','once_date','label','amount','enabled']));
    const changedTransactions=transactions.filter(row=>!remoteTransactions.has(row.id)||!sameCloudValues(row,remoteTransactions.get(row.id),['account_id','transaction_date','label','amount','is_paid','sort_order','source','recurring_template_id','generated_month','recurring_key']));
    if(changedAccounts.length){const {error}=await client.from('accounts').upsert(changedAccounts,{onConflict:'user_id,id'});if(error)throw error;}
    if(changedTemplates.length){const {error}=await client.from('recurring_templates').upsert(changedTemplates,{onConflict:'user_id,id'});if(error)throw error;}
    if(changedTransactions.length){
      let transactionResult=await client.from('transactions').upsert(changedTransactions,{onConflict:'id'});
      if(transactionResult.error&&/recurring.?key|is_paid|sort_order|schema cache|column.*not found/i.test(transactionResult.error.message||'')){
        // Compatibility fallback for older databases; the SQL migration is still required for full functionality.
        const compatibleRows=changedTransactions.map(({recurring_key,is_paid,sort_order,...row})=>row);
        transactionResult=await client.from('transactions').upsert(compatibleRows,{onConflict:'id'});
        if(!transactionResult.error){
          showToast('Migration Supabase requise : exécutez supabase/migrations/202610180002_transaction_pointage_order.sql dans SQL Editor. Le pointage et l’ordre manuel ne seront pas conservés avant cela.');
        }
      }
      if(transactionResult.error)throw transactionResult.error;
    }
    for(const id of [...cloud.pendingDeletes]){
      const {error}=await client.from('transactions').delete().eq('id',id).eq('user_id',uid);
      if(error)throw error;
      cloud.pendingDeletes.delete(id);
    }
    for(const id of [...cloud.pendingTemplateDeletes]){
      const {error}=await client.from('recurring_templates').delete().eq('id',id).eq('user_id',uid);
      if(error)throw error;
      cloud.pendingTemplateDeletes.delete(id);
    }
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
    const [ar,tr,rr]=await Promise.all([
      client.from('accounts').select('*'),
      client.from('transactions').select('*').order('transaction_date',{ascending:true}),
      client.from('recurring_templates').select('*')
    ]);
    for(const result of [ar,tr,rr])if(result.error)throw result.error;
    if(!cloud.user||cloud.user.id!==user.id)return;

    // L'ancien cache local n'est consulté qu'après authentification, pour permettre une migration volontaire.
    let legacy=null;
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
      if(saved&&Array.isArray(saved.accounts)&&Array.isArray(saved.transactions))legacy=loadState();
    }catch(error){console.warn('Anciennes données locales illisibles',error);}
    const remoteAccounts=(ar.data||[]).map(fromCloudAccount);
    const remoteTransactions=(tr.data||[]).map(fromCloudTransaction);
    const remoteTemplates=(rr.data||[]).map(fromCloudTemplate);
    const remoteHasData=remoteAccounts.length+remoteTransactions.length+remoteTemplates.length>0;
    const hasLegacy=!!legacy&&(legacy.accounts.length+legacy.transactions.length+(legacy.recurringTemplates||[]).length>0);

    let importLocal=false;
    if(!remoteHasData){
      importLocal=hasLegacy&&window.confirm('Votre espace en ligne est vide.\n\nImporter les anciennes données présentes dans ce navigateur dans CE compte utilisateur ?\n\nAcceptez uniquement si ces données vous appartiennent. Si ce navigateur a servi à une autre personne, choisissez Annuler.');
      state=importLocal?legacy:{accounts:DEFAULT_ACCOUNTS.map(a=>({...a})),transactions:[],recurringTemplates:[]};
    }else{
      // Le compte Supabase connecté est la source de vérité : aucune fusion avec le cache local.
      state={accounts:remoteAccounts,transactions:remoteTransactions,recurringTemplates:remoteTemplates};
    }

    normalizeTransactionOrder();
    cloud.isApplyingCloud=true;
    renderAll();
    cloud.isApplyingCloud=false;
    const synced=await syncCloudState();
    if(!synced)throw new Error('La synchronisation Supabase a échoué. Les anciennes données locales ont été conservées.');
    if(!cloud.user||cloud.user.id!==user.id)return;

    // Après confirmation de la sauvegarde cloud, supprimer le cache local historique.
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('gestion-comptes-cloud-migration-backup-v1');
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
    state={accounts:[],transactions:[],recurringTemplates:[]};
    $('app-shell').hidden=true;
    $('auth-gate').hidden=false;
    cloudStatus('Cloud indisponible',false);
    cloudMessage('Impossible de charger/sauvegarder vos données : '+(error.message||'vérifiez le schéma SQL et les règles RLS dans Supabase.'));
    console.error('Supabase load failed',error);
  }
}
function saveState(){
  // Pas de sauvegarde personnelle dans localStorage : Supabase est la source de vérité.
  if(!cloud.user||cloud.isApplyingCloud||!cloud.authReady)return;
  clearTimeout(cloud.syncTimer);
  cloudStatus('Enregistrement en cours…',true);
  cloud.syncTimer=setTimeout(()=>syncCloudState(),500);
}

function lockApp(message=''){
  clearTimeout(cloud.syncTimer);
  cloud.authReady=false;
  cloud.isApplyingCloud=true;
  state={accounts:[],transactions:[],recurringTemplates:[]};
  cloud.isApplyingCloud=false;
  $('app-shell').hidden=true;
  $('auth-gate').hidden=false;
  cloudStatus('Connexion requise',false);
  if(message)cloudMessage(message);
  const dialog=$('cloud-dialog');
  if(dialog&&!dialog.open){
    try{dialog.showModal();}catch(error){console.warn('Impossible d’ouvrir la fenêtre de connexion',error);}
  }
}

async function initCloud(){
  try{
    const client=cloudClient();
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    cloud.session=data.session;
    cloud.user=data.session?.user||null;

    client.auth.onAuthStateChange((event,session)=>{
      const previousUserId=cloud.user?.id||null;
      cloud.session=session;
      cloud.user=session?.user||null;
      if(!cloud.user){
        cloud.loadedUserId=null;
        if(event==='SIGNED_OUT'){
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem('gestion-comptes-cloud-migration-backup-v1');
        }
        lockApp(event==='SIGNED_OUT'?'Vous êtes déconnecté. Reconnectez-vous pour consulter vos données.':'Connectez-vous pour accéder à vos comptes.');
        return;
      }
      $('cloud-open').textContent='Compte connecté';
      $('cloud-logout').hidden=false;
      if(previousUserId!==cloud.user.id||event==='SIGNED_IN'){
        if(previousUserId&&previousUserId!==cloud.user.id)lockApp('Changement de compte : chargement de vos données privées…');
        cloud.loadedUserId=null;
        const currentUser=cloud.user;
        setTimeout(()=>{if(cloud.user?.id===currentUser.id)loadCloudState(currentUser);},0);
      }
    });

    if(cloud.user){
      $('cloud-open').textContent='Compte connecté';
      $('cloud-logout').hidden=false;
      await loadCloudState(cloud.user);
    }else{
      lockApp('Connectez-vous pour accéder à vos comptes, opérations et récurrences.');
    }
  }catch(error){
    cloud.user=null;
    cloud.session=null;
    lockApp('Connexion à Supabase impossible : '+(error.message||'vérifiez supabase-config.js et votre connexion internet.'));
    cloudStatus('Cloud non configuré',false);
    console.error('Supabase init failed',error);
  }
}

function loadState(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && Array.isArray(saved.accounts) && Array.isArray(saved.transactions)){
      const accounts=saved.accounts.map(a=>{const merged={...a,...(DEFAULT_ACCOUNTS.find(d=>d.id===a.id)||{}),...a};if(merged.id==='cic-montevrayn'&&merged.name==='CIC Montévrayn')merged.name='CIC Montévrain';return merged;});
      const recurringTemplates=Array.isArray(saved.recurringTemplates)?saved.recurringTemplates.map(t=>({...t})):[];
      DEFAULT_ACCOUNTS.forEach(d=>{if(!accounts.some(a=>a.id===d.id))accounts.push({...d});});
      return {accounts,transactions:saved.transactions,recurringTemplates};
    }
  }catch(e){console.warn('Données locales illisibles',e);}
  return {accounts:DEFAULT_ACCOUNTS.map(a=>({...a})),transactions:[],recurringTemplates:[]};
}

function accountById(id){return state.accounts.find(a=>a.id===id);}
function transactionOrder(a,b){const ao=Number.isFinite(Number(a.sortOrder))&&a.sortOrder!==null?Number(a.sortOrder):null,bo=Number.isFinite(Number(b.sortOrder))&&b.sortOrder!==null?Number(b.sortOrder):null;if(ao!==null&&bo!==null&&ao!==bo)return ao-bo;if(ao!==null&&bo===null)return -1;if(ao===null&&bo!==null)return 1;return b.date.localeCompare(a.date)||b.createdAt-a.createdAt;}
function accountTransactions(accountId){return state.transactions.filter(t=>t.accountId===accountId).sort(transactionOrder);}
function normalizeTransactionOrder(){for(const account of state.accounts){const rows=state.transactions.filter(t=>t.accountId===account.id).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);rows.forEach((t,index)=>{if(!Number.isFinite(Number(t.sortOrder))||t.sortOrder===null)t.sortOrder=index+1;});}}
function moveTransaction(id,direction){const current=state.transactions.find(t=>t.id===id);if(!current)return;const rows=accountTransactions(current.accountId);const index=rows.findIndex(t=>t.id===id),other=rows[index+direction];if(!other)return;prepareUndo();const currentOrder=Number(current.sortOrder),otherOrder=Number(other.sortOrder);current.sortOrder=otherOrder;other.sortOrder=currentOrder;renderAll();showToast('Ordre des opérations mis à jour.',true);}
function balanceAt(accountId,untilDate=null){
  const a=accountById(accountId);if(!a)return 0;
  return Number(a.opening||0)+accountTransactions(accountId).filter(t=>!untilDate||t.date<=untilDate).reduce((sum,t)=>sum+Number(t.amount),0);
}
function balanceAfterTransaction(transaction){
  const a=accountById(transaction.accountId);if(!a)return 0;
  let balance=Number(a.opening||0);
  for(const t of accountTransactions(transaction.accountId)){
    balance+=Number(t.amount);
    if(t.id===transaction.id)break;
  }
  return balance;
}
function tiimeCalc(account,amount){
  const rate=Math.min(100,Math.max(0,Number(account.vatRate)||0))/100;
  const social=Math.min(100,Math.max(0,Number(account.socialRate)||0))/100;
  if(amount>0){const ht=amount/(1+rate);return {vat:amount-ht,social:ht*social,net:ht*(1-social)};}
  return {vat:0,social:0,net:amount};
}
function tiimeNetBalance(account){
  return Number(account.netOpening||0)+accountTransactions(account.id).reduce((sum,t)=>sum+tiimeCalc(account,Number(t.amount)).net,0);
}
function bankLogo(account){
  const cls=account.id.startsWith('lbp')?'lbp':account.id.startsWith('fortuneo')?'fortuneo':account.id.startsWith('cic')?'cic':account.id.startsWith('bourso')?'bourso':'tiime';
  const icons={lbp:'https://commons.wikimedia.org/wiki/Special:FilePath/Logo_La_Banque_postale_2022.svg',fortuneo:'https://commons.wikimedia.org/wiki/Special:FilePath/Fortuneo.svg',cic:'https://commons.wikimedia.org/wiki/Special:FilePath/Cr%C3%A9dit_Industriel_et_Commercial_Logo.svg',bourso:'https://brandlogos.sgp1.digitaloceanspaces.com/svg/arcticons/boursobank.svg',tiime:'https://upload.wikimedia.org/wikipedia/commons/2/28/Tiime-logo-color.svg'};
  const src=icons[cls];
  return '<span class="bank-logo '+cls+'">'+(src?'<img src="'+src+'" alt="Logo '+escapeHtml(account.name)+'" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">':'')+'<span '+(src?'hidden':'')+'>'+escapeHtml(account.short||account.name.slice(0,2).toUpperCase())+'</span></span>';
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function kindLabel(a){return a.kind==='pro'?'Professionnel':a.kind==='savings'?'Épargne':'Compte courant';}
function accountMarkup(a,compact=false){
  const balance=balanceAt(a.id);
  if(compact)return '<div class="account-row" data-account-open="'+a.id+'">'+bankLogo(a)+'<div class="account-info"><strong>'+escapeHtml(a.name)+'</strong><small>'+kindLabel(a)+'</small></div><div class="account-balance">'+euro(balance)+'<small>'+state.transactions.filter(t=>t.accountId===a.id).length+' opération(s)</small></div></div>';
  const extra=a.kind==='pro'?'<div class="account-card-label">Net estimé après provisions : <strong>'+euro(tiimeNetBalance(a))+'</strong></div>':'<div class="account-card-label">'+state.transactions.filter(t=>t.accountId===a.id).length+' opération(s) enregistrée(s)</div>';
  return '<article class="account-card" data-account-open="'+a.id+'"><div class="account-card-top">'+bankLogo(a)+'<div class="account-info"><strong>'+escapeHtml(a.name)+'</strong><small>'+kindLabel(a)+'</small></div><button class="edit-account" data-edit-account="'+a.id+'" aria-label="Configurer '+escapeHtml(a.name)+'" title="Configurer le compte">···</button></div><div class="account-card-balance">'+euro(balance)+'</div>'+extra+'<div class="account-card-foot"><span>Solde actuel</span><button data-account-transactions="'+a.id+'">Historique →</button></div></article>';
}
function renderDashboard(){
  const total=state.accounts.reduce((sum,a)=>sum+balanceAt(a.id),0);
  const bank=state.accounts.filter(a=>a.kind!=='pro').reduce((sum,a)=>sum+balanceAt(a.id),0);
  const pro=accountById('tiime');
  $('total-balance').textContent=euro(total);$('bank-balance').textContent=euro(bank);$('pro-balance').textContent=euro(pro?tiimeNetBalance(pro):0);
  $('dashboard-accounts').innerHTML=state.accounts.map(a=>accountMarkup(a,true)).join('');
  const recent=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt).slice(0,6);
  $('recent-transactions').innerHTML=recent.length?recent.map(t=>{const a=accountById(t.accountId)||{name:'Compte supprimé'};return '<div class="recent-row"><span class="movement-icon '+(t.amount>=0?'income':'expense')+'">'+(t.amount>=0?'↙':'↗')+'</span><div class="movement-main"><strong>'+escapeHtml(t.label)+'</strong><small>'+escapeHtml(a.name)+' · '+dateFormat(t.date)+'</small></div><span class="movement-amount '+(t.amount>=0?'positive':'negative')+'">'+(t.amount>0?'+':'')+euro(t.amount)+'</span></div>';}).join(''):'<div class="empty-state">Aucune opération pour le moment.<br>Ajoutez une opération pour commencer.</div>';
  $('account-count').textContent=state.accounts.length;
}
function renderAccounts(){
  const query=$('account-search').value.trim().toLocaleLowerCase('fr'),kind=$('account-kind-filter')?.value||'all',sort=$('account-sort')?.value||'name-asc';
  const accounts=state.accounts.filter(a=>(a.name+' '+a.short).toLocaleLowerCase('fr').includes(query)&&(kind==='all'||a.kind===kind));
  accounts.sort((a,b)=>{if(sort==='name-desc')return b.name.localeCompare(a.name,'fr');if(sort==='balance-desc')return balanceAt(b.id)-balanceAt(a.id);if(sort==='balance-asc')return balanceAt(a.id)-balanceAt(b.id);if(sort==='kind')return kindLabel(a).localeCompare(kindLabel(b),'fr')||a.name.localeCompare(b.name,'fr');return a.name.localeCompare(b.name,'fr');});
  $('all-accounts').innerHTML=accounts.length?accounts.map(a=>accountMarkup(a)).join(''):'<div class="empty-state">Aucun compte ne correspond aux filtres.</div>';
  $('accounts-total-label').textContent=accounts.length+' / '+state.accounts.length+' comptes';
}
function fillAccountSelects(){
  const opts=state.accounts.map(a=>'<option value="'+a.id+'">'+escapeHtml(a.name)+'</option>').join('');
  $('transaction-account').innerHTML=opts;
  const current=$('transaction-account-filter').value;
  $('transaction-account-filter').innerHTML=opts;
  $('transaction-account-filter').value=state.accounts.some(a=>a.id===current)?current:(state.accounts[0]?.id||'');
  for(const id of ['history-account-filter','recurring-account-filter']){
    const filter=$(id); if(!filter) continue;
    const selected=filter.value;
    filter.innerHTML='<option value="all">Tous les comptes</option>'+opts;
    filter.value=selected==='all'||state.accounts.some(a=>a.id===selected)?selected:'all';
  }
}
function renderTransactions(){
  const accountFilter=$('transaction-account-filter').value,typeFilter=$('transaction-type-filter').value,query=$('transaction-search').value.trim().toLocaleLowerCase('fr'),sort=$('transaction-sort')?.value||'manual';
  const list=[...state.transactions].filter(t=>{const ac=accountById(t.accountId);return t.accountId===accountFilter&&(typeFilter==='all'||(typeFilter==='income'?t.amount>=0:t.amount<0))&&((t.label+' '+(ac?.name||'')).toLocaleLowerCase('fr').includes(query));});
  list.sort((a,b)=>{if(sort==='date-asc')return a.date.localeCompare(b.date)||a.createdAt-b.createdAt;if(sort==='date-desc')return b.date.localeCompare(a.date)||b.createdAt-a.createdAt;if(sort==='label')return a.label.localeCompare(b.label,'fr');if(sort==='amount-asc')return Number(a.amount)-Number(b.amount);if(sort==='amount-desc')return Number(b.amount)-Number(a.amount);if(sort==='pointed')return Number(b.isPaid===true)-Number(a.isPaid===true)||transactionOrder(a,b);return transactionOrder(a,b);});
  $('transaction-head').innerHTML='<tr><th>ORDRE</th><th>POINTÉE</th><th>DATE</th><th>OPÉRATION</th><th>COMPTE</th><th>MONTANT</th><th>SOLDE À DATE</th>'+(accountFilter==='tiime'?'<th>MONTANT APRÈS PROVISIONS</th><th>SOLDE NET ESTIMÉ</th>':'')+'<th>ACTIONS</th></tr>';
  $('transaction-rows').innerHTML=list.length?list.map(t=>{
    const a=accountById(t.accountId)||{name:'Compte supprimé',short:'?',kind:'bank'};
    const balance=balanceAfterTransaction(t);
    const calc=tiimeCalc(a,Number(t.amount));
    const net=tiimeNetBalance(a);
    const accountRows=accountTransactions(t.accountId);const accountPosition=accountRows.findIndex(item=>item.id===t.id);return '<tr class="'+(t.isPaid?'transaction-paid':'')+'"><td class="order-actions"><button type="button" data-move-transaction="'+t.id+'" data-direction="-1" '+(accountPosition<=0?'disabled':'')+' aria-label="Monter cette opération" title="Monter">↑</button><button type="button" data-move-transaction="'+t.id+'" data-direction="1" '+(accountPosition===accountRows.length-1?'disabled':'')+' aria-label="Descendre cette opération" title="Descendre">↓</button></td><td><label class="paid-check"><input type="checkbox" data-toggle-paid="'+t.id+'" '+(t.isPaid?'checked':'')+' aria-label="Marquer '+escapeHtml(t.label)+' comme débitée ou pointée"><span>'+(t.isPaid?'Pointée':'À pointer')+'</span></label></td><td>'+dateFormat(t.date)+'</td><td class="transaction-label">'+escapeHtml(t.label)+'</td><td><div class="table-account">'+bankLogo(a)+'<span>'+escapeHtml(a.name)+'</span></div></td><td class="table-amount '+(t.amount>=0?'positive':'negative')+'">'+(t.amount>0?'+':'')+euro(t.amount)+'</td><td class="table-balance">'+euro(balance)+'</td>'+(accountFilter==='tiime'?'<td>'+euro(calc.net)+'</td><td class="table-balance">'+euro(net)+'</td>':'')+'<td><div class="row-actions"><button data-edit-transaction="'+t.id+'">Modifier</button><button data-delete-transaction="'+t.id+'">Supprimer</button></div></td></tr>';
  }).join(''):'<tr><td colspan="'+(accountFilter==='tiime'?10:8)+'"><div class="empty-state">Aucune opération trouvée. Ajoutez une opération pour la voir ici.</div></td></tr>';
  $('transaction-footer').textContent=list.length+' opération(s) affichée(s) · Solde à date calculé à partir du solde de départ et des mouvements enregistrés.';
}

function renderMonthlyHistory(){
  if(!$('history-rows'))return;
  const month=$('history-month').value||monthValueNow(),accountFilter=$('history-account-filter').value||'all',typeFilter=$('history-type-filter').value||'all',query=$('history-search').value.trim().toLocaleLowerCase('fr'),sort=$('history-sort').value||'date-asc';
  let rows=state.transactions.filter(t=>{const ac=accountById(t.accountId);return String(t.date||'').slice(0,7)===month&&(accountFilter==='all'||t.accountId===accountFilter)&&(typeFilter==='all'||(typeFilter==='income'?Number(t.amount)>=0:Number(t.amount)<0))&&((t.label+' '+(ac?.name||'')).toLocaleLowerCase('fr').includes(query));});
  rows.sort((a,b)=>{if(sort==='date-desc')return b.date.localeCompare(a.date)||b.createdAt-a.createdAt;if(sort==='label')return a.label.localeCompare(b.label,'fr');if(sort==='amount-asc')return Number(a.amount)-Number(b.amount);if(sort==='amount-desc')return Number(b.amount)-Number(a.amount);if(sort==='account')return (accountById(a.accountId)?.name||'').localeCompare(accountById(b.accountId)?.name||'','fr')||a.date.localeCompare(b.date);return a.date.localeCompare(b.date)||a.createdAt-b.createdAt;});
  const incoming=rows.filter(t=>Number(t.amount)>0).reduce((sum,t)=>sum+Number(t.amount),0),outgoing=rows.filter(t=>Number(t.amount)<0).reduce((sum,t)=>sum+Number(t.amount),0);
  $('history-incoming').textContent=euro(incoming);$('history-outgoing').textContent=euro(Math.abs(outgoing));$('history-net').textContent=euro(incoming+outgoing);
  $('history-rows').innerHTML=rows.length?rows.map(t=>{const ac=accountById(t.accountId)||{name:'Compte supprimé'};return '<tr><td>'+dateFormat(t.date)+'</td><td class="transaction-label">'+escapeHtml(t.label)+'</td><td>'+escapeHtml(ac.name)+'</td><td class="table-amount '+(Number(t.amount)>=0?'positive':'negative')+'">'+(Number(t.amount)>0?'+':'')+euro(t.amount)+'</td><td><span class="history-paid '+(t.isPaid?'is-paid':'')+'">'+(t.isPaid?'Pointée':'À pointer')+'</span></td></tr>';}).join(''):'<tr><td colspan="5"><div class="empty-state">Aucune opération pour ce mois avec les filtres choisis.</div></td></tr>';
  $('history-footer').textContent=rows.length+' opération(s) affichée(s) pour '+monthName(month)+'.';
}
function monthValueNow(){return today().slice(0,7);}
function nextMonthValue(){
  const d=new Date();
  d.setDate(1);
  d.setMonth(d.getMonth()+1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
function monthName(month){return new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(new Date(month+'-15T12:00:00'));}
function recurringFrequencyLabel(t){
  if(t.frequency==='monthly')return 'Tous les mois · le '+t.day;
  if(t.frequency==='quarterly')return 'Trimestriel · '+(t.months||[]).map(m=>['','janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'][m]).join(', ')+' · le '+t.day;
  if(t.frequency==='annual')return 'Annuel · '+(t.months||[]).map(m=>['','janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'][m]).join(', ')+' · le '+t.day;
  return 'Unique · '+t.date;
}
function renderRecurring(){
  if(!$('recurring-rows'))return;
  if(!$('recurring-month').value)$('recurring-month').value=nextMonthValue();
  const query=$('recurring-search')?.value.trim().toLocaleLowerCase('fr')||'',accountFilter=$('recurring-account-filter')?.value||'all',statusFilter=$('recurring-status-filter')?.value||'all',sort=$('recurring-sort')?.value||'label';
  const templates=[...(state.recurringTemplates||[])].filter(t=>{const ac=accountById(t.accountId);return (t.label+' '+(ac?.name||'')+' '+recurringFrequencyLabel(t)).toLocaleLowerCase('fr').includes(query)&&(accountFilter==='all'||t.accountId===accountFilter)&&(statusFilter==='all'||(statusFilter==='enabled'?t.enabled!==false:t.enabled===false));});
  templates.sort((a,b)=>{if(sort==='account')return (accountById(a.accountId)?.name||'').localeCompare(accountById(b.accountId)?.name||'','fr')||a.label.localeCompare(b.label,'fr');if(sort==='amount-asc')return (Number(a.amount)||0)-(Number(b.amount)||0)||a.label.localeCompare(b.label,'fr');if(sort==='amount-desc')return (Number(b.amount)||0)-(Number(a.amount)||0)||a.label.localeCompare(b.label,'fr');if(sort==='enabled')return Number(b.enabled!==false)-Number(a.enabled!==false)||a.label.localeCompare(b.label,'fr');return a.label.localeCompare(b.label,'fr');});
  $('recurring-rows').innerHTML=templates.length?templates.map(t=>{
    const a=accountById(t.accountId)||{name:'Compte inconnu'};
    const value=t.amount===null||t.amount===undefined?'':String(t.amount);
    return '<tr><td><input class="recurring-enabled" type="checkbox" data-recurring-enabled="'+escapeHtml(t.id)+'" '+(t.enabled?'checked':'')+' aria-label="Activer '+escapeHtml(t.label)+'"></td><td><div class="recurring-account-cell">'+bankLogo(a)+'<span>'+escapeHtml(a.name)+'</span></div></td><td><div>'+escapeHtml(recurringFrequencyLabel(t))+'</div>'+(t.frequency==='once'?'':'<label class="recurring-day-label">Jour <input class="recurring-day" type="number" min="1" max="31" step="1" data-recurring-day="'+escapeHtml(t.id)+'" value="'+Number(t.day||1)+'" aria-label="Jour du mois"></label>')+'</td><td><input class="recurring-label" type="text" data-recurring-label="'+escapeHtml(t.id)+'" value="'+escapeHtml(t.label)+'" aria-label="Libellé"></td><td><input class="recurring-amount" type="number" step="0.01" data-recurring-amount="'+escapeHtml(t.id)+'" value="'+escapeHtml(value)+'" placeholder="À renseigner" aria-label="Montant"></td><td class="recurring-actions"><button type="button" class="secondary-button" data-edit-recurring="'+escapeHtml(t.id)+'">Modifier</button><button type="button" class="secondary-button danger-button" data-delete-recurring="'+escapeHtml(t.id)+'">Supprimer</button></td></tr>';
  }).join(''):'<tr><td colspan="6" class="recurring-empty">Aucune récurrence pour le moment. Cliquez sur « Ajouter une récurrence » pour commencer.</td></tr>';
  const blank=templates.filter(t=>t.enabled&&(t.amount===null||t.amount===undefined||t.amount==='')).length;
  const month=nextMonthValue(),alreadyGenerated=monthAlreadyGenerated(month),button=$('recurring-add-month');
  if(button){button.disabled=generationInProgress.has(month);button.title=alreadyGenerated?'La génération est bloquée : les opérations de ce mois ont déjà été générées':'Générer les opérations du mois prochain';}
  $('recurring-summary').textContent=alreadyGenerated
    ?'Les opérations de '+monthName(month)+' ont déjà été générées. La génération est verrouillée pour éviter les doublons.'
    :templates.length+' modèle(s) affiché(s) · '+blank+' montant(s) à renseigner · les opérations déjà générées seront conservées si un modèle est modifié ou supprimé.';
}
function updateRecurringEditorFields(){
  const frequency=$('recurring-edit-frequency').value;
  $('recurring-months-field').hidden=!(frequency==='quarterly'||frequency==='annual');
  $('recurring-day-field').hidden=frequency==='once';
  $('recurring-once-field').hidden=frequency!=='once';
  $('recurring-range-fields').hidden=frequency!=='monthly';
}
function openRecurringEditor(id=null){
  const template=id?(state.recurringTemplates||[]).find(t=>t.id===id):null;
  if(id&&!template)return;
  const accountSelect=$('recurring-edit-account');
  accountSelect.replaceChildren();
  state.accounts.forEach(account=>accountSelect.add(new Option(account.name,account.id)));
  $('recurring-form').reset();
  $('recurring-edit-id').value=template?.id||'';
  $('recurring-edit-label').value=template?.label||'';
  $('recurring-edit-amount').value=template?.amount===null||template?.amount===undefined?'':String(template.amount);
  $('recurring-edit-account').value=template?.accountId||state.accounts[0]?.id||'';
  $('recurring-edit-frequency').value=template?.frequency||'monthly';
  $('recurring-edit-day').value=String(template?.day||1);
  $('recurring-edit-start-month').value=template?.startMonth||'';
  $('recurring-edit-end-month').value=template?.endMonth||'';
  $('recurring-edit-once-date').value=template?.date||today();
  $('recurring-edit-enabled').checked=template?template.enabled!==false:true;
  const selectedMonths=template?.months?.length?template.months:(template?.frequency==='quarterly'?[1,4,7,10]:[Number((template?.date||today()).slice(5,7))||1]);
  document.querySelectorAll('[name="recurring-month-option"]').forEach(input=>{input.checked=selectedMonths.includes(Number(input.value));});
  $('recurring-modal-title').textContent=template?'Modifier une récurrence':'Nouvelle récurrence';
  updateRecurringEditorFields();
  $('recurring-dialog').showModal();
}
function deleteRecurringTemplate(id){
  const template=(state.recurringTemplates||[]).find(t=>t.id===id);
  if(!template)return;
  if(!window.confirm('Supprimer la récurrence « '+template.label+' » ? Les opérations déjà générées resteront dans l’historique.'))return;
  prepareUndo();
  if(cloud.user)cloud.pendingTemplateDeletes.add(template.id);
  state.recurringTemplates=state.recurringTemplates.filter(t=>t.id!==id);
  renderAll();
  showToast('Récurrence supprimée. Les opérations déjà créées sont conservées.',true);
}
function dueDateForTemplate(t,month){
  const [year,monthNumber]=month.split('-').map(Number);
  if(t.frequency==='once')return t.date===year+'-'+String(monthNumber).padStart(2,'0')+'-'+String(t.day).padStart(2,'0')?t.date:null;
  if(t.frequency==='monthly'){
    if(t.startMonth&&month<t.startMonth)return null;
    if(t.endMonth&&month>t.endMonth)return null;
  } else if(t.frequency==='quarterly'||t.frequency==='annual'){
    if(!(t.months||[]).includes(monthNumber))return null;
  } else return null;
  const daysInMonth=new Date(year,monthNumber,0).getDate();
  const day=Math.min(Number(t.day)||1,daysInMonth);
  return year+'-'+String(monthNumber).padStart(2,'0')+'-'+String(day).padStart(2,'0');
}
function generatedMonths(){
  try{const value=JSON.parse(localStorage.getItem(GENERATED_MONTHS_KEY)||'[]');return Array.isArray(value)?value:[];}catch(error){return [];}
}
function monthAlreadyGenerated(month){
  // Les transactions réelles sont la source de vérité. Le marqueur local ne doit
  // pas bloquer une régénération si les opérations ont été supprimées de Supabase.
  if(state.transactions.some(t=>t.recurringKey&&String(t.date||'').slice(0,7)===month)){
    const months=generatedMonths();
    if(!months.includes(month)){months.push(month);try{localStorage.setItem(GENERATED_MONTHS_KEY,JSON.stringify(months));}catch(error){}}
    return true;
  }
  const months=generatedMonths();
  const index=months.indexOf(month);
  if(index!==-1){
    months.splice(index,1);
    try{localStorage.setItem(GENERATED_MONTHS_KEY,JSON.stringify(months));}catch(error){}
  }
  return false;
}
function generateRecurringForMonth(month){
  if(!/^\d{4}-\d{2}$/.test(month)){showToast('Choisissez un mois valide.');return;}
  if(generationInProgress.has(month))return;
  if(monthAlreadyGenerated(month)){
    const message='Erreur : les opérations de '+monthName(month)+' ont déjà été générées. La génération est bloquée pour éviter les doublons.';
    if($('recurring-summary'))$('recurring-summary').textContent=message;
    showToast(message);renderRecurring();return;
  }
  generationInProgress.add(month);
  const button=$('recurring-add-month');if(button)button.disabled=true;
  const additions=[];
  (state.recurringTemplates||[]).forEach(t=>{
    if(!t.enabled||t.amount===null||t.amount===undefined||t.amount===''||!Number.isFinite(Number(t.amount)))return;
    const date=dueDateForTemplate(t,month);if(!date)return;
    const recurringKey=t.id+'@'+date;
    if(state.transactions.some(x=>x.recurringKey===recurringKey))return;
    additions.push({id:crypto.randomUUID(),accountId:t.accountId,date,amount:Number(t.amount),label:t.label,createdAt:Date.now()+additions.length,recurringKey,recurringTemplateId:t.id});
  });
  if(!additions.length){
    generationInProgress.delete(month);
    if(button)button.disabled=false;
    const alreadyExists=state.transactions.some(t=>t.recurringKey&&String(t.date||'').slice(0,7)===month);
    if(alreadyExists){const months=generatedMonths();if(!months.includes(month)){months.push(month);try{localStorage.setItem(GENERATED_MONTHS_KEY,JSON.stringify(months));}catch(error){}}}
    const message=alreadyExists
      ?'Les opérations de '+monthName(month)+' ont déjà été générées. Aucun doublon n’a été ajouté.'
      :'Aucune nouvelle opération à ajouter pour '+monthName(month)+'. Vérifiez les montants et les fréquences.';
    if($('recurring-summary'))$('recurring-summary').textContent=message;showToast(message);renderRecurring();return;
  }
  prepareUndo();
  state.transactions.push(...additions);
  const months=generatedMonths();if(!months.includes(month))months.push(month);
  try{localStorage.setItem(GENERATED_MONTHS_KEY,JSON.stringify(months));}catch(error){}
  generationInProgress.delete(month);
  renderAll();
  const message=additions.length+' opération(s) ajoutée(s) pour '+monthName(month)+'. Cette génération est maintenant verrouillée.';
  if($('recurring-summary'))$('recurring-summary').textContent=message+' Les doublons ne pourront pas être générés une seconde fois.';
  showToast(message,true);
}

function renderAll(){fillAccountSelects();renderDashboard();renderAccounts();renderTransactions();renderRecurring();renderMonthlyHistory();saveState();}
function showToast(message,withUndo=false){const el=$('toast');if(!el)return;el.replaceChildren(document.createTextNode(message));if(withUndo&&undoPoint){const button=document.createElement('button');button.type='button';button.className='toast-undo';button.textContent='Annuler';button.setAttribute('aria-label','Annuler la dernière action');button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();try{undoLastAction();}catch(error){console.error('Undo failed',error);showToast('Impossible d’annuler cette action : '+(error.message||'erreur inconnue.'));}},{once:true});el.append(document.createTextNode(' '),button);}el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.classList.remove('show');if(withUndo)undoPoint=null;},10000);}
function navigate(view){
  document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id===view+'-view'));
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
  $('breadcrumb-current').textContent=({dashboard:"Vue d'ensemble",accounts:'Mes comptes',transactions:'Opérations',history:'Historique mensuel',recurring:'Récurrences'})[view]||view;
  if(view==='recurring')renderRecurring();
  if(view==='accounts')renderAccounts();if(view==='transactions')renderTransactions();if(view==='history')renderMonthlyHistory();
  window.scrollTo({top:0,behavior:'smooth'});
}
function openTransaction(accountId=null,transaction=null){
  $('transaction-form').reset();$('transaction-id').value=transaction?.id||'';
  $('transaction-modal-title').textContent=transaction?'Modifier l’opération':'Nouvelle opération';
  $('transaction-date').value=transaction?.date||today();$('transaction-amount').value=transaction?transaction.amount:'';
  $('transaction-label').value=transaction?.label||'';
  fillAccountSelects();$('transaction-account').value=transaction?.accountId||accountId||state.accounts[0]?.id||'';
  $('transaction-dialog').showModal();
}
function openAccountEditor(id){
  const a=accountById(id);if(!a)return;
  $('account-form').reset();$('edit-account-id').value=a.id;$('account-modal-title').textContent='Configurer le compte';
  $('edit-account-name').value=a.name;$('edit-account-opening').value=Number(a.opening||0);
  $('tiime-settings').classList.toggle('hidden',a.kind!=='pro');
  $('edit-vat-rate').value=a.vatRate??20;$('edit-social-rate').value=a.socialRate??45;$('edit-account-net-opening').value=Number(a.netOpening||0);
  $('account-dialog').showModal();
}
const MCP_TOKEN_ENDPOINT='https://gpzqvkkysolqksimiqac.supabase.co/functions/v1/mcp-tokens';
async function mcpTokenRequest(payload){
  if(!cloud.user)throw new Error('Connectez-vous avant de gérer les jetons MCP.');
  const {data,error}=await cloudClient().auth.getSession();
  if(error)throw error;
  const accessToken=data.session?.access_token;
  if(!accessToken)throw new Error('Session expirée. Reconnectez-vous.');
  const config=window.GESTION_SUPABASE_CONFIG;
  const response=await fetch(MCP_TOKEN_ENDPOINT,{
    method:'POST',
    headers:{'Authorization':'Bearer '+accessToken,'apikey':config.publishableKey,'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  const result=await response.json().catch(()=>({error:'Réponse serveur illisible.'}));
  if(!response.ok)throw new Error(result.error||'Impossible de gérer le jeton MCP.');
  return result;
}
function fillMcpAccountSelect(){
  const select=$('mcp-default-account');
  if(!select)return;
  const selected=select.value;
  select.replaceChildren(new Option('Aucun compte par défaut',''));
  state.accounts.forEach(account=>select.add(new Option(account.name,account.id)));
  if([...select.options].some(option=>option.value===selected))select.value=selected;
}
async function loadMcpTokens(){
  const list=$('mcp-token-list');
  if(!list||!cloud.user)return;
  list.replaceChildren();
  $('mcp-token-message').textContent='Chargement des connexions…';
  try{
    fillMcpAccountSelect();
    const result=await mcpTokenRequest({action:'list'});
    list.replaceChildren();
    if(!result.tokens?.length){
      $('mcp-token-message').textContent='Aucun jeton créé pour le moment.';
      return;
    }
    $('mcp-token-message').textContent='';
    result.tokens.forEach(token=>{
      const row=document.createElement('div');row.className='mcp-token-row';
      const info=document.createElement('div');
      const name=document.createElement('strong');name.textContent=token.name+(token.revoked_at?' — révoqué':'');
      const meta=document.createElement('small');
      const account=state.accounts.find(a=>a.id===token.default_account_id);
      meta.textContent='Compte : '+(account?.name||token.default_account_id||'à choisir')+' · Créé le '+dateFormat(token.created_at?.slice(0,10));
      info.append(name,document.createElement('br'),meta);row.append(info);
      if(!token.revoked_at){
        const revoke=document.createElement('button');revoke.type='button';revoke.className='secondary-button';revoke.textContent='Révoquer';
        revoke.addEventListener('click',async()=>{
          if(!window.confirm('Révoquer ce jeton ? L’assistant qui l’utilise perdra immédiatement l’accès.'))return;
          revoke.disabled=true;
          try{await mcpTokenRequest({action:'revoke',id:token.id});showToast('Jeton MCP révoqué.');await loadMcpTokens();}
          catch(error){$('mcp-token-message').textContent=error.message||'Révocation impossible.';revoke.disabled=false;}
        });
        row.append(revoke);
      }
      list.append(row);
    });
  }catch(error){$('mcp-token-message').textContent=error.message||'Impossible de charger les jetons MCP.';}
}
function showMcpSettings(){
  const section=$('mcp-settings');
  if(!section)return;
  section.hidden=!cloud.user;
  if(cloud.user){fillMcpAccountSelect();loadMcpTokens();}
}
function exportData(){
  const payload={application:'Gestion de comptes',exportedAt:new Date().toISOString(),...state};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='gestion-comptes-'+today()+'.json';a.click();URL.revokeObjectURL(url);showToast('Export JSON téléchargé.');
}
function downloadCsv(){
  const rows=[['Date','Opération','Compte','Montant','Solde à date','Montant après provisions','Solde net estimé']];
  [...state.transactions].sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>{const a=accountById(t.accountId);rows.push([t.date,t.label,a?.name||'',t.amount,balanceAt(t.accountId,t.date),a?.kind==='pro'?tiimeCalc(a,t.amount).net:'',a?.kind==='pro'?tiimeNetBalance(a):'']);});
  const csv=rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='operations-'+today()+'.csv';a.click();URL.revokeObjectURL(url);showToast('Export CSV téléchargé.');
}
document.querySelectorAll('.nav-item').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.view)));
document.querySelectorAll('[data-goto]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.goto)));
$('recurring-add-month').addEventListener('click',()=>generateRecurringForMonth(nextMonthValue()));
$('recurring-add-template').addEventListener('click',()=>openRecurringEditor());
$('recurring-edit-frequency').addEventListener('change',updateRecurringEditorFields);
$('recurring-month').value=nextMonthValue();
$('history-month').value=monthValueNow();
$('recurring-rows').addEventListener('change',event=>{
  const enabled=event.target.closest('[data-recurring-enabled]');
  if(enabled){const t=state.recurringTemplates.find(x=>x.id===enabled.dataset.recurringEnabled);if(t){prepareUndo();t.enabled=enabled.checked;saveState();renderRecurring();showToast('Récurrence mise à jour.',true);}return;}
  const amount=event.target.closest('[data-recurring-amount]');
  if(amount){const t=state.recurringTemplates.find(x=>x.id===amount.dataset.recurringAmount);if(t){prepareUndo();t.amount=amount.value.trim()===''?null:Number(amount.value);saveState();renderRecurring();showToast('Montant de la récurrence mis à jour.',true);}return;}
  const day=event.target.closest('[data-recurring-day]');
  if(day){const t=state.recurringTemplates.find(x=>x.id===day.dataset.recurringDay);if(t){prepareUndo();t.day=Math.min(31,Math.max(1,Number(day.value)||1));saveState();renderRecurring();showToast('Jour de la récurrence mis à jour.',true);}return;}
  const label=event.target.closest('[data-recurring-label]');
  if(label){const t=state.recurringTemplates.find(x=>x.id===label.dataset.recurringLabel);if(t){prepareUndo();t.label=label.value.trim()||t.label;saveState();renderRecurring();showToast('Libellé de la récurrence mis à jour.',true);}}
});
$('recurring-form').addEventListener('submit',event=>{
  event.preventDefault();
  const id=$('recurring-edit-id').value;
  const existing=id?(state.recurringTemplates||[]).find(t=>t.id===id):null;
  const label=$('recurring-edit-label').value.trim();
  const accountId=$('recurring-edit-account').value;
  const frequency=$('recurring-edit-frequency').value;
  const amountText=$('recurring-edit-amount').value.trim();
  const amount=amountText===''?null:Number(amountText);
  const day=Math.min(31,Math.max(1,Number($('recurring-edit-day').value)||1));
  const date=$('recurring-edit-once-date').value;
  const months=[...document.querySelectorAll('[name="recurring-month-option"]:checked')].map(input=>Number(input.value)).sort((a,b)=>a-b);
  if(!label||!accountById(accountId)){showToast('Renseignez un libellé et un compte valide.');return;}
  if(amountText!==''&&!Number.isFinite(amount)){showToast('Le montant doit être un nombre valide.');return;}
  if((frequency==='quarterly'||frequency==='annual')&&!months.length){showToast('Sélectionnez au moins un mois.');return;}
  if(frequency==='once'&&!date){showToast('Choisissez la date de l’opération ponctuelle.');return;}
  const startMonth=frequency==='monthly'?($('recurring-edit-start-month').value||null):null;
  const endMonth=frequency==='monthly'?($('recurring-edit-end-month').value||null):null;
  if(startMonth&&endMonth&&endMonth<startMonth){showToast('Le mois de fin doit être postérieur ou égal au mois de début.');return;}
  const record={...(existing||{}),id:id||crypto.randomUUID(),accountId,label,amount,frequency,day:frequency==='once'?Number(date.slice(8,10)):day,months:frequency==='quarterly'||frequency==='annual'?months:[],startMonth,endMonth,date:frequency==='once'?date:undefined,enabled:$('recurring-edit-enabled').checked};
  prepareUndo();
  if(existing)state.recurringTemplates=state.recurringTemplates.map(t=>t.id===id?record:t);else state.recurringTemplates.push(record);
  $('recurring-dialog').close();renderAll();showToast(existing?'Récurrence modifiée.':'Récurrence ajoutée.',true);
});
['transactions-add'].forEach(id=>$(id).addEventListener('click',()=>openTransaction()));
$('account-search').addEventListener('input',renderAccounts);
$('account-kind-filter').addEventListener('change',renderAccounts);$('account-sort').addEventListener('change',renderAccounts);
$('transaction-search').addEventListener('input',renderTransactions);$('transaction-account-filter').addEventListener('change',renderTransactions);$('transaction-type-filter').addEventListener('change',renderTransactions);$('transaction-sort').addEventListener('change',renderTransactions);
['recurring-search','recurring-account-filter','recurring-status-filter','recurring-sort'].forEach(id=>$(id).addEventListener(id==='recurring-search'?'input':'change',renderRecurring));
['history-month','history-account-filter','history-type-filter','history-sort'].forEach(id=>$(id).addEventListener('change',renderMonthlyHistory));$('history-search').addEventListener('input',renderMonthlyHistory);
$('cloud-open').addEventListener('click',()=>{$('cloud-message').textContent=cloud.user?'Vous êtes connecté à votre espace privé.':'Connectez-vous ou créez votre compte pour activer la synchronisation.';$('cloud-logout').hidden=!cloud.user;showMcpSettings();$('cloud-dialog').showModal();});
$('mcp-create-token').addEventListener('click',async()=>{
  const button=$('mcp-create-token');button.disabled=true;$('mcp-token-message').textContent='Création du jeton…';$('mcp-token-once-label').hidden=true;$('mcp-copy-token').hidden=true;
  try{
    const result=await mcpTokenRequest({action:'create',name:$('mcp-token-name').value.trim()||'Mon assistant',default_account_id:$('mcp-default-account').value||null});
    $('mcp-token-once').value=result.token;$('mcp-token-once-label').hidden=false;$('mcp-copy-token').hidden=false;await loadMcpTokens();$('mcp-token-message').textContent='Jeton créé. Copiez-le maintenant : il ne sera plus affiché après fermeture ou actualisation.';
  }catch(error){$('mcp-token-message').textContent=error.message||'Création impossible.';}
  finally{button.disabled=false;}
});
$('mcp-refresh-tokens').addEventListener('click',loadMcpTokens);
$('mcp-copy-token').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText($('mcp-token-once').value);$('mcp-token-message').textContent='Jeton copié dans le presse-papiers. Conservez-le dans le gestionnaire de secrets de votre client MCP.';}
  catch{$('mcp-token-once').focus();$('mcp-token-once').select();$('mcp-token-message').textContent='Copie automatique indisponible : sélectionnez le texte puis copiez-le manuellement.';}
});
$('cloud-form').addEventListener('submit',async event=>{
  event.preventDefault();cloudMessage('Connexion en cours…');
  try{
    const {data,error}=await cloudClient().auth.signInWithPassword({email:$('cloud-email').value.trim(),password:$('cloud-password').value});
    if(error)throw error;
    if(data.session){cloudMessage('Connexion réussie. Chargement de vos données…');$('cloud-dialog').close();}
  }catch(error){cloudMessage(error.message||'Connexion impossible.');}
});
$('cloud-signup').addEventListener('click',async()=>{
  cloudMessage('Création du compte…');
  try{
    const redirectUrl=new URL(window.location.href);redirectUrl.hash='';redirectUrl.search='';
    const {data,error}=await cloudClient().auth.signUp({email:$('cloud-email').value.trim(),password:$('cloud-password').value,options:{emailRedirectTo:redirectUrl.toString()}});
    if(error)throw error;
    if(data.session){cloudMessage('Compte créé. Chargement des données…');$('cloud-dialog').close();}
    else cloudMessage('Compte créé. Consultez votre e-mail pour confirmer l’adresse, puis connectez-vous.');
  }catch(error){cloudMessage(error.message||'Création du compte impossible.');}
});
$('cloud-logout').addEventListener('click',async()=>{
  try{const {error}=await cloudClient().auth.signOut();if(error)throw error;localStorage.removeItem(STORAGE_KEY);localStorage.removeItem('gestion-comptes-cloud-migration-backup-v1');if($('cloud-dialog').open)$('cloud-dialog').close();lockApp('Déconnexion effectuée. Reconnectez-vous pour accéder à vos données.');}
  catch(error){cloudMessage(error.message||'Déconnexion impossible.');}
});
$('export-btn').addEventListener('click',()=>{
  const choice=window.confirm('OK : exporter toutes les données en JSON.\nAnnuler : exporter uniquement les opérations en CSV.');
  choice?exportData():downloadCsv();
});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.close).close()));
$('transaction-form').addEventListener('submit',event=>{
  event.preventDefault();
  const id=$('transaction-id').value,accountId=$('transaction-account').value,date=$('transaction-date').value,amount=Number($('transaction-amount').value),label=$('transaction-label').value.trim();
  if(!date||!label||!Number.isFinite(amount)){showToast('Vérifiez les informations saisies.');return;}
  const previous=id?state.transactions.find(t=>t.id===id):null;
  const oldOrder=previous?.sortOrder;const record={...(previous||{}),id:id||crypto.randomUUID(),accountId,date,amount,label,isPaid:previous?.isPaid===true,sortOrder:previous&&previous.accountId===accountId&&Number.isFinite(Number(oldOrder))&&oldOrder!==null?Number(oldOrder):Math.max(0,...state.transactions.filter(t=>t.accountId===accountId&&t.id!==id).map(t=>Number(t.sortOrder)||0))+1,createdAt:previous?.createdAt||Date.now()};
  // Capture l'état avant toute création ou modification pour rendre « Annuler » opérationnel.
  prepareUndo();
  if(previous)state.transactions=state.transactions.map(t=>t.id===id?record:t);else state.transactions.push(record);
  $('transaction-dialog').close();renderAll();showToast(previous?'Opération modifiée.':'Opération ajoutée.',true);
});
$('account-form').addEventListener('submit',event=>{
  event.preventDefault();const a=accountById($('edit-account-id').value);if(!a)return;
  prepareUndo();
  a.name=$('edit-account-name').value.trim();a.opening=Number($('edit-account-opening').value)||0;
  if(a.kind==='pro'){a.vatRate=Math.min(100,Math.max(0,Number($('edit-vat-rate').value)||0));a.socialRate=Math.min(100,Math.max(0,Number($('edit-social-rate').value)||0));a.netOpening=Number($('edit-account-net-opening').value)||0;}
  $('account-dialog').close();renderAll();showToast('Paramètres du compte enregistrés.',true);
});
document.addEventListener('change',event=>{
  const paid=event.target.closest('[data-toggle-paid]');
  if(!paid)return;
  const transaction=state.transactions.find(t=>t.id===paid.dataset.togglePaid);
  if(!transaction)return;
  prepareUndo();
  transaction.isPaid=paid.checked;
  renderAll();
  showToast(transaction.isPaid?'Opération marquée comme débitée / pointée.':'Opération remise à pointer.',true);
});
document.addEventListener('click',event=>{
  const move=event.target.closest('[data-move-transaction]');
  if(move){moveTransaction(move.dataset.moveTransaction,Number(move.dataset.direction));return;}
  const edit=event.target.closest('[data-edit-transaction]');
  if(edit){const t=state.transactions.find(t=>t.id===edit.dataset.editTransaction);if(t)openTransaction(t.accountId,t);return;}
  const del=event.target.closest('[data-delete-transaction]');
  if(del){const t=state.transactions.find(t=>t.id===del.dataset.deleteTransaction);if(t&&window.confirm('Supprimer l’opération « '+t.label+' » ?')){prepareUndo();if(cloud.user)cloud.pendingDeletes.add(t.id);state.transactions=state.transactions.filter(x=>x.id!==t.id);renderAll();showToast('Opération supprimée.',true);}return;}
  const editRecurring=event.target.closest('[data-edit-recurring]');
  if(editRecurring){openRecurringEditor(editRecurring.dataset.editRecurring);return;}
  const deleteRecurring=event.target.closest('[data-delete-recurring]');
  if(deleteRecurring){deleteRecurringTemplate(deleteRecurring.dataset.deleteRecurring);return;}
  const editAccount=event.target.closest('[data-edit-account]');
  if(editAccount){event.stopPropagation();openAccountEditor(editAccount.dataset.editAccount);return;}
  const history=event.target.closest('[data-account-transactions]');
  if(history){event.stopPropagation();navigate('transactions');$('transaction-account-filter').value=history.dataset.accountTransactions;renderTransactions();return;}
  const account=event.target.closest('[data-account-open]');
  if(account){openAccountEditor(account.dataset.accountOpen);}
});
initCloud();
