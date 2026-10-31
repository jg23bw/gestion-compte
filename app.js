const STORAGE_KEY = 'gestion-comptes-v1';
const GENERATED_MONTHS_KEY = 'gestion-comptes-generated-months-v1';
const generationInProgress = new Set();
const today = () => {const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const generatedMonthsRepository = LocalStorageGeneratedMonthsRepository.create(localStorage, GENERATED_MONTHS_KEY);
// Catalogue des établissements proposés dans le formulaire de compte. Les logos
// locaux sont utilisés en priorité ; les banques sans logo utilisent un monogramme
// coloré. Le choix de la banque est enregistré dans `accounts.short` sous la forme
// `bank:<identifiant>` afin de ne pas nécessiter de migration SQL.
// Les modèles de récurrence sont des données personnelles : ils ne doivent pas être codés en dur dans le dépôt public.
const CRYPTO_PRICE_CACHE_KEY='gestion-comptes-crypto-prices-v2';
const CRYPTO_MARKET_ENDPOINT='https://api.coingecko.com/api/v3/coins/markets';
const CRYPTO_FALLBACK_ENDPOINT='https://api.coincap.io/v2/assets';
const CRYPTO_HISTORY_ENDPOINT='https://api.coingecko.com/api/v3/coins/';
const coinCapFallbackProvider = CoinCapFallbackProvider.create({ endpoint: CRYPTO_FALLBACK_ENDPOINT, coinIds: COINCAP_IDS });
const fearGreedProvider = AlternativeMeFearGreedProvider.create({ endpoint: 'https://api.alternative.me/fng/?limit=1&format=json' });
const CRYPTO_SEARCH_ENDPOINT='https://api.coingecko.com/api/v3/search';
const coinGeckoCatalogProvider = CoinGeckoCatalogProvider.create({ searchEndpoint: CRYPTO_SEARCH_ENDPOINT, resultLimit: 10 });
const CRYPTO_REFRESH_MS=300000;
const cryptoSearch={timer:null,controller:null,results:[]};
// Les positions crypto sont des données personnelles : elles ne doivent pas être
// codées en dur dans le dépôt public. Elles sont stockées dans Supabase
// (table crypto_holdings) et se gèrent depuis la page Crypto.

// Les actions et ETF sont stockés dans les métadonnées privées du compte Auth
// (comme les sous-types de comptes et le crédit lombard). Cette approche évite
// une migration SQL supplémentaire pour les positions et le nantissement.
const stockHoldingMetadataCommands = StockHoldingMetadataCommands.create({
  rules: StockHoldingRules.create({ currencies: STOCK_CURRENCIES, markets: STOCK_MARKETS, today })
});
// Catalogue local ISIN : facilite la sélection quand la recherche par symbole ne retrouve pas l'instrument.
// Les identifiants de cotation suivent le format renvoyé par StockAnalysis ; un cours peut rester indisponible selon la place.
const isManualValueHolding=holding=>StockValuation.isManualValueHolding(holding);
function manualHoldingValue(holding){return StockValuation.manualHoldingValue(holding,{now:Date.now(),today});}
function isInvestmentAccount(account){return ['pea','cto','av'].includes(effectiveAccountType(account));}
function stockCatalogResults(query){
  const q=String(query||'').trim().toUpperCase();
  if(!q)return [];
  return STOCK_ISIN_CATALOG.filter(item=>item.isin===q||item.symbol===q||item.name.toUpperCase().includes(q)).map(item=>({id:item.priceId,priceId:item.priceId,isin:item.isin,s:item.symbol,n:item.name,st:item.kind,market:item.market,currency:item.currency}));
}
const stockSearch={timer:null,seq:0,results:[]};
const stockPrices={values:{},updatedAt:0,error:'',loading:false};
const stockFx={rates:{EUR:1},updatedAt:0,error:'',loading:false};

const $ = id => document.getElementById(id);
const euro = value => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(value)||0);
const dateFormat = value => { if(!value)return '—'; const d=new Date(value+'T12:00:00'); return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d); };
const parseFrenchNumber = value => {if(value===null||value===undefined)return NaN;const raw=String(value).trim().replace(/[\s\u00a0\u202f']/g,'');if(!raw)return NaN;const normalized=raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw;return /^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)?Number(normalized):NaN;};
const formatFrenchNumberInput = value => {if(value===null||value===undefined||value==='')return '';const n=Number(value);return Number.isFinite(n)?String(n).replace('.',','):String(value);};
const dateInputFormat = value => String(value||'');
const dateInputParse = value => {const s=String(value||'').trim();let m=s.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);if(m){const day=Number(m[1]),month=Number(m[2]),year=Number(m[3]),d=new Date(Date.UTC(year,month-1,day));return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day?year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0'):'';}m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?dateInputParse(m[3]+'/'+m[2]+'/'+m[1]):'';};
let state = {accounts:[],transactions:[],recurringTemplates:[],cryptoHoldings:[],stockHoldings:[],accountPledges:{},lombardCredit:null};
const transactionRepository = StateTransactionRepository.create(() => state);
const recurringTemplateRepository = StateRecurringTemplateRepository.create(() => state);
const stockHoldingRepository = StateStockHoldingRepository.create(() => state);
const accountRepository = StateAccountRepository.create(() => state);
const accountPledgeCommands = AccountPledgeCommands.create({repository: accountRepository, rules: AccountPledgeRules});
const transactionQueries = TransactionQueries.create({repository: transactionRepository, domain: TransactionRules});
const transactionCommands = TransactionCommands.create({repository: transactionRepository, domain: TransactionRules});
const recurringTemplateCommands = RecurringTemplateCommands.create({repository: recurringTemplateRepository});
const stockHoldingCommands = StockHoldingCommands.create({repository: stockHoldingRepository});
const wealthSnapshotQueries = WealthSnapshotQueries.create({
  // Inject the current application ports expected by the query service.
  accounts: () => state.accounts,
  balanceAt,
  stockHoldings: () => stockHoldingCommands.findAll(),
  cryptoHoldings: () => state.cryptoHoldings || [],
  stockPriceDetails,
  cryptoPrice,
  isManualValueHolding,
  manualHoldingValue,
  lombardCredit: () => state.lombardCredit,
  effectiveAccountType
});
const accountCommands = AccountCommands.create({
  repository: accountRepository, isBankKey, accountShort,
  transactionRepository, recurringTemplateRepository, stockHoldingCommands
});
let toastTimer;
let undoPoint=null;
function cloneData(value){return JSON.parse(JSON.stringify(value));}
function prepareUndo(){undoPoint={state:cloneData(state),pendingDeletes:[...cloud.pendingDeletes],pendingTemplateDeletes:[...cloud.pendingTemplateDeletes],generatedMonths:generatedMonthsRepository.getRaw()};}
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
    cloud.accountTypesDirty=true;
    cloud.accountPledgesDirty=true;
    cloud.stockHoldingsDirty=true;
  }
  generatedMonthsRepository.restoreRaw(target.generatedMonths);
  undoPoint=null;renderAll();showToast('Action annulée.');
}

const cloud = {client:null,session:null,user:null,syncTimer:null,isApplyingCloud:false,isSyncing:false,syncAgain:false,loadedUserId:null,pendingDeletes:new Set(),pendingTemplateDeletes:new Set(),pendingCryptoDeletes:new Set(),pendingAccountDeletes:new Set(),accountTypesDirty:false,accountPledgesDirty:false,stockHoldingsDirty:false,authReady:false};
let cryptoTableReady=null;
const cryptoPrices={values:{},images:{},market:{},history:{},updatedAt:0,error:'',loading:false,fallback:false};
function cloudMessage(message){const el=$('cloud-message');if(el)el.textContent=message||'';}
function frenchAuthError(error){
  const message=String(error?.message||'').trim();
  if(/already registered|already been registered|user already exists/i.test(message))return 'Un compte existe déjà avec cette adresse. Utilisez « Se connecter ».';
  if(/invalid login credentials/i.test(message))return 'Adresse e-mail ou mot de passe incorrect.';
  if(/email not confirmed/i.test(message))return 'Confirmez votre adresse e-mail avant de vous connecter.';
  if(/rate limit|too many/i.test(message))return 'Trop de tentatives. Réessayez dans quelques minutes.';
  if(/password/i.test(message)&&/least|characters|length/i.test(message))return 'Le mot de passe ne respecte pas la longueur minimale demandée.';
  return message||'Opération impossible.';
}
function cloudStatus(message,connected=false){const el=$('cloud-status');if(!el)return;el.innerHTML='<i></i> '+escapeHtml(message);el.classList.toggle('cloud-connected',connected);}
let authenticationService=null;
function getAuthenticationService(){
  if(authenticationService)return authenticationService;
  const repository=SupabaseAuthenticationRepository.create({getClient:cloudClient});
  authenticationService=AuthenticationService.create({authenticationRepository:repository});
  return authenticationService;
}
function cloudClient(){
  if(cloud.client)return cloud.client;
  const config=window.GESTION_SUPABASE_CONFIG;
  if(!config?.url||!config?.publishableKey||!window.supabase?.createClient)throw new Error('Configuration Supabase introuvable. Vérifiez supabase-config.js et la connexion internet.');
  cloud.client=window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return cloud.client;
}
function bankByKey(value){
  const key=String(value||'').toLowerCase();
  return BANK_CATALOG.find(bank=>bank.id===key)||BANK_CATALOG[BANK_CATALOG.length-1];
}
function isBankKey(value){
  const key=String(value||'').toLowerCase();
  return BANK_CATALOG.some(bank=>bank.id===key);
}
function bankKeyFromId(id){
  const value=String(id||'').toLowerCase();
  if(value.startsWith('lbp'))return 'lbp';
  if(value.startsWith('fortuneo'))return 'fortuneo';
  if(value.startsWith('cic'))return 'cic';
  if(value.startsWith('bourso'))return 'bourso';
  if(value.startsWith('tiime'))return 'tiime';
  return 'other';
}
function bankKeyForAccount(account){
  const key=String(account?.bank||'').toLowerCase();
  if(isBankKey(key))return key;
  return bankKeyFromId(account?.id);
}
function bankLogo(account={}){
  const bank=bankByKey(bankKeyForAccount(account));
  const src=bank.logo||'';
  const initials=bank.initials||accountShort(account.name||'Compte');
  const background=src?'#fff':bank.color+'18';
  return '<span class="bank-logo bank-'+escapeHtml(bank.id)+(src?' has-logo':'')+'" style="--bank-accent:'+bank.color+';background:'+background+';color:'+bank.color+'" data-bank="'+escapeHtml(bank.id)+'" title="'+escapeHtml(bank.name)+'">'+
    (src?'<img src="'+escapeHtml(src)+'" alt="Logo '+escapeHtml(bank.name)+'" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">':'')+
    '<span '+(src?'hidden':'')+'>'+escapeHtml(initials)+'</span></span>';
}
function isAccountType(value){return AccountTypeRules.isAccountType(value);}
const accountTypeCommands = AccountTypeCommands.create({ rules: AccountTypeRules });
const accountCloudMapper = SupabaseAccountMapper.create({
  bankKeyForAccount, accountShort, bankKeyFromId, isBankKey, accountTypeCommands
});
function normalizeAccountTypes(value){return accountTypeCommands.normalize(value);}
function normalizeAccountPledges(value){return accountPledgeCommands.normalize(value);}
function normalizeStockCurrency(value){return stockHoldingMetadataCommands.normalizeCurrency(value);}
function normalizeStockHoldings(value){return stockHoldingMetadataCommands.normalize(value);}
const legacyStateLoader = LegacyStateLoader.create({
  storage:localStorage,storageKey:STORAGE_KEY,defaultAccounts:DEFAULT_ACCOUNTS,
  bankKeyForAccount,normalizeStockHoldings,normalizeAccountPledges
});
function accountTypeOverrides(){return accountTypeCommands.overrides(state.accounts);}
function accountPledgeOverrides(){return accountPledgeCommands.overrides(state.accounts);}
function authMetadataRepository(){
  return SupabaseAuthMetadataRepository.create({
    auth:cloudClient().auth,
    onUserUpdated(user){
      cloud.user=user;
      if(cloud.session)cloud.session.user=user;
    }
  });
}
async function saveAccountMetadataToAuth(overrides=accountTypeOverrides(),pledges=accountPledgeOverrides()){
  if(!cloud.user)throw new Error('Connectez-vous pour enregistrer les paramètres des comptes.');
  await authMetadataRepository().update({accountTypes:overrides,accountPledges:pledges});
}
async function saveStockHoldingsToAuth(holdings){
  return stockHoldingMetadataCommands.save({
    user:cloud.user,
    metadataRepository:authMetadataRepository(),
    holdings
  });
}
function toCloudAccount(account,userId){return accountCloudMapper.toCloud(account,userId);}
function fromCloudAccount(account,accountTypes={}){return accountCloudMapper.fromCloud(account,accountTypes);}
const transactionCloudMapper = SupabaseTransactionMapper.create();
function toCloudTransaction(t,userId){return transactionCloudMapper.toCloud(t,userId);}
function fromCloudTransaction(t){return transactionCloudMapper.fromCloud(t);}
function toCloudTemplate(template,userId){return SupabaseRecurringTemplateMapper.toCloud(template,userId);}
function fromCloudTemplate(template){return SupabaseRecurringTemplateMapper.fromCloud(template);}
function toCloudCryptoHolding(holding,userId){return SupabaseCryptoHoldingMapper.toCloud(holding,userId);}
function fromCloudCryptoHolding(holding){return SupabaseCryptoHoldingMapper.fromCloud(holding);}
function isMissingCryptoTable(error){
  const code=error?.code||'',message=error?.message||'';
  return code==='42P01'||code==='PGRST205'||/crypto_holdings/i.test(message)&&/does not exist|could not find|schema cache/i.test(message);
}
const lombardCreditCommands = LombardCreditCommands.create({ rules: LombardCreditRules });
function normalizeLombardCredit(credit){return lombardCreditCommands.normalize(credit);}
async function saveLombardCreditToAuth(credit){
  return lombardCreditCommands.save({
    user:cloud.user,
    metadataRepository:authMetadataRepository(),
    credit
  });
}
function uniqueTransactions(rows){
  const byId=new Map();rows.forEach(t=>byId.set(t.id,t));
  const byRecurring=new Map(),result=[];
  [...byId.values()].forEach(t=>{if(t.recurringKey){if(byRecurring.has(t.recurringKey))return;byRecurring.set(t.recurringKey,true);}result.push(t);});
  return result;
}
function sameCloudValues(a,b,keys){return keys.every(key=>String(a[key]??'')===String(b[key]??''));}
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
  cloud.accountTypesDirty=false;
  cloud.accountPledgesDirty=false;
  cloud.stockHoldingsDirty=false;
  cloud.isApplyingCloud=true;
  state={accounts:[],transactions:[],recurringTemplates:[],cryptoHoldings:[],stockHoldings:[],accountPledges:{},lombardCredit:null};
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
    const authentication=getAuthenticationService();
    cloud.session=await authentication.getSession();
    cloud.user=cloud.session?.user||null;

    authentication.onAuthStateChange((event,session)=>{
      const previousUserId=cloud.user?.id||null;
      cloud.session=session;
      cloud.user=session?.user||null;
      if(!cloud.user){
        $('cloud-open').hidden=false;
        $('cloud-logout-sidebar').hidden=true;
        $('personal-space-label').textContent='Gestion personnelle';
        cloud.loadedUserId=null;
        if(event==='SIGNED_OUT'){
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem('gestion-comptes-cloud-migration-backup-v1');
        }
        lockApp(event==='SIGNED_OUT'?'Vous êtes déconnecté. Reconnectez-vous pour consulter vos données.':'Connectez-vous pour accéder à vos comptes.');
        return;
      }
      $('cloud-open').hidden=true;
      $('cloud-logout-sidebar').hidden=false;
      $('personal-space-label').textContent=cloud.user.email||'Compte personnel';
      $('cloud-logout').hidden=false;
      if(previousUserId!==cloud.user.id||event==='SIGNED_IN'){
        if(previousUserId&&previousUserId!==cloud.user.id)lockApp('Changement de compte : chargement de vos données privées…');
        cloud.loadedUserId=null;
        const currentUser=cloud.user;
        setTimeout(()=>{if(cloud.user?.id===currentUser.id)loadCloudState(currentUser);},0);
      }
    });

    if(cloud.user){
      $('cloud-open').hidden=true;
      $('cloud-logout-sidebar').hidden=false;
      $('personal-space-label').textContent=cloud.user.email||'Compte personnel';
      $('cloud-logout').hidden=false;
      await loadCloudState(cloud.user);
    }else{
      $('cloud-open').hidden=false;
      $('cloud-logout-sidebar').hidden=true;
      $('personal-space-label').textContent='Gestion personnelle';
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

function loadState(){return legacyStateLoader.load();}
function accountById(id){return state.accounts.find(a=>a.id===id);}
function accountShort(name){
  const words=String(name||'').trim().split(/\s+/).filter(Boolean);
  if(words.length>1)return words.slice(0,3).map(w=>w[0]).join('').toUpperCase().slice(0,3);
  return String(name||'').trim().slice(0,2).toUpperCase();
}
function accountPledgeFor(id){return accountPledgeCommands.find(id);}
function pledgedAccountCount(){return Object.keys(state.accountPledges||{}).filter(id=>accountById(id)).length;}
function pledgeBadgeMarkup(id){
  const pledge=accountPledgeFor(id);
  if(!pledge)return '';
  const note=String(pledge.note||'').trim();
  return '<span class="pledge-badge" title="'+escapeHtml(note||'Compte nanti')+'"><i aria-hidden="true"></i>Nanti</span>';
}
function pledgeNoteMarkup(id){
  const note=String(accountPledgeFor(id)?.note||'').trim();
  return note?'<div class="account-pledge-note" title="'+escapeHtml(note)+'">Nantissement : '+escapeHtml(note)+'</div>':'';
}
function transactionOrder(a,b){return TransactionRules.transactionOrder(a,b);}
function accountTransactions(accountId){return transactionQueries.listAccountTransactions(accountId);}
function normalizeTransactionOrder(){return transactionCommands.normalizeOrder(state.accounts);}
function moveTransaction(id,direction){
  const current=state.transactions.find(t=>t.id===id);if(!current)return;
  const accountId=current.accountId;
  const sortSelect=$('transaction-sort');
  const currentSort=sortSelect?.value||'date-asc';
  const visibleOrder=transactionQueries.accountTransactionsInDisplayOrder(accountId,currentSort);
  const index=visibleOrder.findIndex(t=>t.id===id),targetIndex=index+Number(direction);
  if(index<0||targetIndex<0||targetIndex>=visibleOrder.length)return;
  prepareUndo();
  const [moved]=visibleOrder.splice(index,1);visibleOrder.splice(targetIndex,0,moved);
  transactionCommands.reorder(accountId,visibleOrder.map(transaction=>transaction.id));
  if(sortSelect)sortSelect.value='manual';
  renderAll();
  showToast('Ordre manuel des opérations mis à jour.',true);
}
function balanceAt(accountId,untilDate=null){return transactionQueries.balanceAt(accountId,untilDate);}
function lombardAmount(){return Math.max(0,Number(state.lombardCredit?.amount)||0);}
function totalAccountsBalance(){return state.accounts.reduce((sum,a)=>sum+balanceAt(a.id),0);}
function stockValueForAccount(accountId){return stockHoldingCommands.findAll().filter(h=>h.accountId===accountId).reduce((sum,h)=>{if(isManualValueHolding(h))return sum+manualHoldingValue(h);const details=stockPriceDetails(h);return sum+(details.price!==null?Number(h.quantity||0)*details.price:Number(h.invested||0));},0);}
function totalStockValue(){return state.accounts.reduce((sum,a)=>sum+stockValueForAccount(a.id),0);}
function totalCryptoValue(){return (state.cryptoHoldings||[]).reduce((sum,h)=>{const price=cryptoPrice(h);return sum+(price!==null?Number(h.quantity||0)*price:Number(h.invested||0));},0);}
function accountOverviewBalance(accountId){return balanceAt(accountId)+stockValueForAccount(accountId);}
function balanceAfterTransaction(transaction){return transactionQueries.balanceAfterTransaction(transaction);}
function tiimeCalc(account,amount){return TransactionRules.calculateProfessionalAmounts(account,amount);}
function proRecurringKind(transaction){return TransactionRules.professionalRecurringKind(transaction,state.recurringTemplates||[]);}
function proAdjustedAmount(transaction){return TransactionRules.professionalAdjustedAmount(transaction,state.recurringTemplates||[]);}
function proAdjustedDelta(transaction){return TransactionRules.professionalAdjustedDelta(transaction,state.recurringTemplates||[]);}
function proAdjustedBalanceAt(account,untilDate=today()){return transactionQueries.professionalAdjustedBalanceAt(account.id,untilDate);}
function tiimeNetBalance(account){return proAdjustedBalanceAt(account,today());}
function tiimeNetBalanceAt(account,untilDate=today()){return proAdjustedBalanceAt(account,untilDate);}
function effectiveAccountType(account){return AccountTypeRules.effectiveType(account);}
function kindLabel(a){
  const type=effectiveAccountType(a);
  return type==='pro'?'Professionnel':type==='pea'?'PEA':type==='av'?'Assurance vie':type==='cto'?'CTO':type==='savings'?'Épargne':'Compte courant';
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderAll(){fillAccountSelects();renderDashboard();renderAccounts();renderTransactions();renderRecurring();renderMonthlyHistory();renderCrypto();renderStocks();if($('opportunities-view'))renderOpportunities();saveState();}
function showToast(message,withUndo=false){const el=$('toast');if(!el)return;el.replaceChildren(document.createTextNode(message));if(withUndo&&undoPoint){const button=document.createElement('button');button.type='button';button.className='toast-undo';button.textContent='Annuler';button.setAttribute('aria-label','Annuler la dernière action');button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();try{undoLastAction();}catch(error){console.error('Undo failed',error);showToast('Impossible d’annuler cette action : '+(error.message||'erreur inconnue.'));}},{once:true});el.append(document.createTextNode(' '),button);}el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.classList.remove('show');if(withUndo)undoPoint=null;},10000);}

function wealthSnapshot(){return wealthSnapshotQueries.snapshot();}
function navigate(view){
  document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id===view+'-view'));
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
  $('breadcrumb-current').textContent=({dashboard:"Vue d'ensemble",accounts:'Mes comptes',transactions:'Opérations',pro:'Compte professionnel',history:'Historique mensuel',crypto:'Crypto',stocks:'Actions',opportunities:'Opportunités',recurring:'Récurrences',fire:'FIRE',comparisons:'Comparaisons',lombard:'Lombard'})[view]||view;
  if(['dashboard','fire','comparisons','lombard'].includes(view))renderWealthViews();
  if(view==='recurring')renderRecurring();
  if(view==='accounts')renderAccounts();if(view==='transactions'||view==='pro')renderTransactions();if(view==='history')renderMonthlyHistory();
  if(view==='crypto'){renderCrypto();if(Date.now()-cryptoPrices.updatedAt>CRYPTO_REFRESH_MS)loadCryptoPrices();}
  if(view==='stocks'){renderStocks();if(Date.now()-stockPrices.updatedAt>STOCK_REFRESH_MS)loadStockPrices();}
  if(view==='opportunities'){renderOpportunities();if(Date.now()-cryptoPrices.updatedAt>CRYPTO_REFRESH_MS)loadCryptoPrices();if(Date.now()-stockPrices.updatedAt>STOCK_REFRESH_MS)loadStockPrices();}
  window.scrollTo({top:0,behavior:'smooth'});
}
async function mcpTokenRequest(payload){
  return mcpTokenService.request({ user: cloud.user, payload });
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
  [...state.transactions].sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>{const a=accountById(t.accountId);rows.push([t.date,t.label,a?.name||'',t.amount,balanceAt(t.accountId,t.date),a?.id==='tiime'&&a?.kind==='pro'?tiimeCalc(a,t.amount).net:'',a?.id==='tiime'&&a?.kind==='pro'?tiimeNetBalance(a):'']);});
  const csv=rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='operations-'+today()+'.csv';a.click();URL.revokeObjectURL(url);showToast('Export CSV téléchargé.');
}
initializeDomEventHandlers();

