const STORAGE_KEY = 'gestion-comptes-v1';
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

const DEFAULT_RECURRING_TEMPLATES = [
  // La Banque Postale
  {id:'lbp-fortuneo',accountId:'lbp',day:1,frequency:'monthly',label:'De Fortuneo',amount:550},
  {id:'lbp-mncap',accountId:'lbp',day:10,frequency:'monthly',label:'MNCAP',amount:-15.99},
  {id:'lbp-credit-carcassonne',accountId:'lbp',day:10,frequency:'monthly',label:'Crédit Carcassonne',amount:-503.71},
  {id:'lbp-fees',accountId:'lbp',day:11,frequency:'quarterly',months:[1,4,7,10],label:'Frais de tenue de compte',amount:-5.70},
  // Fortuneo
  {id:'fortuneo-tiime',accountId:'fortuneo',day:1,frequency:'monthly',label:'De Tiime Facture X',amount:null},
  {id:'fortuneo-livret',accountId:'fortuneo',day:1,frequency:'monthly',label:'IR Facture X (vers Livret +)',amount:null},
  {id:'fortuneo-cic',accountId:'fortuneo',day:1,frequency:'monthly',label:'Vers CIC Montpont',amount:-2000},
  {id:'fortuneo-lbp',accountId:'fortuneo',day:5,frequency:'monthly',label:'Vers LBP (Carcassonne)',amount:-550},
  {id:'fortuneo-invest',accountId:'fortuneo',day:5,frequency:'monthly',label:'Vers Nasdaq / Robotics / Micron / cuivre / Schneider',amount:null},
  {id:'fortuneo-gold',accountId:'fortuneo',day:5,frequency:'monthly',label:'Or',amount:null},
  {id:'fortuneo-silver',accountId:'fortuneo',day:5,frequency:'monthly',label:'Silver',amount:null},
  {id:'fortuneo-btc',accountId:'fortuneo',day:5,frequency:'monthly',label:'Vers BTC',amount:null},
  {id:'fortuneo-alt',accountId:'fortuneo',day:5,frequency:'monthly',label:'Vers ALT',amount:null},
  {id:'fortuneo-youtube',accountId:'fortuneo',day:5,frequency:'monthly',label:'YouTube Premium',amount:-6.24},
  {id:'fortuneo-gmf',accountId:'fortuneo',day:1,frequency:'annual',months:[4],label:'GMF (Juridique)',amount:-98.15},
  {id:'fortuneo-rent-carcassonne',accountId:'fortuneo',day:31,frequency:'quarterly',months:[3,6,9,12],label:'Loyers Carcassonne',amount:1449.99},
  // CIC Montpont
  {id:'montpont-fortuneo',accountId:'cic-montpont',day:1,frequency:'monthly',label:'De Fortuneo',amount:2000},
  {id:'montpont-basicfit',accountId:'cic-montpont',day:3,frequency:'monthly',label:'Basic-Fit',amount:-22.99},
  {id:'montpont-credit1',accountId:'cic-montpont',day:4,frequency:'monthly',label:'Crédit Clérac 1',amount:-1084.56},
  {id:'montpont-credit2',accountId:'cic-montpont',day:5,frequency:'monthly',label:'Crédit Clérac 2',amount:-578.86},
  {id:'montpont-b-and-you',accountId:'cic-montpont',day:6,frequency:'monthly',label:'B and You',amount:-9.99},
  {id:'montpont-rent-pierre',accountId:'cic-montpont',day:6,frequency:'monthly',label:'Clérac loyer app. 1 - Pierre',amount:595},
  {id:'montpont-rent-mael',accountId:'cic-montpont',day:6,frequency:'monthly',label:'Clérac loyer app. 2 - Maël',amount:470},
  {id:'montpont-rent-patricia',accountId:'cic-montpont',day:6,frequency:'monthly',label:'Clérac loyer app. 3 - Patricia',amount:485},
  {id:'montpont-rent-leo',accountId:'cic-montpont',day:6,frequency:'monthly',label:'Clérac loyer app. 4 - Léo',amount:550},
  {id:'montpont-rent-patrick',accountId:'cic-montpont',day:6,frequency:'monthly',label:'Clérac loyer app. 5 - Patrick',amount:500},
  {id:'montpont-rent-stephane',accountId:'cic-montpont',day:6,frequency:'monthly',label:'Clérac loyer app. 6 - Stéphane',amount:500},
  {id:'montpont-imodirect',accountId:'cic-montpont',day:6,frequency:'monthly',label:'Imodirect (frais de gestion 6 apparts)',amount:-203.22},
  {id:'montpont-serris',accountId:'cic-montpont',day:6,frequency:'monthly',label:'Loyer Serris',amount:-1208.54},
  {id:'montpont-mgc',accountId:'cic-montpont',day:7,frequency:'monthly',label:'Mutuelle MGC',amount:-15.54},
  {id:'montpont-fees',accountId:'cic-montpont',day:8,frequency:'monthly',label:'Frais de tenue de compte',amount:-13.35},
  {id:'montpont-energy',accountId:'cic-montpont',day:7,frequency:'monthly',startMonth:'2025-09',endMonth:'2026-07',label:'Total Energies Serris (sept. 2025 à juil. 2026)',amount:-32},
  {id:'montpont-water1',accountId:'cic-montpont',day:26,frequency:'annual',months:[6,12],label:'Abonnement Eau 239439 (en CB)',amount:-100},
  {id:'montpont-water2',accountId:'cic-montpont',day:26,frequency:'annual',months:[6,12],label:'Abonnement Eau 032817',amount:-550},
  {id:'montpont-water3',accountId:'cic-montpont',day:26,frequency:'annual',months:[6,12],label:'Abonnement Eau 032819',amount:-250},
  {id:'montpont-sosh',accountId:'cic-montpont',day:25,frequency:'monthly',label:'Sosh internet',amount:-24.99},
  {id:'montpont-tax-clerac',accountId:'cic-montpont',day:15,frequency:'annual',months:[10],label:'Taxe foncière Clérac',amount:-1685},
  {id:'montpont-tax-carcassonne',accountId:'cic-montpont',day:15,frequency:'annual',months:[10],label:'Taxe foncière Carcassonne',amount:-428},
  {id:'montpont-cfe-company',accountId:'cic-montpont',day:16,frequency:'annual',months:[12],label:'CFE Société',amount:-887},
  {id:'montpont-cfe-carcassonne',accountId:'cic-montpont',day:16,frequency:'annual',months:[12],label:'CFE Carcassonne',amount:-169},
  {id:'montpont-anderlaine-5',accountId:'cic-montpont',day:10,frequency:'annual',months:[12],label:'Anderlaine (5 biens)',amount:-898},
  {id:'montpont-anderlaine-2',accountId:'cic-montpont',day:16,frequency:'annual',months:[12],label:'Anderlaine (2 biens, app. 5 et 6)',amount:-216},
  {id:'montpont-luko-77700',accountId:'cic-montpont',day:1,frequency:'annual',months:[7],label:'Luko 77 700',amount:-138.01},
  {id:'montpont-luko-app1',accountId:'cic-montpont',day:1,frequency:'annual',months:[12],label:'Luko 17 270 (app. 1)',amount:-82.27},
  {id:'montpont-luko-app2',accountId:'cic-montpont',day:1,frequency:'annual',months:[8],label:'Luko 17 270 (app. 2)',amount:-66},
  {id:'montpont-luko-app4',accountId:'cic-montpont',day:1,frequency:'annual',months:[9],label:'Luko 17 270 (app. 4)',amount:-59.41},
  {id:'montpont-luko-app3',accountId:'cic-montpont',day:1,frequency:'annual',months:[12],label:'Luko 17 270 (app. 3)',amount:-62.21},
  {id:'montpont-luko-app5',accountId:'cic-montpont',day:1,frequency:'annual',months:[9],label:'Luko 17 270 (app. 5)',amount:-53.69},
  {id:'montpont-luko-app6',accountId:'cic-montpont',day:1,frequency:'annual',months:[9],label:'Luko 17 270 (app. 6)',amount:-64.12},
  {id:'montpont-ir-nov',accountId:'cic-montpont',day:26,frequency:'once',date:'2026-11-26',label:'IR 2026 sur 2025 3-4',amount:-3709},
  {id:'montpont-ir-dec',accountId:'cic-montpont',day:28,frequency:'once',date:'2026-12-28',label:'IR 2026 sur 2025 4-4',amount:-3710},
  // CIC Montévrain
  {id:'montevrain-tiime',accountId:'cic-montevrayn',day:1,frequency:'monthly',label:'De Tiime',amount:1020},
  {id:'montevrain-mercedes',accountId:'cic-montevrayn',day:8,frequency:'monthly',label:'Crédit Mercedes',amount:-1017.07},
  {id:'montevrain-fees',accountId:'cic-montevrayn',day:8,frequency:'monthly',label:'Frais de tenue de compte',amount:-2.25},
  // BoursoBank and BoursoFirst
  {id:'bourso-first-fee',accountId:'bourso',day:1,frequency:'monthly',label:'BoursoFirst',amount:-29},
  {id:'bourso-to-first',accountId:'bourso',day:1,frequency:'monthly',label:'Vers BoursoFirst',amount:-10},
  {id:'bourso-lombard',accountId:'bourso',day:1,frequency:'quarterly',months:[1,4,7,10],label:'Intérêts Lombard (trimestriels, mois à confirmer)',amount:-503.60},
  {id:'first-from-bourso',accountId:'bourso-first',day:1,frequency:'monthly',label:'De BoursoBank',amount:10},
  // Tiime — monthly invoice and provisions are editable templates
  {id:'tiime-invoice',accountId:'tiime',day:1,frequency:'monthly',label:'Facture X',amount:10000},
  {id:'tiime-vat',accountId:'tiime',day:1,frequency:'monthly',label:'TVA X',amount:-2200},
  {id:'tiime-social',accountId:'tiime',day:1,frequency:'monthly',label:'Charges sociales X',amount:-2800},
  {id:'tiime-fortuneo',accountId:'tiime',day:1,frequency:'monthly',label:'Vers Fortuneo',amount:-6000},
  {id:'tiime-mercedes',accountId:'tiime',day:2,frequency:'monthly',label:'Crédit Mercedes',amount:-1020},
  {id:'tiime-electra',accountId:'tiime',day:2,frequency:'monthly',label:'Electra+',amount:-40},
  {id:'tiime-indigo',accountId:'tiime',day:3,frequency:'monthly',label:'Indigo',amount:-46.40},
  {id:'tiime-expert',accountId:'tiime',day:3,frequency:'monthly',label:'Frais l-expert',amount:-94.80},
  {id:'tiime-wemind',accountId:'tiime',day:7,frequency:'monthly',label:'Wemind',amount:-32},
  {id:'tiime-mercedes-insurance',accountId:'tiime',day:9,frequency:'monthly',label:'Assurance Mercedes CIC',amount:-99.69},
  {id:'tiime-margin',accountId:'tiime',day:30,frequency:'monthly',label:'Marge X (bilan + AEN…)',amount:-500},
  {id:'tiime-fees',accountId:'tiime',day:13,frequency:'annual',months:[5],label:'Frais Tiime',amount:-259.06}
].map(t=>({enabled:true,...t}));

const $ = id => document.getElementById(id);
const euro = value => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(value)||0);
const dateFormat = value => { if(!value)return '—'; const d=new Date(value+'T12:00:00'); return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short',year:'numeric'}).format(d); };
const today = () => {const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
let state = loadState();
let toastTimer;

const cloud = {client:null,session:null,user:null,syncTimer:null,isApplyingCloud:false,isSyncing:false,loadedUserId:null};
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
function toCloudTransaction(t,userId){return {id:t.id,user_id:userId,account_id:t.accountId,transaction_date:t.date,label:t.label,amount:Number(t.amount),source:t.recurringTemplateId?'recurring':'manual',recurring_template_id:t.recurringTemplateId||null,generated_month:t.recurringKey?t.date.slice(0,7):null,recurring_key:t.recurringKey||null,created_at:new Date(Number(t.createdAt)||Date.now()).toISOString(),updated_at:new Date().toISOString()};}
function fromCloudTransaction(t){return {id:t.id,accountId:t.account_id,date:t.transaction_date,amount:Number(t.amount),label:t.label,createdAt:Date.parse(t.created_at)||Date.now(),recurringKey:t.recurring_key||undefined,recurringTemplateId:t.recurring_template_id||undefined};}
function toCloudTemplate(t,userId){return {id:t.id,user_id:userId,account_id:t.accountId,day_of_month:Number(t.day)||1,frequency:t.frequency,months:t.months||[],start_month:t.startMonth||null,end_month:t.endMonth||null,once_date:t.date||null,label:t.label,amount:t.amount===''||t.amount===undefined?null:t.amount,enabled:t.enabled!==false};}
function fromCloudTemplate(t){return {id:t.id,accountId:t.account_id,day:Number(t.day_of_month)||1,frequency:t.frequency,months:t.months||[],startMonth:t.start_month||undefined,endMonth:t.end_month||undefined,date:t.once_date||undefined,label:t.label,amount:t.amount===null?null:Number(t.amount),enabled:t.enabled};}
function uniqueTransactions(rows){
  const byId=new Map();rows.forEach(t=>byId.set(t.id,t));
  const byRecurring=new Map(),result=[];
  [...byId.values()].forEach(t=>{if(t.recurringKey){if(byRecurring.has(t.recurringKey))return;byRecurring.set(t.recurringKey,true);}result.push(t);});
  return result;
}
async function syncCloudState(){
  if(!cloud.user||cloud.isApplyingCloud||cloud.isSyncing)return;
  cloud.isSyncing=true;
  try{
    const client=cloudClient(),uid=cloud.user.id;
    const accounts=state.accounts.map(a=>toCloudAccount(a,uid));
    const templates=(state.recurringTemplates||[]).map(t=>toCloudTemplate(t,uid));
    const transactions=state.transactions.map(t=>toCloudTransaction(t,uid));
    if(accounts.length){const {error}=await client.from('accounts').upsert(accounts,{onConflict:'user_id,id'});if(error)throw error;}
    if(templates.length){const {error}=await client.from('recurring_templates').upsert(templates,{onConflict:'user_id,id'});if(error)throw error;}
    if(transactions.length){const {error}=await client.from('transactions').upsert(transactions,{onConflict:'id'});if(error)throw error;}
    const {data:remote,error:readError}=await client.from('transactions').select('id');
    if(readError)throw readError;
    const localIds=new Set(state.transactions.map(t=>t.id));
    for(const row of (remote||[])){if(!localIds.has(row.id)){const {error}=await client.from('transactions').delete().eq('id',row.id);if(error)throw error;}}
    cloudStatus('Synchronisé en ligne',true);
  }catch(error){
    console.error('Supabase sync failed',error);
    cloudStatus('Erreur de synchronisation',false);
    showToast('Sauvegarde en ligne impossible : '+(error.message||'vérifiez la configuration Supabase.'));
  }finally{cloud.isSyncing=false;}
}
async function loadCloudState(user){
  if(cloud.loadedUserId===user.id)return;
  cloud.loadedUserId=user.id;
  cloudStatus('Chargement des données…',true);
  try{
    const client=cloudClient();
    const [ar,tr,rr]=await Promise.all([
      client.from('accounts').select('*'),
      client.from('transactions').select('*').order('transaction_date',{ascending:true}),
      client.from('recurring_templates').select('*')
    ]);
    for(const result of [ar,tr,rr])if(result.error)throw result.error;
    const local=JSON.parse(JSON.stringify(state));
    localStorage.setItem('gestion-comptes-cloud-migration-backup-v1',JSON.stringify({savedAt:new Date().toISOString(),...local}));
    const remoteAccounts=(ar.data||[]).map(fromCloudAccount);
    const remoteTransactions=(tr.data||[]).map(fromCloudTransaction);
    const remoteTemplates=(rr.data||[]).map(fromCloudTemplate);
    const remoteHasData=remoteAccounts.length+remoteTransactions.length+remoteTemplates.length>0;
    if(!remoteHasData){
      cloud.isApplyingCloud=true;
      renderAll();
      cloud.isApplyingCloud=false;
      await syncCloudState();
      showToast('Première sauvegarde effectuée dans votre base en ligne.');
    }else{
      let transactions=remoteTransactions;
      if(local.transactions.length && remoteTransactions.length===0){
        transactions=uniqueTransactions([...remoteTransactions,...local.transactions]);
      }else if(local.transactions.length && remoteTransactions.length>0){
        const remoteIds=new Set(remoteTransactions.map(t=>t.id));
        const localOnly=local.transactions.filter(t=>!remoteIds.has(t.id));
        if(localOnly.length && window.confirm('Une copie locale contient '+localOnly.length+' opération(s) absente(s) du cloud. Voulez-vous les fusionner avec les données en ligne ? Cela peut réintroduire des opérations supprimées sur un autre appareil.\n\nOK : fusionner. Annuler : garder le cloud comme référence.')){
          transactions=uniqueTransactions([...remoteTransactions,...localOnly]);
        }
      }
      const accountMap=new Map(remoteAccounts.map(a=>[a.id,a]));
      local.accounts.forEach(a=>{if(!accountMap.has(a.id))accountMap.set(a.id,a);});
      const templateMap=new Map(remoteTemplates.map(t=>[t.id,t]));
      local.recurringTemplates.forEach(t=>{if(!templateMap.has(t.id))templateMap.set(t.id,t);});
      cloud.isApplyingCloud=true;
      state={accounts:[...accountMap.values()],transactions,recurringTemplates:[...templateMap.values()]};
      renderAll();
      cloud.isApplyingCloud=false;
      await syncCloudState();
      showToast('Données chargées depuis votre espace en ligne.');
    }
    cloudStatus('Synchronisé en ligne',true);
  }catch(error){
    cloud.isApplyingCloud=false;
    cloud.loadedUserId=null;
    cloudStatus('Cloud indisponible',false);
    cloudMessage('Impossible de lire la base : '+(error.message||'vérifiez que le schéma SQL a été exécuté dans Supabase.'));
    console.error('Supabase load failed',error);
  }
}
function saveState(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  if(cloud.user&&!cloud.isApplyingCloud){
    clearTimeout(cloud.syncTimer);
    cloudStatus('Enregistrement en cours…',true);
    cloud.syncTimer=setTimeout(()=>syncCloudState(),500);
  }
}
async function initCloud(){
  try{
    const client=cloudClient();
    client.auth.onAuthStateChange((event,session)=>{
      cloud.session=session;cloud.user=session?.user||null;
      if(cloud.user){
        $('cloud-open').textContent='Compte connecté';
        $('cloud-logout').hidden=false;
        cloudStatus('Connecté — synchronisation…',true);
        if(event!=='TOKEN_REFRESHED')setTimeout(()=>loadCloudState(cloud.user),0);
      }else{
        cloud.loadedUserId=null;
        $('cloud-open').textContent='Connexion cloud';
        $('cloud-logout').hidden=true;
        cloudStatus('Mode local — non synchronisé',false);
      }
    });
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    cloud.session=data.session;cloud.user=data.session?.user||null;
    if(cloud.user){$('cloud-open').textContent='Compte connecté';$('cloud-logout').hidden=false;await loadCloudState(cloud.user);}
  }catch(error){
    cloudStatus('Cloud non configuré',false);
    cloudMessage(error.message||'Impossible d’initialiser Supabase.');
    console.error('Supabase init failed',error);
  }
}

function loadState(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && Array.isArray(saved.accounts) && Array.isArray(saved.transactions)){
      const accounts=saved.accounts.map(a=>{const merged={...a,...(DEFAULT_ACCOUNTS.find(d=>d.id===a.id)||{}),...a};if(merged.id==='cic-montevrayn'&&merged.name==='CIC Montévrayn')merged.name='CIC Montévrain';return merged;});
      const recurringTemplates=Array.isArray(saved.recurringTemplates)?saved.recurringTemplates.map(t=>({...t})):DEFAULT_RECURRING_TEMPLATES.map(t=>({...t}));
      DEFAULT_RECURRING_TEMPLATES.forEach(t=>{if(!recurringTemplates.some(x=>x.id===t.id))recurringTemplates.push({...t});});
      DEFAULT_ACCOUNTS.forEach(d=>{if(!accounts.some(a=>a.id===d.id))accounts.push({...d});});
      return {accounts,transactions:saved.transactions,recurringTemplates};
    }
  }catch(e){console.warn('Données locales illisibles',e);}
  return {accounts:DEFAULT_ACCOUNTS.map(a=>({...a})),transactions:[],recurringTemplates:DEFAULT_RECURRING_TEMPLATES.map(t=>({...t}))};
}

function accountById(id){return state.accounts.find(a=>a.id===id);}
function accountTransactions(accountId){return state.transactions.filter(t=>t.accountId===accountId).sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt-b.createdAt);}
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
function bankLogo(account){const cls=account.id.startsWith('lbp')?'lbp':account.id.startsWith('fortuneo')?'fortuneo':account.id.startsWith('cic')?'cic':account.id.startsWith('bourso')?'bourso':'tiime';return '<span class="bank-logo '+cls+'">'+escapeHtml(account.short)+'</span>';}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function kindLabel(a){return a.kind==='pro'?'Professionnel':a.kind==='savings'?'Épargne':'Compte courant';}
function accountMarkup(a,compact=false){
  const balance=balanceAt(a.id);
  if(compact)return '<div class="account-row" data-account-open="'+a.id+'">'+bankLogo(a)+'<div class="account-info"><strong>'+escapeHtml(a.name)+'</strong><small>'+kindLabel(a)+'</small></div><div class="account-balance">'+euro(balance)+'<small>'+state.transactions.filter(t=>t.accountId===a.id).length+' opération(s)</small></div></div>';
  const extra=a.kind==='pro'?'<div class="account-card-label">Net estimé après provisions : <strong>'+euro(tiimeNetBalance(a))+'</strong></div>':'<div class="account-card-label">'+state.transactions.filter(t=>t.accountId===a.id).length+' transaction(s) enregistrée(s)</div>';
  return '<article class="account-card" data-account-open="'+a.id+'"><div class="account-card-top">'+bankLogo(a)+'<div class="account-info"><strong>'+escapeHtml(a.name)+'</strong><small>'+kindLabel(a)+'</small></div><button class="edit-account" data-edit-account="'+a.id+'" aria-label="Configurer '+escapeHtml(a.name)+'" title="Configurer le compte">···</button></div><div class="account-card-balance">'+euro(balance)+'</div>'+extra+'<div class="account-card-foot"><span>Solde actuel</span><button data-account-transactions="'+a.id+'">Historique →</button></div></article>';
}
function renderDashboard(){
  const total=state.accounts.reduce((sum,a)=>sum+balanceAt(a.id),0);
  const bank=state.accounts.filter(a=>a.kind!=='pro').reduce((sum,a)=>sum+balanceAt(a.id),0);
  const pro=accountById('tiime');
  $('total-balance').textContent=euro(total);$('bank-balance').textContent=euro(bank);$('pro-balance').textContent=euro(pro?tiimeNetBalance(pro):0);
  $('dashboard-accounts').innerHTML=state.accounts.map(a=>accountMarkup(a,true)).join('');
  const recent=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt).slice(0,6);
  $('recent-transactions').innerHTML=recent.length?recent.map(t=>{const a=accountById(t.accountId)||{name:'Compte supprimé'};return '<div class="recent-row"><span class="movement-icon '+(t.amount>=0?'income':'expense')+'">'+(t.amount>=0?'↙':'↗')+'</span><div class="movement-main"><strong>'+escapeHtml(t.label)+'</strong><small>'+escapeHtml(a.name)+' · '+dateFormat(t.date)+'</small></div><span class="movement-amount '+(t.amount>=0?'positive':'negative')+'">'+(t.amount>0?'+':'')+euro(t.amount)+'</span></div>';}).join(''):'<div class="empty-state">Aucune opération pour le moment.<br>Ajoutez une transaction pour commencer.</div>';
  $('account-count').textContent=state.accounts.length;
}
function renderAccounts(){
  const query=$('account-search').value.trim().toLocaleLowerCase('fr');
  const accounts=state.accounts.filter(a=>a.name.toLocaleLowerCase('fr').includes(query));
  $('all-accounts').innerHTML=accounts.length?accounts.map(a=>accountMarkup(a)).join(''):'<div class="empty-state">Aucun compte ne correspond à cette recherche.</div>';
  $('accounts-total-label').textContent=state.accounts.length+' comptes';
}
function fillAccountSelects(){
  const opts=state.accounts.map(a=>'<option value="'+a.id+'">'+escapeHtml(a.name)+'</option>').join('');
  $('transaction-account').innerHTML=opts;
  const current=$('transaction-account-filter').value;
  $('transaction-account-filter').innerHTML=opts;
  $('transaction-account-filter').value=state.accounts.some(a=>a.id===current)?current:(state.accounts[0]?.id||'');
}
function renderTransactions(){
  const accountFilter=$('transaction-account-filter').value,typeFilter=$('transaction-type-filter').value,query=$('transaction-search').value.trim().toLocaleLowerCase('fr');
  const sorted=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
  const list=sorted.filter(t=>{
    const a=accountById(t.accountId);
    return t.accountId===accountFilter&&(typeFilter==='all'||(typeFilter==='income'?t.amount>=0:t.amount<0))&&((t.label+' '+(a?.name||'')).toLocaleLowerCase('fr').includes(query));
  });
  $('transaction-head').innerHTML='<tr><th>DATE</th><th>TRANSACTION</th><th>COMPTE</th><th>MONTANT</th><th>SOLDE À DATE</th>'+(accountFilter==='tiime'?'<th>MONTANT APRÈS PROVISIONS</th><th>SOLDE NET ESTIMÉ</th>':'')+'<th>ACTIONS</th></tr>';
  $('transaction-rows').innerHTML=list.length?list.map(t=>{
    const a=accountById(t.accountId)||{name:'Compte supprimé',short:'?',kind:'bank'};
    const balance=balanceAfterTransaction(t);
    const calc=tiimeCalc(a,Number(t.amount));
    const net=tiimeNetBalance(a);
    return '<tr><td>'+dateFormat(t.date)+'</td><td class="transaction-label">'+escapeHtml(t.label)+'</td><td><div class="table-account">'+bankLogo(a)+'<span>'+escapeHtml(a.name)+'</span></div></td><td class="table-amount '+(t.amount>=0?'positive':'negative')+'">'+(t.amount>0?'+':'')+euro(t.amount)+'</td><td class="table-balance">'+euro(balance)+'</td>'+(accountFilter==='tiime'?'<td>'+euro(calc.net)+'</td><td class="table-balance">'+euro(net)+'</td>':'')+'<td><div class="row-actions"><button data-edit-transaction="'+t.id+'">Modifier</button><button data-delete-transaction="'+t.id+'">Supprimer</button></div></td></tr>';
  }).join(''):'<tr><td colspan="8"><div class="empty-state">Aucune transaction trouvée. Ajoutez une opération pour la voir ici.</div></td></tr>';
  $('transaction-footer').textContent=list.length+' opération(s) affichée(s) · Solde à date calculé à partir du solde de départ et des mouvements enregistrés.';
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
  const templates=state.recurringTemplates||[];
  $('recurring-rows').innerHTML=templates.map(t=>{
    const a=accountById(t.accountId)||{name:'Compte inconnu'};
    const value=t.amount===null||t.amount===undefined?'':String(t.amount);
    return '<tr><td><input class="recurring-enabled" type="checkbox" data-recurring-enabled="'+t.id+'" '+(t.enabled?'checked':'')+' aria-label="Activer '+escapeHtml(t.label)+'"></td><td>'+escapeHtml(a.name)+'</td><td><div>'+escapeHtml(recurringFrequencyLabel(t))+'</div>'+(t.frequency==='once'?'':'<label class="recurring-day-label">Jour <input class="recurring-day" type="number" min="1" max="31" step="1" data-recurring-day="'+t.id+'" value="'+Number(t.day||1)+'" aria-label="Jour du mois"></label>')+'</td><td><input class="recurring-label" type="text" data-recurring-label="'+t.id+'" value="'+escapeHtml(t.label)+'" aria-label="Libellé"></td><td><input class="recurring-amount" type="number" step="0.01" data-recurring-amount="'+t.id+'" value="'+escapeHtml(value)+'" placeholder="À renseigner" aria-label="Montant"></td></tr>';
  }).join('');
  const blank=templates.filter(t=>t.enabled&&(t.amount===null||t.amount===undefined||t.amount==='')).length;
  $('recurring-summary').textContent=templates.length+' modèles · '+blank+' montant(s) à renseigner · les opérations déjà générées seront ignorées.';
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
function generateRecurringForMonth(month){
  if(!/^\d{4}-\d{2}$/.test(month)){showToast('Choisissez un mois valide.');return;}
  const additions=[];
  (state.recurringTemplates||[]).forEach(t=>{
    if(!t.enabled||t.amount===null||t.amount===undefined||t.amount===''||!Number.isFinite(Number(t.amount)))return;
    const date=dueDateForTemplate(t,month);if(!date)return;
    const recurringKey=t.id+'@'+date;
    if(state.transactions.some(x=>x.recurringKey===recurringKey))return;
    additions.push({id:crypto.randomUUID(),accountId:t.accountId,date,amount:Number(t.amount),label:t.label,createdAt:Date.now()+additions.length,recurringKey,recurringTemplateId:t.id});
  });
  if(!additions.length){const message='Aucune nouvelle opération à ajouter pour '+monthName(month)+'. Vérifiez les montants, les fréquences et les doublons.';if($('recurring-summary'))$('recurring-summary').textContent=message;showToast(message);return;}
  state.transactions.push(...additions);
  renderAll();
  const message=additions.length+' opération(s) ajoutée(s) pour '+monthName(month)+'.';
  if($('recurring-summary'))$('recurring-summary').textContent=message+' Les montants vides et les doublons ont été ignorés.';
  showToast(message);
}

function renderAll(){fillAccountSelects();renderDashboard();renderAccounts();renderTransactions();renderRecurring();saveState();}
function showToast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
function navigate(view){
  document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id===view+'-view'));
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
  $('breadcrumb-current').textContent=({dashboard:"Vue d'ensemble",accounts:'Mes comptes',transactions:'Transactions',recurring:'Récurrences'})[view]||view;
  if(view==='recurring')renderRecurring();
  if(view==='accounts')renderAccounts();if(view==='transactions')renderTransactions();
  window.scrollTo({top:0,behavior:'smooth'});
}
function openTransaction(accountId=null,transaction=null){
  $('transaction-form').reset();$('transaction-id').value=transaction?.id||'';
  $('transaction-modal-title').textContent=transaction?'Modifier la transaction':'Nouvelle transaction';
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
function exportData(){
  const payload={application:'Gestion de comptes',exportedAt:new Date().toISOString(),...state};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='gestion-comptes-'+today()+'.json';a.click();URL.revokeObjectURL(url);showToast('Export JSON téléchargé.');
}
function downloadCsv(){
  const rows=[['Date','Transaction','Compte','Montant','Solde à date','Montant après provisions','Solde net estimé']];
  [...state.transactions].sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>{const a=accountById(t.accountId);rows.push([t.date,t.label,a?.name||'',t.amount,balanceAt(t.accountId,t.date),a?.kind==='pro'?tiimeCalc(a,t.amount).net:'',a?.kind==='pro'?tiimeNetBalance(a):'']);});
  const csv=rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='transactions-'+today()+'.csv';a.click();URL.revokeObjectURL(url);showToast('Export CSV téléchargé.');
}
document.querySelectorAll('.nav-item').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.view)));
document.querySelectorAll('[data-goto]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.goto)));
$('generate-current-month').addEventListener('click',()=>generateRecurringForMonth(nextMonthValue()));
$('recurring-add-month').addEventListener('click',()=>generateRecurringForMonth(nextMonthValue()));
$('recurring-month').value=nextMonthValue();
$('recurring-rows').addEventListener('change',event=>{
  const enabled=event.target.closest('[data-recurring-enabled]');
  if(enabled){const t=state.recurringTemplates.find(x=>x.id===enabled.dataset.recurringEnabled);if(t){t.enabled=enabled.checked;saveState();renderRecurring();}return;}
  const amount=event.target.closest('[data-recurring-amount]');
  if(amount){const t=state.recurringTemplates.find(x=>x.id===amount.dataset.recurringAmount);if(t){t.amount=amount.value.trim()===''?null:Number(amount.value);saveState();renderRecurring();}return;}
  const day=event.target.closest('[data-recurring-day]');
  if(day){const t=state.recurringTemplates.find(x=>x.id===day.dataset.recurringDay);if(t){t.day=Math.min(31,Math.max(1,Number(day.value)||1));saveState();renderRecurring();}return;}
  const label=event.target.closest('[data-recurring-label]');
  if(label){const t=state.recurringTemplates.find(x=>x.id===label.dataset.recurringLabel);if(t){t.label=label.value.trim()||t.label;saveState();renderRecurring();}}
});
['quick-add','accounts-add','transactions-add'].forEach(id=>$(id).addEventListener('click',()=>openTransaction()));
$('account-search').addEventListener('input',renderAccounts);
$('transaction-search').addEventListener('input',renderTransactions);
$('transaction-account-filter').addEventListener('change',renderTransactions);
$('transaction-type-filter').addEventListener('change',renderTransactions);
$('cloud-open').addEventListener('click',()=>{$('cloud-message').textContent=cloud.user?'Vous êtes connecté à votre espace privé.':'Connectez-vous ou créez votre compte pour activer la synchronisation.';$('cloud-logout').hidden=!cloud.user;$('cloud-dialog').showModal();});
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
    const {data,error}=await cloudClient().auth.signUp({email:$('cloud-email').value.trim(),password:$('cloud-password').value});
    if(error)throw error;
    if(data.session){cloudMessage('Compte créé. Chargement des données…');$('cloud-dialog').close();}
    else cloudMessage('Compte créé. Consultez votre e-mail pour confirmer l’adresse, puis connectez-vous.');
  }catch(error){cloudMessage(error.message||'Création du compte impossible.');}
});
$('cloud-logout').addEventListener('click',async()=>{
  try{const {error}=await cloudClient().auth.signOut();if(error)throw error;$('cloud-dialog').close();cloudMessage('Déconnexion effectuée. Les données locales restent disponibles.');}
  catch(error){cloudMessage(error.message||'Déconnexion impossible.');}
});
$('export-btn').addEventListener('click',()=>{
  const choice=window.confirm('OK : exporter toutes les données en JSON.\nAnnuler : exporter uniquement les transactions en CSV.');
  choice?exportData():downloadCsv();
});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.close).close()));
$('transaction-form').addEventListener('submit',event=>{
  event.preventDefault();
  const id=$('transaction-id').value,accountId=$('transaction-account').value,date=$('transaction-date').value,amount=Number($('transaction-amount').value),label=$('transaction-label').value.trim();
  if(!date||!label||!Number.isFinite(amount)){showToast('Vérifiez les informations saisies.');return;}
  const previous=id?state.transactions.find(t=>t.id===id):null;
  const record={id:id||crypto.randomUUID(),accountId,date,amount,label,createdAt:previous?.createdAt||Date.now()};
  if(previous)state.transactions=state.transactions.map(t=>t.id===id?record:t);else state.transactions.push(record);
  $('transaction-dialog').close();renderAll();showToast(previous?'Transaction modifiée.':'Transaction ajoutée.');
});
$('account-form').addEventListener('submit',event=>{
  event.preventDefault();const a=accountById($('edit-account-id').value);if(!a)return;
  a.name=$('edit-account-name').value.trim();a.opening=Number($('edit-account-opening').value)||0;
  if(a.kind==='pro'){a.vatRate=Math.min(100,Math.max(0,Number($('edit-vat-rate').value)||0));a.socialRate=Math.min(100,Math.max(0,Number($('edit-social-rate').value)||0));a.netOpening=Number($('edit-account-net-opening').value)||0;}
  $('account-dialog').close();renderAll();showToast('Paramètres du compte enregistrés.');
});
document.addEventListener('click',event=>{
  const edit=event.target.closest('[data-edit-transaction]');
  if(edit){const t=state.transactions.find(t=>t.id===edit.dataset.editTransaction);if(t)openTransaction(t.accountId,t);return;}
  const del=event.target.closest('[data-delete-transaction]');
  if(del){const t=state.transactions.find(t=>t.id===del.dataset.deleteTransaction);if(t&&window.confirm('Supprimer la transaction « '+t.label+' » ?')){state.transactions=state.transactions.filter(x=>x.id!==t.id);renderAll();showToast('Transaction supprimée.');}return;}
  const editAccount=event.target.closest('[data-edit-account]');
  if(editAccount){event.stopPropagation();openAccountEditor(editAccount.dataset.editAccount);return;}
  const history=event.target.closest('[data-account-transactions]');
  if(history){event.stopPropagation();navigate('transactions');$('transaction-account-filter').value=history.dataset.accountTransactions;renderTransactions();return;}
  const account=event.target.closest('[data-account-open]');
  if(account){openAccountEditor(account.dataset.accountOpen);}
});
renderAll();
initCloud();
