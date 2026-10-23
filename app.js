const STORAGE_KEY = 'gestion-comptes-v1';
const GENERATED_MONTHS_KEY = 'gestion-comptes-generated-months-v1';
const generationInProgress = new Set();
// Catalogue des établissements proposés dans le formulaire de compte. Les logos
// locaux sont utilisés en priorité ; les banques sans logo utilisent un monogramme
// coloré. Le choix de la banque est enregistré dans `accounts.short` sous la forme
// `bank:<identifiant>` afin de ne pas nécessiter de migration SQL.
const BANK_CATALOG = [
  {id:'banque-populaire',name:'Banque Populaire',logo:'assets/banks/banque-populaire.svg',color:'#0066b3',initials:'BP'},
  {id:'bforbank',name:'BforBank',color:'#111a2c',initials:'BF'},
  {id:'bnp',name:'BNP Paribas',logo:'assets/banks/bnp.svg',color:'#00915a',initials:'BNP'},
  {id:'bourso',name:'BoursoBank',logo:'assets/banks/bourso.svg',color:'#7e56c9',initials:'B'},
  {id:'bourse-direct',name:'Bourse Direct',color:'#0b3d91',initials:'BD'},
  {id:'caisse-epargne',name:"Caisse d'Épargne",color:'#e2001a',initials:'CE'},
  {id:'cic',name:'CIC',logo:'assets/banks/cic.svg',color:'#315bb2',initials:'CIC'},
  {id:'credit-agricole',name:'Crédit Agricole',logo:'assets/banks/credit-agricole.svg',color:'#006a4e',initials:'CA'},
  {id:'credit-mutuel',name:'Crédit Mutuel',logo:'assets/banks/credit-mutuel.svg',color:'#003b7a',initials:'CM'},
  {id:'degiro',name:'DEGIRO',logo:'assets/banks/degiro.svg',color:'#e94b35',initials:'D'},
  {id:'etoro',name:'eToro',logo:'assets/banks/etoro.svg',color:'#1e9a55',initials:'eT'},
  {id:'fortuneo',name:'Fortuneo',logo:'assets/banks/fortuneo.svg',color:'#1b9464',initials:'F'},
  {id:'hello-bank',name:'Hello bank!',logo:'assets/banks/hello-bank.svg',color:'#00a3e0',initials:'HB'},
  {id:'interactive-brokers',name:'Interactive Brokers',logo:'assets/banks/interactive-brokers.svg',color:'#d81222',initials:'IB'},
  {id:'lbp',name:'La Banque Postale',logo:'assets/banks/lbp.svg',color:'#0066b3',initials:'LBP'},
  {id:'lcl',name:'LCL',logo:'assets/banks/lcl.png',color:'#003b7a',initials:'LCL'},
  {id:'monabanq',name:'Monabanq',logo:'assets/banks/monabanq.png',color:'#e30613',initials:'M'},
  {id:'n26',name:'N26',logo:'assets/banks/n26.svg',color:'#111a2c',initials:'N26'},
  {id:'revolut',name:'Revolut',logo:'assets/banks/revolut.svg',color:'#111a2c',initials:'R'},
  {id:'saxo-banque',name:'Saxo Banque',logo:'assets/banks/saxo-banque.svg',color:'#0b1f3a',initials:'S'},
  {id:'societe-generale',name:'Société Générale',logo:'assets/banks/societe-generale.svg',color:'#e50a2b',initials:'SG'},
  {id:'swissquote',name:'Swissquote',logo:'assets/banks/swissquote.svg',color:'#1b3a6b',initials:'SQ'},
  {id:'tiime',name:'Tiime',logo:'assets/banks/tiime.svg',color:'#bd7b26',initials:'T'},
  {id:'trade-republic',name:'Trade Republic',logo:'assets/banks/trade-republic.svg',color:'#111a2c',initials:'TR'},
  {id:'wise',name:'Wise',logo:'assets/banks/wise.svg',color:'#2f7d32',initials:'W'},
  {id:'xtb',name:'XTB',logo:'assets/banks/xtb.svg',color:'#e31b23',initials:'XTB'},
  {id:'other',name:'Autre / initiales',color:'#5b6f99',initials:''}
];
const DEFAULT_ACCOUNTS = [
  {id:'lbp',name:'La Banque Postale',short:'LB',bank:'lbp',kind:'bank',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'fortuneo',name:'Fortuneo',short:'F',bank:'fortuneo',kind:'bank',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'fortuneo-plus',name:'Fortuneo livret Plus',short:'F+',bank:'fortuneo',kind:'savings',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'cic-montpont',name:'CIC Montpont-Ménestrol',short:'CIC',bank:'cic',kind:'bank',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'cic-montevrayn',name:'CIC Montévrain',short:'CIC',bank:'cic',kind:'bank',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'bourso',name:'BoursoBank',short:'B',bank:'bourso',kind:'bank',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'bourso-plus',name:'Livret BoursoBank Boursoplus',short:'B+',bank:'bourso',kind:'savings',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'bourso-first',name:'Livret BoursoBank BoursoFirst',short:'BF',bank:'bourso',kind:'savings',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'tiime',name:'Compte professionnel Tiime',short:'T',bank:'tiime',kind:'pro',opening:0,vatRate:20,socialRate:45,netOpening:0}
];

// Les modèles de récurrence sont des données personnelles : ils ne doivent pas être codés en dur dans le dépôt public.
const DEFAULT_RECURRING_TEMPLATES = [];

const CRYPTO_PRICE_CACHE_KEY='gestion-comptes-crypto-prices-v2';
const CRYPTO_MARKET_ENDPOINT='https://api.coingecko.com/api/v3/coins/markets';
const CRYPTO_SEARCH_ENDPOINT='https://api.coingecko.com/api/v3/search';
const CRYPTO_REFRESH_MS=60000;
const cryptoSearch={timer:null,controller:null,results:[]};
// Les positions crypto sont des données personnelles : elles ne doivent pas être
// codées en dur dans le dépôt public. Elles sont stockées dans Supabase
// (table crypto_holdings) et se gèrent depuis la page Crypto.

// Les actions et ETF sont stockés dans les métadonnées privées du compte Auth
// (comme les sous-types de comptes et le crédit lombard). Cette approche évite
// une migration SQL supplémentaire pour les positions et le nantissement.
const STOCK_PRICE_CACHE_KEY='gestion-comptes-stock-prices-v1';
const STOCK_FX_CACHE_KEY='gestion-comptes-stock-fx-v1';
const STOCK_FUNCTION_NAME='stock-data';
const STOCK_FX_ENDPOINT='https://open.er-api.com/v6/latest/EUR';
const STOCK_REFRESH_MS=5*60*1000;
const STOCK_CURRENCIES=['EUR','USD','GBP','GBX','CHF','CAD','JPY','HKD','AUD','NZD','SEK','NOK','DKK','PLN','CZK','HUF','SGD','CNY','INR','BRL','MXN','ZAR','KRW','TWD','TRY','ILS','AED','THB','QAR','PHP','OMR','KZT','ARS','RON'];
const STOCK_CURRENCY_LABELS={GBX:'GBX (pence)'};
const STOCK_MARKETS={
  EPA:{label:'Euronext Paris',currency:'EUR'},AMS:{label:'Euronext Amsterdam',currency:'EUR'},BRU:{label:'Euronext Bruxelles',currency:'EUR'},LIS:{label:'Euronext Lisbonne',currency:'EUR'},
  ETR:{label:'Xetra',currency:'EUR'},FRA:{label:'Bourse de Francfort',currency:'EUR'},VIE:{label:'Bourse de Vienne',currency:'EUR'},BIT:{label:'Borsa Italiana',currency:'EUR'},MIL:{label:'Borsa Italiana',currency:'EUR'},BME:{label:'Bourse de Madrid',currency:'EUR'},MCE:{label:'Bourse de Madrid',currency:'EUR'},ATH:{label:'Bourse d’Athènes',currency:'EUR'},HEL:{label:'Bourse d’Helsinki',currency:'EUR'},
  LON:{label:'London Stock Exchange',currency:'GBX'},SWX:{label:'SIX Swiss Exchange',currency:'CHF'},
  TYO:{label:'Tokyo Stock Exchange',currency:'JPY'},HKG:{label:'Hong Kong Stock Exchange',currency:'HKD'},SHA:{label:'Shanghai Stock Exchange',currency:'CNY'},SHE:{label:'Shenzhen Stock Exchange',currency:'CNY'},
  TSX:{label:'Toronto Stock Exchange',currency:'CAD'},CVE:{label:'TSX Venture',currency:'CAD'},NEO:{label:'Cboe Canada',currency:'CAD'},ASX:{label:'Australian Securities Exchange',currency:'AUD'},NZX:{label:'NZX',currency:'NZD'},
  OSL:{label:'Bourse d’Oslo',currency:'NOK'},STO:{label:'Bourse de Stockholm',currency:'SEK'},CPH:{label:'Bourse de Copenhague',currency:'DKK'},WSE:{label:'Bourse de Varsovie',currency:'PLN'},PRG:{label:'Bourse de Prague',currency:'CZK'},PRA:{label:'Bourse de Prague',currency:'CZK'},BUD:{label:'Bourse de Budapest',currency:'HUF'},IST:{label:'Bourse d’Istanbul',currency:'TRY'},TLV:{label:'Bourse de Tel-Aviv',currency:'ILS'},BUL:{label:'Bourse de Sofia',currency:'EUR'},
  NSE:{label:'NSE Inde',currency:'INR'},BSE:{label:'BSE Inde',currency:'INR'},KRX:{label:'Bourse de Corée',currency:'KRW'},TPE:{label:'Bourse de Taïwan',currency:'TWD'},SGX:{label:'Singapore Exchange',currency:'SGD'},JSE:{label:'Bourse de Johannesburg',currency:'ZAR'},BVMF:{label:'B3 Brésil',currency:'BRL'},BMV:{label:'Bourse du Mexique',currency:'MXN'},BCBA:{label:'Bourse de Buenos Aires',currency:'ARS'},BKK:{label:'Bourse de Thaïlande',currency:'THB'},QSE:{label:'Bourse du Qatar',currency:'QAR'},PSE:{label:'Bourse des Philippines',currency:'PHP'},MSM:{label:'Bourse de Mascate',currency:'OMR'},KASE:{label:'Bourse du Kazakhstan',currency:'KZT'},BVB:{label:'Bourse de Bucarest',currency:'RON'},
  OTC:{label:'OTC',currency:'USD'},NASDAQ:{label:'NASDAQ',currency:'USD'},NYSE:{label:'NYSE',currency:'USD'},AMEX:{label:'NYSE American',currency:'USD'},BATS:{label:'Cboe BZX',currency:'USD'},US:{label:'États-Unis',currency:'USD'}
};
// Catalogue local ISIN : facilite la sélection quand la recherche par symbole ne retrouve pas l'instrument.
// Les identifiants de cotation suivent le format renvoyé par StockAnalysis ; un cours peut rester indisponible selon la place.
const STOCK_ISIN_CATALOG = [
  {isin:'SUR000001737',symbol:'SUR000001737',name:'EUR SURAVENIR RENDEMENT 2 (fonds en euros – Fortuneo Vie)',priceId:'SUR-SUR000001737',market:'Assurance vie',currency:'EUR',kind:'s'},
  {isin:'IE00B5BMR087',symbol:'SXR8',name:'iShares Core S&P 500 UCITS ETF USD (Acc)',priceId:'ETR-SXR8',market:'Xetra',currency:'EUR',kind:'e'},
  {isin:'IE00B4L5Y983',symbol:'EUNL',name:'iShares Core MSCI World UCITS ETF USD (Acc)',priceId:'ETR-EUNL',market:'Xetra',currency:'EUR',kind:'e'},
  {isin:'IE00BK5BQT80',symbol:'VWCE',name:'Vanguard FTSE All-World UCITS ETF USD (Acc)',priceId:'ETR-VWCE',market:'Xetra',currency:'EUR',kind:'e'},
  {isin:'IE00B3XXRP09',symbol:'VUAA',name:'Vanguard S&P 500 UCITS ETF USD (Acc)',priceId:'ETR-VUAA',market:'Xetra',currency:'EUR',kind:'e'},
  {isin:'IE00BKM4GZ66',symbol:'IS3N',name:'iShares Core MSCI EM IMI UCITS ETF (Acc)',priceId:'ETR-IS3N',market:'Xetra',currency:'EUR',kind:'e'},
  {isin:'IE00B53SZB19',symbol:'CNDX',name:'iShares NASDAQ 100 UCITS ETF USD (Acc)',priceId:'ETR-CNDX',market:'Xetra',currency:'EUR',kind:'e'},
  {isin:'IE00B4L5Y983',symbol:'IWDA',name:'iShares Core MSCI World UCITS ETF USD (Acc)',priceId:'AMS-IWDA',market:'Euronext Amsterdam',currency:'EUR',kind:'e'},
  {isin:'IE00B3RBWM25',symbol:'VWRL',name:'Vanguard FTSE All-World UCITS ETF USD (Dist)',priceId:'AMS-VWRL',market:'Euronext Amsterdam',currency:'EUR',kind:'e'},
  {isin:'IE00B1XNHC34',symbol:'INRG',name:'iShares Global Clean Energy UCITS ETF',priceId:'LON-INRG',market:'London Stock Exchange',currency:'GBX',kind:'e'},
  {isin:'IE00B4K48X80',symbol:'EUNK',name:'iShares Core MSCI Europe UCITS ETF EUR (Acc)',priceId:'ETR-EUNK',market:'Xetra',currency:'EUR',kind:'e'},
  {isin:'LU1681043599',symbol:'CW8',name:'Amundi MSCI World UCITS ETF (Acc)',priceId:'EPA-CW8',market:'Euronext Paris',currency:'EUR',kind:'e'},
  {isin:'FR0013412285',symbol:'PE500',name:'Amundi PEA S&P 500 UCITS ETF',priceId:'EPA-PE500',market:'Euronext Paris',currency:'EUR',kind:'e'},
  {isin:'FR0011871110',symbol:'PUST',name:'Amundi PEA Nasdaq-100 UCITS ETF',priceId:'EPA-PUST',market:'Euronext Paris',currency:'EUR',kind:'e'},
  {isin:'LU1681038243',symbol:'ANX',name:'Amundi Nasdaq-100 UCITS ETF',priceId:'EPA-ANX',market:'Euronext Paris',currency:'EUR',kind:'e'},
  {isin:'LU1681045370',symbol:'AEEM',name:'Amundi MSCI Emerging Markets UCITS ETF',priceId:'EPA-AEEM',market:'Euronext Paris',currency:'EUR',kind:'e'},
  {isin:'LU0908500753',symbol:'MEUD',name:'Amundi STOXX Europe 600 UCITS ETF',priceId:'EPA-MEUD',market:'Euronext Paris',currency:'EUR',kind:'e'},
  {isin:'IE00B4K48X80',symbol:'EIMI',name:'iShares Core MSCI EM IMI UCITS ETF',priceId:'LON-EIMI',market:'London Stock Exchange',currency:'GBX',kind:'e'},
  
  {isin:'IE00B4L5Y983',symbol:'SWDA',name:'iShares Core MSCI World UCITS ETF USD (Acc)',priceId:'LON-SWDA',market:'London Stock Exchange',currency:'GBX',kind:'e'},
  {isin:'IE00B6R52259',symbol:'ISAC',name:'iShares MSCI ACWI UCITS ETF USD (Acc)',priceId:'LON-ISAC',market:'London Stock Exchange',currency:'USD',kind:'e'},
  {isin:'IE0031442068',symbol:'IUSA',name:'iShares Core S&P 500 UCITS ETF USD (Dist)',priceId:'LON-IUSA',market:'London Stock Exchange',currency:'GBX',kind:'e'},
  {isin:'IE00B5BMR087',symbol:'CSPX',name:'iShares Core S&P 500 UCITS ETF USD (Acc)',priceId:'AMS-CSPX',market:'Euronext Amsterdam',currency:'EUR',kind:'e'},
  {isin:'US0378331005',symbol:'AAPL',name:'Apple Inc.',priceId:'NASDAQ-AAPL',market:'NASDAQ',currency:'USD',kind:'s'},
  {isin:'US5949181045',symbol:'MSFT',name:'Microsoft Corporation',priceId:'NASDAQ-MSFT',market:'NASDAQ',currency:'USD',kind:'s'},
  {isin:'US67066G1040',symbol:'NVDA',name:'NVIDIA Corporation',priceId:'NASDAQ-NVDA',market:'NASDAQ',currency:'USD',kind:'s'},
  {isin:'US0231351067',symbol:'AMZN',name:'Amazon.com, Inc.',priceId:'NASDAQ-AMZN',market:'NASDAQ',currency:'USD',kind:'s'},
  {isin:'US02079K3059',symbol:'GOOGL',name:'Alphabet Inc. Class A',priceId:'NASDAQ-GOOGL',market:'NASDAQ',currency:'USD',kind:'s'},
  {isin:'US30303M1027',symbol:'META',name:'Meta Platforms, Inc.',priceId:'NASDAQ-META',market:'NASDAQ',currency:'USD',kind:'s'},
  {isin:'US88160R1014',symbol:'TSLA',name:'Tesla, Inc.',priceId:'NASDAQ-TSLA',market:'NASDAQ',currency:'USD',kind:'s'},
  {isin:'NL0010273215',symbol:'ASML',name:'ASML Holding N.V.',priceId:'AMS-ASML',market:'Euronext Amsterdam',currency:'EUR',kind:'s'},
  {isin:'FR0000121014',symbol:'MC',name:'LVMH',priceId:'EPA-MC',market:'Euronext Paris',currency:'EUR',kind:'s'},
  {isin:'FR0000121972',symbol:'SU',name:'Schneider Electric SE',priceId:'EPA-SU',market:'Euronext Paris',currency:'EUR',kind:'s'},
  {isin:'FR0000120321',symbol:'OR',name:"L'Oréal",priceId:'EPA-OR',market:'Euronext Paris',currency:'EUR',kind:'s'},
  {isin:'FR0000120271',symbol:'TTE',name:'TotalEnergies SE',priceId:'EPA-TTE',market:'Euronext Paris',currency:'EUR',kind:'s'},
  {isin:'FR0000120073',symbol:'AI',name:'Air Liquide',priceId:'EPA-AI',market:'Euronext Paris',currency:'EUR',kind:'s'},
  {isin:'FR0000120628',symbol:'CS',name:'AXA',priceId:'EPA-CS',market:'Euronext Paris',currency:'EUR',kind:'s'},
  {isin:'FR0000120578',symbol:'SAN',name:'Sanofi',priceId:'EPA-SAN',market:'Euronext Paris',currency:'EUR',kind:'s'},
  {isin:'DE0007164600',symbol:'SAP',name:'SAP SE',priceId:'ETR-SAP',market:'Xetra',currency:'EUR',kind:'s'},
  {isin:'US46625H1005',symbol:'JPM',name:'JPMorgan Chase & Co.',priceId:'NYSE-JPM',market:'NYSE',currency:'USD',kind:'s'},
  {isin:'US4781601046',symbol:'JNJ',name:'Johnson & Johnson',priceId:'NYSE-JNJ',market:'NYSE',currency:'USD',kind:'s'},
  {isin:'US7427181091',symbol:'PG',name:'Procter & Gamble',priceId:'NYSE-PG',market:'NYSE',currency:'USD',kind:'s'},
  {isin:'US78462F1030',symbol:'SPY',name:'SPDR S&P 500 ETF Trust',priceId:'NYSE-SPY',market:'NYSE',currency:'USD',kind:'e'},
  {isin:'US46090E1038',symbol:'QQQ',name:'Invesco QQQ Trust',priceId:'NASDAQ-QQQ',market:'NASDAQ',currency:'USD',kind:'e'}
];
function isManualValueHolding(holding){return Boolean(holding?.manualValue)||String(holding?.isin||'').toUpperCase()==='SUR000001737'||String(holding?.priceId||'').toUpperCase()==='SUR-SUR000001737';}
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
const dateFormat = value => { if(!value)return '—'; const d=new Date(value+'T12:00:00'); return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short',year:'numeric'}).format(d); };
const today = () => {const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
let state = {accounts:[],transactions:[],recurringTemplates:[],cryptoHoldings:[],stockHoldings:[],accountPledges:{},lombardCredit:null};
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
    cloud.accountTypesDirty=true;
    cloud.accountPledgesDirty=true;
    cloud.stockHoldingsDirty=true;
  }
  if(target.generatedMonths===null)localStorage.removeItem(GENERATED_MONTHS_KEY);else localStorage.setItem(GENERATED_MONTHS_KEY,target.generatedMonths);
  undoPoint=null;renderAll();showToast('Action annulée.');
}

const cloud = {client:null,session:null,user:null,syncTimer:null,isApplyingCloud:false,isSyncing:false,syncAgain:false,loadedUserId:null,pendingDeletes:new Set(),pendingTemplateDeletes:new Set(),pendingCryptoDeletes:new Set(),pendingAccountDeletes:new Set(),accountTypesDirty:false,accountPledgesDirty:false,stockHoldingsDirty:false,authReady:false};
let cryptoTableReady=null;
const cryptoPrices={values:{},images:{},updatedAt:0,error:'',loading:false};
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
  return '<span class="bank-logo'+(src?' has-logo':'')+'" style="background:'+background+';color:'+bank.color+'" data-bank="'+escapeHtml(bank.id)+'">'+
    (src?'<img src="'+escapeHtml(src)+'" alt="Logo '+escapeHtml(bank.name)+'" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">':'')+
    '<span '+(src?'hidden':'')+'>'+escapeHtml(initials)+'</span></span>';
}
function isAccountType(value){
  return ['bank','savings','pro','pea','av','cto'].includes(String(value||''));
}
function isAccountSubtype(value){
  return ['pea','av','cto'].includes(String(value||''));
}
function normalizeAccountTypes(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  const result={};
  for(const [id,type] of Object.entries(value))if(isAccountSubtype(type))result[id]=type;
  return result;
}
function normalizeAccountPledges(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  const result={};
  for(const [id,entry] of Object.entries(value)){
    if(!id)continue;
    if(entry===true){result[id]={note:''};continue;}
    if(!entry||typeof entry!=='object'||Array.isArray(entry))continue;
    result[id]={note:String(entry.note||'').trim().slice(0,160)};
  }
  return result;
}
function normalizeStockCurrency(value){
  const currency=String(value||'').trim().toUpperCase();
  return STOCK_CURRENCIES.includes(currency)?currency:'EUR';
}
function normalizeStockHoldings(value){
  if(!Array.isArray(value))return [];
  const result=[],seen=new Set();
  for(const raw of value){
    if(!raw||typeof raw!=='object')continue;
    const id=String(raw.id||'').trim();
    const accountId=String(raw.accountId||'').trim();
    const priceId=String(raw.priceId||raw.stockanalysisId||'').trim();
    const isin=String(raw.isin||'').trim().toUpperCase().slice(0,12);
    const symbol=String(raw.symbol||'').trim().toUpperCase().slice(0,24);
    if(!id||seen.has(id)||!accountId||!priceId||!symbol)continue;
    const invested=Number(raw.invested),quantity=Number(raw.quantity);
    if(!Number.isFinite(invested)||invested<0||(!Number.isFinite(quantity)&&!raw.manualValue))continue;
    const manualValue=Boolean(raw.manualValue)||isin==='SUR000001737'||priceId.toUpperCase()==='SUR-SUR000001737';
    const market=STOCK_MARKETS[String(priceId).split('-')[0].toUpperCase()]||STOCK_MARKETS.US;
    seen.add(id);
    result.push({
      id,accountId,priceId,symbol,isin,
      name:String(raw.name||symbol).trim().slice(0,160)||symbol,
      market:String(raw.market||market.label).trim().slice(0,80)||market.label,
      currency:normalizeStockCurrency(raw.currency||market.currency),
      invested,quantity:Number.isFinite(quantity)?quantity:0,manualValue,
      sortOrder:Number.isFinite(Number(raw.sortOrder))?Number(raw.sortOrder):0
    });
  }
  return result;
}
function accountTypeOverrides(){
  const result={};
  for(const account of state.accounts||[]){
    const type=account.accountType||account.kind;
    if(isAccountSubtype(type)&&type!==account.kind)result[account.id]=type;
  }
  return result;
}
function accountPledgeOverrides(){
  const result=normalizeAccountPledges(state.accountPledges);
  for(const id of Object.keys(result))if(!accountById(id))delete result[id];
  return result;
}
async function saveAccountMetadataToAuth(overrides=accountTypeOverrides(),pledges=accountPledgeOverrides()){
  if(!cloud.user)throw new Error('Connectez-vous pour enregistrer les paramètres des comptes.');
  const {data,error}=await cloudClient().auth.updateUser({data:{accountTypes:overrides,accountPledges:pledges}});
  if(error)throw error;
  if(data?.user){
    cloud.user=data.user;
    if(cloud.session)cloud.session.user=data.user;
  }
}
async function saveStockHoldingsToAuth(holdings){
  if(!cloud.user)throw new Error('Connectez-vous pour enregistrer les positions actions.');
  const normalized=normalizeStockHoldings(holdings);
  const {data,error}=await cloudClient().auth.updateUser({data:{stockHoldings:normalized}});
  if(error)throw error;
  if(data?.user){
    cloud.user=data.user;
    if(cloud.session)cloud.session.user=data.user;
  }
  return normalized;
}
function toCloudAccount(a,userId){return {id:a.id,user_id:userId,name:a.name,short:'bank:'+bankKeyForAccount(a),kind:a.kind,opening:Number(a.opening)||0,vat_rate:Number(a.vatRate??20),social_rate:Number(a.socialRate??45),net_opening:Number(a.netOpening)||0};}
function fromCloudAccount(a,accountTypes={}){
  const rawShort=String(a.short||'');
  const token=/^bank:([a-z0-9-]+)$/i.exec(rawShort);
  const bank=token&&isBankKey(token[1])?token[1].toLowerCase():bankKeyFromId(a.id);
  const kind=a.kind||'bank';
  const override=accountTypes?.[a.id];
  return {id:a.id,name:a.name,short:accountShort(a.name),bank,kind,accountType:isAccountSubtype(override)?override:kind,opening:Number(a.opening)||0,vatRate:Number(a.vat_rate??20),socialRate:Number(a.social_rate??45),netOpening:Number(a.net_opening)||0};
}
function toCloudTransaction(t,userId){return {id:t.id,user_id:userId,account_id:t.accountId,transaction_date:t.date,label:t.label,amount:Number(t.amount),is_paid:t.isPaid===true,sort_order:Number.isFinite(Number(t.sortOrder))?Number(t.sortOrder):null,source:t.recurringTemplateId?'recurring':'manual',recurring_template_id:t.recurringTemplateId||null,generated_month:t.recurringKey?t.date.slice(0,7):null,recurring_key:t.recurringKey||null,created_at:new Date(Number(t.createdAt)||Date.now()).toISOString(),updated_at:new Date().toISOString()};}
function fromCloudTransaction(t){return {id:t.id,accountId:t.account_id,date:t.transaction_date,amount:Number(t.amount),label:t.label,isPaid:t.is_paid===true,sortOrder:Number.isFinite(Number(t.sort_order))&&t.sort_order!==null?Number(t.sort_order):undefined,createdAt:Date.parse(t.created_at)||Date.now(),recurringKey:t.recurring_key||undefined,recurringTemplateId:t.recurring_template_id||undefined};}
function toCloudTemplate(t,userId){return {id:t.id,user_id:userId,account_id:t.accountId,day_of_month:Number(t.day)||1,frequency:t.frequency,months:t.months||[],start_month:t.startMonth||null,end_month:t.endMonth||null,once_date:t.date||null,label:t.label,amount:t.amount===''||t.amount===undefined?null:t.amount,enabled:t.enabled!==false};}
function fromCloudTemplate(t){return {id:t.id,accountId:t.account_id,day:Number(t.day_of_month)||1,frequency:t.frequency,months:t.months||[],startMonth:t.start_month||undefined,endMonth:t.end_month||undefined,date:t.once_date||undefined,label:t.label,amount:t.amount===null?null:Number(t.amount),enabled:t.enabled};}
function toCloudCryptoHolding(h,userId){return {id:h.id,user_id:userId,symbol:h.symbol,name:h.name||h.symbol,coingecko_id:h.coingeckoId,status:'Détenu',invested:Number(h.invested)||0,quantity:Number(h.quantity)||0,sort_order:Number(h.sortOrder)||0,updated_at:new Date().toISOString()};}
function fromCloudCryptoHolding(h){
  return {id:h.id,symbol:h.symbol,name:h.name||h.symbol,coingeckoId:h.coingecko_id,invested:Number(h.invested)||0,quantity:Number(h.quantity)||0,sortOrder:Number(h.sort_order)||0};
}
function isMissingCryptoTable(error){
  const code=error?.code||'',message=error?.message||'';
  return code==='42P01'||code==='PGRST205'||/crypto_holdings/i.test(message)&&/does not exist|could not find|schema cache/i.test(message);
}
function normalizeLombardCredit(credit){
  if(!credit)return null;
  const rawRate=credit.rate;
  const rate=rawRate===''||rawRate===null||rawRate===undefined?null:Number(rawRate);
  return {
    label:(String(credit.label||'Crédit lombard').trim()||'Crédit lombard').slice(0,120),
    amount:Math.max(0,Number(credit.amount)||0),
    rate:Number.isFinite(rate)?Math.min(100,Math.max(0,rate)):null,
    notes:String(credit.notes||'').trim().slice(0,500)
  };
}
async function saveLombardCreditToAuth(credit){
  if(!cloud.user)throw new Error('Connectez-vous pour enregistrer le crédit lombard.');
  const normalized=normalizeLombardCredit(credit);
  const {data,error}=await cloudClient().auth.updateUser({data:{lombardCredit:normalized}});
  if(error)throw error;
  if(data?.user){
    cloud.user=data.user;
    if(cloud.session)cloud.session.user=data.user;
  }
  return normalized;
}
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
    const cryptoHoldings=(state.cryptoHoldings||[]).map(h=>toCloudCryptoHolding(h,uid));
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
    for(const id of [...cloud.pendingAccountDeletes]){
      const {error}=await client.from('accounts').delete().eq('id',id).eq('user_id',uid);
      if(error)throw error;
      cloud.pendingAccountDeletes.delete(id);
    }
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
    if(cryptoTableReady!==false){
      const cryptoResult=await client.from('crypto_holdings').select('*');
      if(cryptoResult.error){
        if(isMissingCryptoTable(cryptoResult.error))cryptoTableReady=false;
        else throw cryptoResult.error;
      }else{
        cryptoTableReady=true;
        const remoteCrypto=new Map((cryptoResult.data||[]).map(row=>[row.id,row]));
        const changedCrypto=cryptoHoldings.filter(row=>!remoteCrypto.has(row.id)||!sameCloudValues(row,remoteCrypto.get(row.id),['symbol','name','coingecko_id','status','invested','quantity','sort_order']));
        if(changedCrypto.length){const {error}=await client.from('crypto_holdings').upsert(changedCrypto,{onConflict:'user_id,id'});if(error)throw error;}
        for(const id of [...cloud.pendingCryptoDeletes]){
          const {error}=await client.from('crypto_holdings').delete().eq('id',id).eq('user_id',uid);
          if(error)throw error;
          cloud.pendingCryptoDeletes.delete(id);
        }
      }
    }
    if(cloud.accountTypesDirty||cloud.accountPledgesDirty){
      const overrides=accountTypeOverrides();
      const pledges=accountPledgeOverrides();
      const snapshot=JSON.stringify({overrides,pledges});
      await saveAccountMetadataToAuth(overrides,pledges);
      if(JSON.stringify({overrides:accountTypeOverrides(),pledges:accountPledgeOverrides()})===snapshot){
        cloud.accountTypesDirty=false;
        cloud.accountPledgesDirty=false;
      }
    }
    if(cloud.stockHoldingsDirty){
      const payload=normalizeStockHoldings(state.stockHoldings);
      const snapshot=JSON.stringify(payload);
      await saveStockHoldingsToAuth(payload);
      if(JSON.stringify(normalizeStockHoldings(state.stockHoldings))===snapshot)cloud.stockHoldingsDirty=false;
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
    const [ar,tr,rr]=await Promise.all([
      client.from('accounts').select('*'),
      client.from('transactions').select('*').order('transaction_date',{ascending:true}),
      client.from('recurring_templates').select('*')
    ]);
    for(const result of [ar,tr,rr])if(result.error)throw result.error;
    if(!cloud.user||cloud.user.id!==user.id)return;

    // La table crypto peut ne pas encore exister : ne pas bloquer le reste de l'application.
    const cryptoResult=await client.from('crypto_holdings').select('*');
    let remoteCrypto=[];
    if(cryptoResult.error){
      if(!isMissingCryptoTable(cryptoResult.error))throw cryptoResult.error;
      cryptoTableReady=false;
    }else{
      cryptoTableReady=true;
      remoteCrypto=(cryptoResult.data||[]).map(fromCloudCryptoHolding);
    }
    let cryptoHoldings=[];
    if(cryptoTableReady&&remoteCrypto.length)cryptoHoldings=remoteCrypto;

    // Le crédit lombard, les sous-types de comptes, le nantissement et les
    // positions actions sont stockés dans les métadonnées privées du compte Auth.
    const remoteLombard=normalizeLombardCredit(user.user_metadata?.lombardCredit);
    const remoteAccountTypes=normalizeAccountTypes(user.user_metadata?.accountTypes);
    const remoteAccountPledges=normalizeAccountPledges(user.user_metadata?.accountPledges);
    const remoteStockHoldings=normalizeStockHoldings(user.user_metadata?.stockHoldings);

    // L'ancien cache local n'est consulté qu'après authentification, pour permettre une migration volontaire.
    let legacy=null;
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
      if(saved&&Array.isArray(saved.accounts)&&Array.isArray(saved.transactions))legacy=loadState();
    }catch(error){console.warn('Anciennes données locales illisibles',error);}
    const remoteAccounts=(ar.data||[]).map(account=>fromCloudAccount(account,remoteAccountTypes));
    const remoteTransactions=(tr.data||[]).map(fromCloudTransaction);
    const remoteTemplates=(rr.data||[]).map(fromCloudTemplate);
    const existingAccountIds=new Set(remoteAccounts.map(account=>account.id));
    const loadedStockHoldings=remoteStockHoldings.filter(holding=>existingAccountIds.has(holding.accountId));
    const loadedAccountPledges=Object.fromEntries(Object.entries(remoteAccountPledges).filter(([id])=>existingAccountIds.has(id)));
    const remoteHasData=remoteAccounts.length+remoteTransactions.length+remoteTemplates.length+(remoteLombard?1:0)+loadedStockHoldings.length+Object.keys(loadedAccountPledges).length>0;
    const hasLegacy=!!legacy&&(legacy.accounts.length+legacy.transactions.length+(legacy.recurringTemplates||[]).length>0);

    let importLocal=false;
    if(!remoteHasData){
      importLocal=hasLegacy&&window.confirm('Votre espace en ligne est vide.\n\nImporter les anciennes données présentes dans ce navigateur dans CE compte utilisateur ?\n\nAcceptez uniquement si ces données vous appartiennent. Si ce navigateur a servi à une autre personne, choisissez Annuler.');
      const importedAccounts=legacy?(legacy.accounts||[]).map(account=>({...account,accountType:remoteAccountTypes[account.id]||account.accountType||account.kind})):[];
      state=importLocal?{...legacy,accounts:importedAccounts,cryptoHoldings,stockHoldings:loadedStockHoldings,accountPledges:loadedAccountPledges,lombardCredit:remoteLombard}:{accounts:DEFAULT_ACCOUNTS.map(a=>({...a})),transactions:[],recurringTemplates:[],cryptoHoldings,stockHoldings:[],accountPledges:{},lombardCredit:remoteLombard};
    }else{
      // Le compte Supabase connecté est la source de vérité : aucune fusion avec le cache local.
      state={accounts:remoteAccounts,transactions:remoteTransactions,recurringTemplates:remoteTemplates,cryptoHoldings,stockHoldings:loadedStockHoldings,accountPledges:loadedAccountPledges,lombardCredit:remoteLombard};
    }

    cloud.accountTypesDirty=importLocal&&state.accounts.some(account=>isAccountSubtype(account.accountType)&&account.accountType!==account.kind);
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
      const accounts=saved.accounts.map(a=>{const merged={...a,...(DEFAULT_ACCOUNTS.find(d=>d.id===a.id)||{}),...a};if(merged.id==='cic-montevrayn'&&merged.name==='CIC Montévrayn')merged.name='CIC Montévrain';merged.bank=bankKeyForAccount(merged);return merged;});
      const recurringTemplates=Array.isArray(saved.recurringTemplates)?saved.recurringTemplates.map(t=>({...t})):[];
      DEFAULT_ACCOUNTS.forEach(d=>{if(!accounts.some(a=>a.id===d.id))accounts.push({...d});});
      return {accounts,transactions:saved.transactions,recurringTemplates,stockHoldings:normalizeStockHoldings(saved.stockHoldings||[]),accountPledges:normalizeAccountPledges(saved.accountPledges||{}),lombardCredit:saved.lombardCredit||null};
    }
  }catch(e){console.warn('Données locales illisibles',e);}
  return {accounts:DEFAULT_ACCOUNTS.map(a=>({...a})),transactions:[],recurringTemplates:[],cryptoHoldings:[],stockHoldings:[],accountPledges:{},lombardCredit:null};
}

function accountById(id){return state.accounts.find(a=>a.id===id);}
function accountShort(name){
  const words=String(name||'').trim().split(/\s+/).filter(Boolean);
  if(words.length>1)return words.slice(0,3).map(w=>w[0]).join('').toUpperCase().slice(0,3);
  return String(name||'').trim().slice(0,2).toUpperCase();
}
function accountPledgeFor(id){return state.accountPledges?.[id]||null;}
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
function transactionOrder(a,b){const ao=Number.isFinite(Number(a.sortOrder))&&a.sortOrder!==null?Number(a.sortOrder):null,bo=Number.isFinite(Number(b.sortOrder))&&b.sortOrder!==null?Number(b.sortOrder):null;if(ao!==null&&bo!==null&&ao!==bo)return ao-bo;if(ao!==null&&bo===null)return -1;if(ao===null&&bo!==null)return 1;return b.date.localeCompare(a.date)||b.createdAt-a.createdAt;}
function accountTransactions(accountId){return state.transactions.filter(t=>t.accountId===accountId).sort(transactionOrder);}
function normalizeTransactionOrder(){for(const account of state.accounts){const rows=state.transactions.filter(t=>t.accountId===account.id).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);rows.forEach((t,index)=>{if(!Number.isFinite(Number(t.sortOrder))||t.sortOrder===null)t.sortOrder=index+1;});}}
function moveTransaction(id,direction){const current=state.transactions.find(t=>t.id===id);if(!current)return;const rows=accountTransactions(current.accountId);const index=rows.findIndex(t=>t.id===id),other=rows[index+direction];if(!other)return;prepareUndo();const currentOrder=Number(current.sortOrder),otherOrder=Number(other.sortOrder);current.sortOrder=otherOrder;other.sortOrder=currentOrder;renderAll();showToast('Ordre des opérations mis à jour.',true);}
function balanceAt(accountId,untilDate=null){
  const a=accountById(accountId);if(!a)return 0;
  return Number(a.opening||0)+accountTransactions(accountId).filter(t=>!untilDate||t.date<=untilDate).reduce((sum,t)=>sum+Number(t.amount),0);
}
function lombardAmount(){return Math.max(0,Number(state.lombardCredit?.amount)||0);}
function totalAccountsBalance(){return state.accounts.reduce((sum,a)=>sum+balanceAt(a.id),0);}
function stockValueForAccount(accountId){return (state.stockHoldings||[]).filter(h=>h.accountId===accountId).reduce((sum,h)=>{if(isManualValueHolding(h))return sum+Number(h.invested||0);const details=stockPriceDetails(h);return sum+(details.price!==null?Number(h.quantity||0)*details.price:Number(h.invested||0));},0);}
function totalStockValue(){return state.accounts.reduce((sum,a)=>sum+stockValueForAccount(a.id),0);}
function totalCryptoValue(){return (state.cryptoHoldings||[]).reduce((sum,h)=>{const price=cryptoPrice(h);return sum+(price!==null?Number(h.quantity||0)*price:Number(h.invested||0));},0);}
function accountOverviewBalance(accountId){return balanceAt(accountId)+stockValueForAccount(accountId);}
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
function tiimeNetBalanceAt(account,untilDate=today()){
  return Number(account.netOpening||0)+accountTransactions(account.id).filter(t=>t.date<=untilDate).reduce((sum,t)=>sum+tiimeCalc(account,Number(t.amount)).net,0);
}
function effectiveAccountType(account){
  const type=account?.accountType||account?.kind||'bank';
  return isAccountType(type)?type:'bank';
}
function kindLabel(a){
  const type=effectiveAccountType(a);
  return type==='pro'?'Professionnel':type==='pea'?'PEA':type==='av'?'Assurance vie':type==='cto'?'CTO':type==='savings'?'Épargne':'Compte courant';
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function accountMarkup(a,compact=false){
  const balance=accountOverviewBalance(a.id);
  const pledged=!!accountPledgeFor(a.id);
  if(compact)return '<div class="account-row'+(pledged?' is-pledged':'')+'" data-account-open="'+a.id+'">'+bankLogo(a)+'<div class="account-info"><strong>'+escapeHtml(a.name)+'</strong><small>'+kindLabel(a)+pledgeBadgeMarkup(a.id)+'</small></div><div class="account-balance">'+euro(balance)+'<small>'+state.transactions.filter(t=>t.accountId===a.id).length+' opération(s)</small></div></div>';
  const extra=a.id==='tiime'&&a.kind==='pro'?'<div class="account-card-label">Net estimé après provisions : <strong>'+euro(tiimeNetBalance(a))+'</strong></div>':'<div class="account-card-label">'+state.transactions.filter(t=>t.accountId===a.id).length+' opération(s) enregistrée(s)</div>';
  return '<article class="account-card'+(pledged?' is-pledged':'')+'" data-account-open="'+a.id+'"><div class="account-card-top">'+bankLogo(a)+'<div class="account-info"><strong>'+escapeHtml(a.name)+'</strong><small>'+kindLabel(a)+pledgeBadgeMarkup(a.id)+'</small></div><button class="edit-account" data-edit-account="'+a.id+'" aria-label="Configurer '+escapeHtml(a.name)+'" title="Configurer le compte">···</button></div><div class="account-card-balance">'+euro(balance)+'</div>'+extra+pledgeNoteMarkup(a.id)+'<div class="account-card-foot"><span>Solde actuel</span><button data-account-transactions="'+a.id+'">Historique →</button></div></article>';
}
function renderDashboard(){
  const total=totalAccountsBalance()+totalStockValue()+totalCryptoValue();
  const lombard=lombardAmount();
  const net=total-lombard;
  const bank=state.accounts.filter(a=>effectiveAccountType(a)!=='pro').reduce((sum,a)=>sum+accountOverviewBalance(a.id),0);
  const pro=state.accounts.filter(a=>effectiveAccountType(a)==='pro').reduce((sum,a)=>sum+accountOverviewBalance(a.id),0);
  $('net-balance').textContent=euro(net);
  $('total-balance').textContent=euro(total);
  $('crypto-balance').textContent=euro(totalCryptoValue());
  $('lombard-balance').textContent=euro(lombard);
  $('bank-balance').textContent=euro(bank);
  $('pro-balance').textContent=euro(pro);
  $('net-balance').classList.toggle('negative',net<0);
  $('net-detail').textContent=lombard>0?euro(total)+' − '+euro(lombard):'Aucune dette lombard enregistrée';
  $('lombard-label').textContent=state.lombardCredit?.label||'Aucun crédit enregistré';
  $('lombard-manage').textContent=state.lombardCredit?'Gérer':'Ajouter';
  $('accounts-count-pill').textContent=state.accounts.length+' compte'+(state.accounts.length>1?'s':'')+(pledgedAccountCount()?' · '+pledgedAccountCount()+' nanti'+(pledgedAccountCount()>1?'s':''):'');
  $('dashboard-accounts').innerHTML=state.accounts.map(a=>accountMarkup(a,true)).join('');
  const recent=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt).slice(0,6);
  $('recent-transactions').innerHTML=recent.length?recent.map(t=>{const a=accountById(t.accountId)||{name:'Compte supprimé'};return '<div class="recent-row"><span class="movement-icon '+(t.amount>=0?'income':'expense')+'">'+(t.amount>=0?'↙':'↗')+'</span><div class="movement-main"><strong>'+escapeHtml(t.label)+'</strong><small>'+escapeHtml(a.name)+' · '+dateFormat(t.date)+'</small></div><span class="movement-amount '+(t.amount>=0?'positive':'negative')+'">'+(t.amount>0?'+':'')+euro(t.amount)+'</span></div>';}).join(''):'<div class="empty-state">Aucune opération pour le moment.<br>Ajoutez une opération pour commencer.</div>';
  $('account-count').textContent=state.accounts.length;
}
function renderAccounts(){
  const query=$('account-search').value.trim().toLocaleLowerCase('fr'),kind=$('account-kind-filter')?.value||'all',sort=$('account-sort')?.value||'name-asc';
  const accounts=state.accounts.filter(a=>(a.name+' '+a.short+' '+bankByKey(bankKeyForAccount(a)).name+' '+kindLabel(a)).toLocaleLowerCase('fr').includes(query)&&(kind==='all'||effectiveAccountType(a)===kind));
  accounts.sort((a,b)=>{if(sort==='name-desc')return b.name.localeCompare(a.name,'fr');if(sort==='balance-desc')return accountOverviewBalance(b.id)-accountOverviewBalance(a.id);if(sort==='balance-asc')return accountOverviewBalance(a.id)-accountOverviewBalance(b.id);if(sort==='kind')return kindLabel(a).localeCompare(kindLabel(b),'fr')||a.name.localeCompare(b.name,'fr');return a.name.localeCompare(b.name,'fr');});
  $('all-accounts').innerHTML=accounts.length?accounts.map(a=>accountMarkup(a)).join(''):'<div class="empty-state">Aucun compte ne correspond aux filtres.</div>';
  const pledgedVisible=accounts.filter(a=>accountPledgeFor(a.id)).length;
  $('accounts-total-label').textContent=accounts.length+' / '+state.accounts.length+' comptes'+(pledgedVisible?' · '+pledgedVisible+' nanti'+(pledgedVisible>1?'s':''):'');
}
function isOperationalAccount(account){return !['av','pea','cto'].includes(effectiveAccountType(account));}
function fillAccountSelects(){
  const operationalAccounts=state.accounts.filter(isOperationalAccount);
  const opts=operationalAccounts.map(a=>'<option value="'+a.id+'">'+escapeHtml(a.name)+'</option>').join('');
  const allOpts=state.accounts.map(a=>'<option value="'+a.id+'">'+escapeHtml(a.name)+'</option>').join('');
  $('transaction-account').innerHTML=opts;
  const current=$('transaction-account-filter').value;
  $('transaction-account-filter').innerHTML=opts;
  $('transaction-account-filter').value=operationalAccounts.some(a=>a.id===current)?current:(operationalAccounts[0]?.id||'');
  for(const id of ['history-account-filter','recurring-account-filter']){
    const filter=$(id); if(!filter) continue;
    const selected=filter.value;
    filter.innerHTML='<option value="all">Tous les comptes</option>'+opts;
    filter.value=selected==='all'||operationalAccounts.some(a=>a.id===selected)?selected:'all';
  }
  const stockFilter=$('stocks-account-filter');
  if(stockFilter){
    const selected=stockFilter.value;
    const investmentOpts=state.accounts.filter(isInvestmentAccount).map(a=>'<option value="'+a.id+'">'+escapeHtml(a.name)+'</option>').join('');
    stockFilter.innerHTML='<option value="all">Tous les comptes d’investissement</option>'+investmentOpts;
    stockFilter.value=selected==='all'||state.accounts.some(a=>isInvestmentAccount(a)&&a.id===selected)?selected:'all';
  }
}
function renderTransactions(){
  const accountFilter=$('transaction-account-filter').value,typeFilter=$('transaction-type-filter').value,query=$('transaction-search').value.trim().toLocaleLowerCase('fr'),sort=$('transaction-sort')?.value||'date-asc';
  const account=accountById(accountFilter);
  const tiimeView=account?.id==='tiime'&&account?.kind==='pro';
  const asOf=today();
  const currentBalance=balanceAt(accountFilter,asOf);
  const list=[...state.transactions].filter(t=>{const ac=accountById(t.accountId);return t.accountId===accountFilter&&(typeFilter==='all'||(typeFilter==='income'?t.amount>=0:t.amount<0))&&((t.label+' '+(ac?.name||'')).toLocaleLowerCase('fr').includes(query));});
  list.sort((a,b)=>{if(sort==='date-asc')return a.date.localeCompare(b.date)||a.createdAt-b.createdAt;if(sort==='date-desc')return b.date.localeCompare(a.date)||b.createdAt-a.createdAt;if(sort==='label')return a.label.localeCompare(b.label,'fr');if(sort==='amount-asc')return Number(a.amount)-Number(b.amount);if(sort==='amount-desc')return Number(b.amount)-Number(a.amount);if(sort==='pointed')return Number(b.isPaid===true)-Number(a.isPaid===true)||transactionOrder(a,b);return transactionOrder(a,b);});
  $('transaction-head').innerHTML='<tr><th>ORDRE</th><th>POINTÉE</th><th>DATE</th><th>OPÉRATION</th><th>COMPTE</th><th>MONTANT</th><th>SOLDE À DATE</th>'+(tiimeView?'<th>MONTANT APRÈS PROVISIONS</th><th>SOLDE NET ESTIMÉ</th>':'')+'<th>ACTIONS</th></tr>';
  const balanceRow=account?'<tr class="transaction-current-balance"><td colspan="5"><strong>Solde à date</strong><span class="balance-date">Au '+dateFormat(asOf)+'</span></td><td class="table-amount">—</td><td class="table-balance"><strong>'+euro(currentBalance)+'</strong></td>'+(tiimeView?'<td>—</td><td class="table-balance"><strong>'+euro(tiimeNetBalanceAt(account,asOf))+'</strong></td>':'')+'<td>—</td></tr>':'';
  $('transaction-rows').innerHTML=balanceRow+(list.length?list.map(t=>{
    const a=accountById(t.accountId)||{name:'Compte supprimé',short:'?',kind:'bank'};
    const balance=balanceAfterTransaction(t);
    const calc=tiimeCalc(a,Number(t.amount));
    const net=tiimeNetBalance(a);
    const accountRows=accountTransactions(t.accountId);const accountPosition=accountRows.findIndex(item=>item.id===t.id);return '<tr class="'+(t.isPaid?'transaction-paid':'')+'"><td class="order-actions"><button type="button" data-move-transaction="'+t.id+'" data-direction="-1" '+(accountPosition<=0?'disabled':'')+' aria-label="Monter cette opération" title="Monter">↑</button><button type="button" data-move-transaction="'+t.id+'" data-direction="1" '+(accountPosition===accountRows.length-1?'disabled':'')+' aria-label="Descendre cette opération" title="Descendre">↓</button></td><td><label class="paid-check"><input type="checkbox" data-toggle-paid="'+t.id+'" '+(t.isPaid?'checked':'')+' aria-label="Marquer '+escapeHtml(t.label)+' comme débitée ou pointée"><span>'+(t.isPaid?'Pointée':'À pointer')+'</span></label></td><td>'+dateFormat(t.date)+'</td><td class="transaction-label">'+escapeHtml(t.label)+'</td><td><div class="table-account">'+bankLogo(a)+'<span>'+escapeHtml(a.name)+'</span></div></td><td class="table-amount '+(t.amount>=0?'positive':'negative')+'">'+(t.amount>0?'+':'')+euro(t.amount)+'</td><td class="table-balance">'+euro(balance)+'</td>'+(tiimeView?'<td>'+euro(calc.net)+'</td><td class="table-balance">'+euro(net)+'</td>':'')+'<td><div class="row-actions"><button data-edit-transaction="'+t.id+'">Modifier</button><button data-delete-transaction="'+t.id+'">Supprimer</button></div></td></tr>';
  }).join(''):'<tr><td colspan="'+(tiimeView?10:8)+'"><div class="empty-state">Aucune opération trouvée. Ajoutez une opération pour la voir ici.</div></td></tr>');
  $('transaction-footer').textContent=list.length+' opération(s) affichée(s) · Le solde à date exclut les opérations datées après aujourd’hui.';
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

function cryptoPrice(holding){
  const value=Number(cryptoPrices.values[holding.coingeckoId]);
  return Number.isFinite(value)&&value>0?value:null;
}
function cryptoImage(holding){
  const value=cryptoPrices.images?.[holding.coingeckoId];
  return typeof value==='string'?value:'';
}
function cryptoLogoMarkup(image,symbol,extraClass=''){
  const initials=String(symbol||'?').slice(0,3).toUpperCase();
  return '<span class="crypto-logo'+(extraClass?' '+extraClass:'')+'" aria-hidden="true"><span>'+escapeHtml(initials)+'</span>'+(image?'<img src="'+escapeHtml(image)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">':'')+'</span>';
}
function euroPrecise(value){
  const number=Number(value)||0;
  return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:Math.abs(number)>0&&Math.abs(number)<1?6:2}).format(number);
}
function numberFr(value,maximumFractionDigits=8){
  return new Intl.NumberFormat('fr-FR',{maximumFractionDigits}).format(Number(value)||0);
}
function formatSignedPercent(value){
  const number=Number(value)||0;
  return (number>0?'+':'')+new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(number)+' %';
}
function cryptoTimeLabel(timestamp){
  return new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(timestamp));
}
function hydrateCryptoPrices(){
  try{
    const saved=JSON.parse(localStorage.getItem(CRYPTO_PRICE_CACHE_KEY));
    if(saved&&saved.values&&typeof saved.values==='object'){
      cryptoPrices.values=saved.values;
      cryptoPrices.images=saved.images&&typeof saved.images==='object'?saved.images:{};
      cryptoPrices.updatedAt=Number(saved.updatedAt)||0;
    }
  }catch(error){console.warn('Cache des prix crypto illisible',error);}
}
async function loadCryptoPrices(){
  const ids=[...new Set((state.cryptoHoldings||[]).map(h=>h.coingeckoId).filter(Boolean))];
  if(!ids.length){renderCrypto();return;}
  if(cryptoPrices.loading)return;
  cryptoPrices.loading=true;
  cryptoPrices.error='';
  renderCrypto();
  try{
    const response=await fetch(CRYPTO_MARKET_ENDPOINT+'?vs_currency=eur&ids='+encodeURIComponent(ids.join(','))+'&sparkline=false&per_page=250',{headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(response.status===429?'limite de requêtes atteinte, réessayez dans une minute':'réponse HTTP '+response.status);
    const data=await response.json();
    const values={},images={};
    for(const coin of Array.isArray(data)?data:[]){
      const id=coin?.id;
      if(!id)continue;
      const price=Number(coin.current_price);
      if(Number.isFinite(price)&&price>0)values[id]=price;
      if(typeof coin.image==='string'&&coin.image)images[id]=coin.image;
    }
    if(!Object.keys(values).length)throw new Error('aucun prix reçu de CoinGecko');
    cryptoPrices.values={...cryptoPrices.values,...values};
    cryptoPrices.images={...cryptoPrices.images,...images};
    cryptoPrices.updatedAt=Date.now();
    try{localStorage.setItem(CRYPTO_PRICE_CACHE_KEY,JSON.stringify({values:cryptoPrices.values,images:cryptoPrices.images,updatedAt:cryptoPrices.updatedAt}));}catch(error){}
  }catch(error){
    console.error('Crypto price fetch failed',error);
    cryptoPrices.error=error.message||'prix indisponible';
  }finally{
    cryptoPrices.loading=false;
    renderCrypto();
    renderDashboard();
  }
}
function renderCrypto(){
  if(!$('crypto-rows'))return;
  const allHoldings=[...(state.cryptoHoldings||[])];
  const query=$('crypto-search')?.value.trim().toLocaleLowerCase('fr')||'';
  const performanceFilter=$('crypto-performance-filter')?.value||'all';
  const sort=$('crypto-sort')?.value||'manual';
  const metrics=new Map(allHoldings.map(h=>{
    const price=cryptoPrice(h);
    const invested=Number(h.invested)||0;
    const quantity=Number(h.quantity)||0;
    const value=price===null?null:quantity*price;
    const gain=value===null?null:value-invested;
    const performance=gain===null||invested<=0?null:gain/invested*100;
    return [h.id,{price,invested,quantity,value,gain,performance}];
  }));
  const symbolOf=holding=>String(holding.symbol||'');
  let holdings=allHoldings.filter(h=>{
    const m=metrics.get(h.id);
    const searchable=(symbolOf(h)+' '+String(h.name||'')).toLocaleLowerCase('fr');
    if(!searchable.includes(query))return false;
    if(performanceFilter==='gain')return m.gain!==null&&m.gain>0;
    if(performanceFilter==='loss')return m.gain!==null&&m.gain<0;
    return true;
  });
  const compareDesc=(a,b,key)=>{
    const av=a[key],bv=b[key];
    if(av===null&&bv===null)return 0;
    if(av===null)return 1;
    if(bv===null)return -1;
    return bv-av;
  };
  holdings.sort((a,b)=>{
    const ma=metrics.get(a.id),mb=metrics.get(b.id);
    const bySymbol=symbolOf(a).localeCompare(symbolOf(b),'fr');
    if(sort==='name')return String(a.name||a.symbol||'').localeCompare(String(b.name||b.symbol||''),'fr')||bySymbol;
    if(sort==='invested-desc')return mb.invested-ma.invested||bySymbol;
    if(sort==='quantity-desc')return mb.quantity-ma.quantity||bySymbol;
    if(sort==='value-desc')return compareDesc(ma,mb,'value')||bySymbol;
    if(sort==='gain-desc')return compareDesc(ma,mb,'gain')||bySymbol;
    if(sort==='performance-desc')return compareDesc(ma,mb,'performance')||bySymbol;
    return (Number(a.sortOrder)||0)-(Number(b.sortOrder)||0)||bySymbol;
  });
  const priced=holdings.filter(h=>metrics.get(h.id).value!==null&&!isManualValueHolding(h));const investedAll=holdings.reduce((sum,h)=>sum+metrics.get(h.id).invested,0);const investedPriced=priced.reduce((sum,h)=>sum+metrics.get(h.id).invested,0);const currentValue=holdings.reduce((sum,h)=>sum+(metrics.get(h.id).value??0),0);const gain=priced.reduce((sum,h)=>sum+(metrics.get(h.id).gain??0),0);
  const performance=investedPriced>0?gain/investedPriced*100:0;

  $('crypto-invested').textContent=euro(investedAll);
  $('crypto-value').textContent=euro(currentValue);
  const gainElement=$('crypto-gain');
  gainElement.textContent=(gain>0?'+':'')+euro(gain);
  gainElement.classList.toggle('positive',gain>0);
  gainElement.classList.toggle('negative',gain<0);
  const performanceElement=$('crypto-performance');
  performanceElement.textContent=investedPriced>0?formatSignedPercent(performance):'—';
  performanceElement.classList.toggle('positive',performance>0);
  performanceElement.classList.toggle('negative',performance<0);

  const priceStatus=$('crypto-price-status');
  if(priceStatus){
    if(cryptoPrices.loading){priceStatus.textContent='Actualisation des prix…';priceStatus.classList.remove('is-error');}
    else if(cryptoPrices.error){priceStatus.textContent='Prix indisponible : '+cryptoPrices.error;priceStatus.classList.add('is-error');}
    else if(cryptoPrices.updatedAt){priceStatus.textContent='Prix actualisés à '+cryptoTimeLabel(cryptoPrices.updatedAt)+' · source CoinGecko';priceStatus.classList.remove('is-error');}
    else{priceStatus.textContent='Prix pas encore chargés.';priceStatus.classList.remove('is-error');}
  }
  const migration=$('crypto-migration');
  if(migration)migration.hidden=cryptoTableReady!==false;

  const filtered=query!==''||performanceFilter!=='all';
  $('crypto-rows').innerHTML=holdings.length?holdings.map(h=>{
    const m=metrics.get(h.id);
    return '<tr><td><div class="crypto-coin">'+cryptoLogoMarkup(cryptoImage(h),h.symbol)+'<div class="crypto-coin-text"><strong>'+escapeHtml(h.symbol)+'</strong><small>'+escapeHtml(h.name||h.symbol)+'</small></div></div></td><td class="table-amount">'+euro(m.invested)+'</td><td class="crypto-quantity">'+numberFr(m.quantity)+'</td><td class="crypto-price">'+(m.price===null?'—':euroPrecise(m.price))+'</td><td class="table-balance">'+(m.value===null?'—':euro(m.value))+'</td><td class="table-amount '+(m.gain===null?'':m.gain>0?'positive':m.gain<0?'negative':'')+'">'+(m.gain===null?'—':(m.gain>0?'+':'')+euro(m.gain))+'</td><td class="crypto-performance '+(m.performance===null?'':m.performance>0?'positive':m.performance<0?'negative':'')+'">'+(m.performance===null?'—':formatSignedPercent(m.performance))+'</td><td><div class="row-actions"><button type="button" data-edit-crypto="'+escapeHtml(h.id)+'">Modifier</button><button type="button" data-delete-crypto="'+escapeHtml(h.id)+'">Supprimer</button></div></td></tr>';
  }).join(''):'<tr><td colspan="8"><div class="empty-state">'+(filtered?'Aucune position ne correspond aux filtres.':'Aucune position crypto. Cliquez sur « Ajouter une position » pour commencer.')+'</div></td></tr>';

  const missing=holdings.filter(h=>metrics.get(h.id).price===null).length;
  let footer=holdings.length+' position(s) affichée(s)'+(filtered?' sur '+allHoldings.length:'')+' · prix convertis en euros via CoinGecko';
  if(filtered)footer+=' · totaux calculés sur les positions affichées';
  if(cryptoPrices.updatedAt)footer+=' · dernière actualisation à '+cryptoTimeLabel(cryptoPrices.updatedAt);
  if(missing)footer+=' · '+missing+' position(s) sans prix : les totaux ne les incluent pas.';
  $('crypto-footer').textContent=footer;
}
function cryptoCoinLabel(coin){
  return (coin.name||coin.symbol||'')+' ('+String(coin.symbol||'').toUpperCase()+')';
}
function closeCryptoCoinResults(){
  clearTimeout(cryptoSearch.timer);
  if(cryptoSearch.controller){cryptoSearch.controller.abort();cryptoSearch.controller=null;}
  const container=$('crypto-coin-results');
  if(container){container.hidden=true;container.innerHTML='';}
  const input=$('crypto-coin-search');
  if(input)input.setAttribute('aria-expanded','false');
}
function setCryptoCoin(coin){
  const symbol=String(coin.symbol||'').toUpperCase();
  const name=coin.name||symbol;
  const image=coin.large||coin.thumb||coin.image||cryptoPrices.images?.[coin.id]||'';
  if(coin.id&&image)cryptoPrices.images[coin.id]=image;
  $('crypto-edit-coingecko').value=coin.id;
  $('crypto-edit-symbol').value=symbol;
  $('crypto-edit-name').value=name;
  const label=cryptoCoinLabel({name,symbol});
  $('crypto-coin-search').value=label;
  closeCryptoCoinResults();
  const selected=$('crypto-coin-selected');
  selected.innerHTML=cryptoLogoMarkup(image,symbol,'is-small')+'<span>Sélection : '+escapeHtml(label)+'</span>';
  selected.classList.add('is-selected');
}
function clearCryptoCoin(clearSearch=false){
  $('crypto-edit-coingecko').value='';
  $('crypto-edit-symbol').value='';
  $('crypto-edit-name').value='';
  if(clearSearch)$('crypto-coin-search').value='';
  const selected=$('crypto-coin-selected');
  selected.textContent='Aucune crypto sélectionnée.';
  selected.classList.remove('is-selected');
}
async function searchCryptoCoins(query){
  if(cryptoSearch.controller)cryptoSearch.controller.abort();
  const controller=new AbortController();
  cryptoSearch.controller=controller;
  const container=$('crypto-coin-results');
  cryptoSearch.results=[];
  container.hidden=false;
  container.innerHTML='<div class="crypto-coin-message">Recherche…</div>';
  $('crypto-coin-search').setAttribute('aria-expanded','true');
  try{
    const response=await fetch(CRYPTO_SEARCH_ENDPOINT+'?query='+encodeURIComponent(query),{signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(response.status===429?'limite de requêtes atteinte, réessayez dans une minute':'réponse HTTP '+response.status);
    const data=await response.json();
    const coins=(data.coins||[]).slice(0,10);
    cryptoSearch.results=coins;
    if(!coins.length){container.innerHTML='<div class="crypto-coin-message">Aucune crypto trouvée.</div>';return;}
    container.innerHTML=coins.map((coin,index)=>'<button type="button" class="crypto-coin-option" role="option" data-crypto-coin-index="'+index+'">'+cryptoLogoMarkup(coin.large||coin.thumb||'',coin.symbol,'is-small')+'<span class="crypto-coin-symbol">'+escapeHtml(String(coin.symbol||'').toUpperCase())+'</span><span class="crypto-coin-name">'+escapeHtml(coin.name||'')+'</span>'+(coin.market_cap_rank?'<span class="crypto-coin-rank">#'+Number(coin.market_cap_rank)+'</span>':'')+'</button>').join('');
  }catch(error){
    if(error.name==='AbortError')return;
    console.error('Crypto search failed',error);
    container.hidden=false;
    container.innerHTML='<div class="crypto-coin-message">Recherche indisponible : '+escapeHtml(error.message||'réessayez.')+'</div>';
  }
}
function openCryptoEditor(id=null){
  const holding=id?(state.cryptoHoldings||[]).find(h=>h.id===id):null;
  if(id&&!holding)return;
  $('crypto-form').reset();
  closeCryptoCoinResults();
  $('crypto-edit-id').value=holding?.id||'';
  if(holding)setCryptoCoin({id:holding.coingeckoId,name:holding.name,symbol:holding.symbol});
  else clearCryptoCoin(true);
  $('crypto-edit-invested').value=holding?Number(holding.invested||0):'';
  $('crypto-edit-quantity').value=holding?String(holding.quantity??''):'';
  $('crypto-modal-title').textContent=holding?'Modifier la position':'Ajouter une position';
  $('crypto-dialog').showModal();
}
function deleteCryptoHolding(id){
  const holding=(state.cryptoHoldings||[]).find(h=>h.id===id);
  if(!holding)return;
  if(!window.confirm('Supprimer la position « '+holding.symbol+' » ? Les totaux seront recalculés.'))return;
  if(cloud.user)cloud.pendingCryptoDeletes.add(holding.id);
  state.cryptoHoldings=state.cryptoHoldings.filter(h=>h.id!==id);
  renderAll();
  showToast('Position supprimée.');
}

/* --- Positions actions et ETF --- */
function stockMarketInfo(priceId){
  const raw=String(priceId||'').trim().toUpperCase();
  const prefix=raw.includes('-')?raw.split('-')[0]:'US';
  return STOCK_MARKETS[prefix]||{label:prefix==='US'?'États-Unis':prefix,currency:'USD'};
}
function stockSymbolFromId(priceId){
  const raw=String(priceId||'').trim();
  const parts=raw.split('-');
  return (parts.length>1?parts.slice(1).join('-'):raw).toUpperCase().replace(/[^A-Z0-9.]/g,'').slice(0,24);
}
function stockResultSymbol(result){
  const raw=String(result?.s||'').trim();
  if(raw.includes('/'))return raw.split('/').pop().toUpperCase().replace(/[^A-Z0-9.]/g,'').slice(0,24);
  const symbol=raw.toUpperCase().replace(/[^A-Z0-9.]/g,'').slice(0,24);
  return symbol||stockSymbolFromId(result?.id||'');
}
function nativeMoney(value,currency){
  const code=String(currency||'EUR').toUpperCase();
  if(code==='GBX')return nativeMoney(Number(value)/100,'GBP');
  try{return new Intl.NumberFormat('fr-FR',{style:'currency',currency:code,maximumFractionDigits:2}).format(Number(value)||0);}
  catch(error){return numberFr(value,4)+' '+code;}
}
function stockLogoMarkup(symbol,extraClass=''){
  const raw=String(symbol||'?').replace(/[^A-Z0-9.]/gi,'').toUpperCase()||'?';
  const label=raw.slice(0,1);
  const palette=[['#eef2ff','#4e63cf'],['#eaf8f1','#1b8963'],['#fff3e7','#ac7128'],['#f4efff','#7053c2'],['#eef8fb','#2c7f9d']];
  let hash=0;for(const char of label)hash=(hash*31+char.charCodeAt(0))%palette.length;
  const colors=palette[hash];
  return '<span class="stock-logo'+(extraClass?' '+extraClass:'')+'" style="background:'+colors[0]+';color:'+colors[1]+'" aria-hidden="true"><span>'+escapeHtml(label)+'</span></span>';
}
function stockAccountOptionLabel(account){return account.name+' · '+kindLabel(account);}
function defaultStockAccountId(){const eligible=state.accounts.filter(isInvestmentAccount);const filtered=$('stocks-account-filter')?.value;if(filtered&&filtered!=='all'&&eligible.some(a=>a.id===filtered))return filtered;return (eligible.find(a=>bankKeyForAccount(a)==='interactive-brokers'&&effectiveAccountType(a)==='cto')||eligible[0])?.id||'';}
function fillStockAccountSelect(){
  const select=$('stock-edit-account');
  if(!select)return;
  const selected=select.value;
  select.replaceChildren();
  state.accounts.filter(isInvestmentAccount).forEach(account=>select.add(new Option(stockAccountOptionLabel(account),account.id)));
  if(selected&&state.accounts.some(a=>isInvestmentAccount(a)&&a.id===selected))select.value=selected;
  else select.value=defaultStockAccountId();
}
function fillStockCurrencyOptions(selected='EUR'){
  const select=$('stock-edit-currency');
  if(!select)return;
  const currency=normalizeStockCurrency(selected);
  select.innerHTML=STOCK_CURRENCIES.map(code=>'<option value="'+code+'">'+escapeHtml(STOCK_CURRENCY_LABELS[code]||code)+'</option>').join('');
  if(!STOCK_CURRENCIES.includes(currency))select.add(new Option(currency,currency));
  select.value=currency;
}
function hydrateStockPrices(){
  try{
    const savedPrices=JSON.parse(localStorage.getItem(STOCK_PRICE_CACHE_KEY));
    if(savedPrices&&savedPrices.values&&typeof savedPrices.values==='object'){
      const values={};
      for(const [id,value] of Object.entries(savedPrices.values)){
        const price=Number(value);
        if(id&&Number.isFinite(price)&&price>0)values[id]=price;
      }
      stockPrices.values=values;
      stockPrices.updatedAt=Number(savedPrices.updatedAt)||0;
    }
  }catch(error){console.warn('Cache des cours actions illisible',error);}
  try{
    const savedFx=JSON.parse(localStorage.getItem(STOCK_FX_CACHE_KEY));
    if(savedFx&&savedFx.rates&&typeof savedFx.rates==='object'){
      const rates={EUR:1};
      for(const [code,value] of Object.entries(savedFx.rates)){
        const rate=Number(value);
        if(STOCK_CURRENCIES.includes(code)&&Number.isFinite(rate)&&rate>0)rates[code]=rate;
      }
      stockFx.rates=rates;
      stockFx.updatedAt=Number(savedFx.updatedAt)||0;
    }
  }catch(error){console.warn('Cache des taux de change illisible',error);}
}
function stockNativePrice(holding){
  const value=Number(stockPrices.values[holding.priceId]);
  return Number.isFinite(value)&&value>0?value:null;
}
function stockFxRate(currency){
  const code=normalizeStockCurrency(currency);
  if(code==='EUR')return 1;
  if(code==='GBX'){
    const directRate=Number(stockFx.rates.GBX);
    if(Number.isFinite(directRate)&&directRate>0)return directRate;
    const gbpRate=stockFxRate('GBP');
    return gbpRate===null?null:gbpRate/100;
  }
  const rate=Number(stockFx.rates[code]);
  return Number.isFinite(rate)&&rate>0?rate:null;
}
function stockPriceDetails(holding){
  const nativePrice=stockNativePrice(holding);
  const rate=stockFxRate(holding.currency);
  return {nativePrice,rate,price:nativePrice===null||rate===null?null:nativePrice*rate};
}
async function stockFunction(action,payload={}){
  if(!cloud.client)throw new Error('connexion cloud requise pour les données boursières');
  const {data,error}=await cloud.client.functions.invoke(STOCK_FUNCTION_NAME,{body:{action,...payload}});
  if(error){
    let message=error.message||'service boursier indisponible';
    try{
      if(error.context&&typeof error.context.json==='function'){
        const body=await error.context.json();
        if(body?.error)message=body.error;
      }
    }catch(parseError){}
    if(error instanceof TypeError||/failed to fetch|networkerror|load failed/i.test(message))message='réseau indisponible';
    throw new Error(message);
  }
  if(data?.error)throw new Error(data.error);
  return data;
}
async function fetchStockNativePrice(priceId){
  const data=await stockFunction('price',{id:priceId});
  const price=Number(data?.price);
  if(!Number.isFinite(price)||price<=0)throw new Error('aucun cours reçu');
  return price;
}
async function refreshStockFx(currencies){
  if(!currencies.length){
    stockFx.error='';
    stockFx.loading=false;
    return;
  }
  stockFx.loading=true;
  stockFx.error='';
  try{
    const response=await fetch(STOCK_FX_ENDPOINT,{headers:{Accept:'application/json'},cache:'no-store'});
    if(!response.ok)throw new Error('réponse HTTP '+response.status);
    const data=await response.json();
    if(data?.result!=='success'||!data?.rates)throw new Error('taux de change indisponibles');
    const rates={};
    for(const currency of currencies){
      const apiCode=currency==='GBX'?'GBP':currency;
      const perEuro=Number(data.rates[apiCode]);
      if(Number.isFinite(perEuro)&&perEuro>0)rates[currency]=(1/perEuro)/(currency==='GBX'?100:1);
    }
    if(!Object.keys(rates).length)throw new Error('aucun taux EUR reçu');
    stockFx.rates={...stockFx.rates,...rates};
    stockFx.updatedAt=Date.now();
    try{localStorage.setItem(STOCK_FX_CACHE_KEY,JSON.stringify({rates:stockFx.rates,updatedAt:stockFx.updatedAt}));}catch(error){}
  }catch(error){
    console.error('Stock FX fetch failed',error);
    stockFx.error=error instanceof TypeError?'réseau indisponible':(error.message||'taux de change indisponible');
  }finally{
    stockFx.loading=false;
  }
}
async function loadStockPrices(){
  const ids=[...new Set((state.stockHoldings||[]).filter(h=>!isManualValueHolding(h)).map(h=>h.priceId).filter(Boolean))];
  if(!ids.length){
    stockPrices.error='';
    stockPrices.loading=false;
    renderStocks();
    return;
  }
  if(stockPrices.loading)return;
  stockPrices.loading=true;
  stockPrices.error='';
  renderStocks();
  const currencies=[...new Set((state.stockHoldings||[]).map(h=>normalizeStockCurrency(h.currency)).filter(code=>code!=='EUR'))];
  const fxTask=refreshStockFx(currencies);
  const values={};
  let successCount=0,lastError=null;
  const queue=[...ids];
  const worker=async()=>{
    while(queue.length){
      const priceId=queue.shift();
      try{
        const price=await fetchStockNativePrice(priceId);
        if(Number.isFinite(price)&&price>0){values[priceId]=price;successCount++;}
      }catch(error){lastError=error;console.warn('Cours action indisponible pour '+priceId,error);}
    }
  };
  try{
    await Promise.all([fxTask,...Array.from({length:Math.min(5,queue.length)},()=>worker())]);
    if(successCount){
      stockPrices.values={...stockPrices.values,...values};
      stockPrices.updatedAt=Date.now();
      try{localStorage.setItem(STOCK_PRICE_CACHE_KEY,JSON.stringify({values:stockPrices.values,updatedAt:stockPrices.updatedAt}));}catch(error){}
    }else{
      stockPrices.error=lastError?.message||'aucun cours reçu de StockAnalysis';
    }
  }finally{
    stockPrices.loading=false;
    renderStocks();
    renderDashboard();
    renderAccounts();
  }
}
function renderStocks(){
  if(!$('stocks-rows'))return;
  const allHoldings=[...(state.stockHoldings||[])];
  const query=$('stocks-search')?.value.trim().toLocaleLowerCase('fr')||'';
  const accountFilter=$('stocks-account-filter')?.value||'all';
  const performanceFilter=$('stocks-performance-filter')?.value||'all';
  const sort=$('stocks-sort')?.value||'manual';
  const metrics=new Map(allHoldings.map(h=>{
    const details=stockPriceDetails(h);
    const invested=Number(h.invested)||0;
    const quantity=Number(h.quantity)||0;
    const manual=isManualValueHolding(h);const value=manual?invested:(details.price===null?null:quantity*details.price);const gain=value===null||manual?null:value-invested;
    const performance=gain===null||invested<=0?null:gain/invested*100;
    return [h.id,{...details,invested,quantity,value,gain,performance}];
  }));
  const symbolOf=holding=>String(holding.symbol||'');
  let holdings=allHoldings.filter(h=>{const account=accountById(h.accountId);if(!isInvestmentAccount(account))return false;const m=metrics.get(h.id);
    const searchable=(symbolOf(h)+' '+String(h.name||'')+' '+String(h.market||'')+' '+String(account?.name||'')).toLocaleLowerCase('fr');
    if(!searchable.includes(query))return false;
    if(accountFilter!=='all'&&h.accountId!==accountFilter)return false;
    if(performanceFilter==='gain')return m.gain!==null&&m.gain>0;
    if(performanceFilter==='loss')return m.gain!==null&&m.gain<0;
    return true;
  });
  const compareDesc=(a,b,key)=>{
    const av=a[key],bv=b[key];
    if(av===null&&bv===null)return 0;
    if(av===null)return 1;
    if(bv===null)return -1;
    return bv-av;
  };
  holdings.sort((a,b)=>{
    const ma=metrics.get(a.id),mb=metrics.get(b.id);
    const bySymbol=symbolOf(a).localeCompare(symbolOf(b),'fr');
    if(sort==='name')return String(a.name||a.symbol||'').localeCompare(String(b.name||b.symbol||''),'fr')||bySymbol;
    if(sort==='account')return (accountById(a.accountId)?.name||'').localeCompare(accountById(b.accountId)?.name||'','fr')||bySymbol;
    if(sort==='invested-desc')return mb.invested-ma.invested||bySymbol;
    if(sort==='quantity-desc')return mb.quantity-ma.quantity||bySymbol;
    if(sort==='value-desc')return compareDesc(ma,mb,'value')||bySymbol;
    if(sort==='gain-desc')return compareDesc(ma,mb,'gain')||bySymbol;
    if(sort==='performance-desc')return compareDesc(ma,mb,'performance')||bySymbol;
    return (Number(a.sortOrder)||0)-(Number(b.sortOrder)||0)||bySymbol;
  });
  const priced=holdings.filter(h=>metrics.get(h.id).value!==null);
  const investedAll=holdings.reduce((sum,h)=>sum+metrics.get(h.id).invested,0);
  const investedPriced=priced.reduce((sum,h)=>sum+metrics.get(h.id).invested,0);
  const currentValue=priced.reduce((sum,h)=>sum+metrics.get(h.id).value,0);
  const gain=currentValue-investedPriced;
  const performance=investedPriced>0?gain/investedPriced*100:0;

  $('stocks-invested').textContent=euro(investedAll);
  $('stocks-value').textContent=euro(currentValue);
  const gainElement=$('stocks-gain');
  gainElement.textContent=(gain>0?'+':'')+euro(gain);
  gainElement.classList.toggle('positive',gain>0);
  gainElement.classList.toggle('negative',gain<0);
  const performanceElement=$('stocks-performance');
  performanceElement.textContent=investedPriced>0?formatSignedPercent(performance):'—';
  performanceElement.classList.toggle('positive',performance>0);
  performanceElement.classList.toggle('negative',performance<0);

  const priceStatus=$('stocks-price-status');
  if(priceStatus){
    if(!allHoldings.length){priceStatus.textContent='Aucune position actions ou ETF à valoriser.';priceStatus.classList.remove('is-error');}
    else if(stockPrices.loading){priceStatus.textContent='Actualisation des cours…';priceStatus.classList.remove('is-error');}
    else if(stockPrices.error){priceStatus.textContent='Cours indisponibles : '+stockPrices.error;priceStatus.classList.add('is-error');}
    else if(stockFx.error){priceStatus.textContent='Taux de change indisponible : '+stockFx.error;priceStatus.classList.add('is-error');}
    else if(stockPrices.updatedAt){
      const fxLabel=currenciesNeedFx(holdings)?' · conversion ExchangeRate-API':'';
      priceStatus.textContent='Cours actualisés à '+cryptoTimeLabel(stockPrices.updatedAt)+' · source StockAnalysis'+fxLabel;
      priceStatus.classList.remove('is-error');
    }
    else{priceStatus.textContent='Cours pas encore chargés.';priceStatus.classList.remove('is-error');}
  }

  const filtered=query!==''||accountFilter!=='all'||performanceFilter!=='all';
  $('stocks-rows').innerHTML=holdings.length?holdings.map(h=>{
    const m=metrics.get(h.id);
    const account=accountById(h.accountId)||{id:'',name:'Compte supprimé',kind:'bank'};
    const market=String(h.market||stockMarketInfo(h.priceId).label);
    const nativeLabel=m.nativePrice!==null&&normalizeStockCurrency(h.currency)!=='EUR'?'<small>'+escapeHtml(nativeMoney(m.nativePrice,h.currency))+'</small>':'';
    const manual=isManualValueHolding(h);
    return '<tr><td><div class="stock-title">'+stockLogoMarkup(h.symbol)+'<div class="stock-title-text"><strong>'+escapeHtml(h.symbol)+'</strong><small>'+escapeHtml(h.name||h.symbol)+'</small><span class="stock-meta"><span class="stock-meta-text">'+escapeHtml(account.name)+' · '+escapeHtml(market)+'</span>'+pledgeBadgeMarkup(account.id)+'</span></div></div></td><td class="table-amount">'+euro(m.invested)+'</td><td class="stock-quantity">'+(manual?'—':numberFr(m.quantity))+'</td><td class="stock-price">'+(manual?'—':m.price===null?'—':euroPrecise(m.price))+nativeLabel+'</td><td class="table-balance">'+(m.value===null?'—':euro(m.value))+'</td><td class="table-amount '+(m.gain===null?'':m.gain>0?'positive':m.gain<0?'negative':'')+'">'+(m.gain===null?'—':(m.gain>0?'+':'')+euro(m.gain))+'</td><td class="stock-performance '+(m.performance===null?'':m.performance>0?'positive':m.performance<0?'negative':'')+'">'+(m.performance===null?'—':formatSignedPercent(m.performance))+'</td><td><div class="row-actions"><button type="button" data-edit-stock="'+escapeHtml(h.id)+'">Modifier</button><button type="button" data-delete-stock="'+escapeHtml(h.id)+'">Supprimer</button></div></td></tr>';
  }).join(''):'<tr><td colspan="8"><div class="empty-state">'+(filtered?'Aucune position ne correspond aux filtres.':'Aucune position actions ou ETF. Cliquez sur « Ajouter une action » pour commencer.')+'</div></td></tr>';

  const missing=holdings.filter(h=>metrics.get(h.id).price===null).length;
  let footer=holdings.length+' position(s) affichée(s)'+(filtered?' sur '+allHoldings.length:'')+' · cours StockAnalysis.com'+(currenciesNeedFx(holdings)?' · conversion en euros via ExchangeRate-API':'');
  if(filtered)footer+=' · totaux calculés sur les positions affichées';
  if(stockPrices.updatedAt)footer+=' · dernière actualisation à '+cryptoTimeLabel(stockPrices.updatedAt);
  if(missing)footer+=' · '+missing+' position(s) sans cours : la valeur actuelle de ces lignes est exclue des totaux Actions ; la vue d’ensemble utilise le montant investi comme estimation.';
  $('stocks-footer').textContent=footer;
}
function currenciesNeedFx(holdings){return holdings.some(h=>normalizeStockCurrency(h.currency)!=='EUR');}
function closeStockResults(){
  clearTimeout(stockSearch.timer);
  stockSearch.seq++;
  stockSearch.results=[];
  const container=$('stock-search-results');
  if(container){container.hidden=true;container.innerHTML='';}
  const input=$('stock-search');
  if(input)input.setAttribute('aria-expanded','false');
}
function setStockSelection(data){
  const priceId=String(data.priceId||data.id||'').trim();
  const isin=String(data.isin||'').trim().toUpperCase();
  if(!priceId)return;
  const info=stockMarketInfo(priceId);
  const symbol=String(data.symbol||stockSymbolFromId(priceId)).toUpperCase();
  const name=String(data.name||symbol).trim()||symbol;
  const market=String(data.market||info.label).trim()||info.label;
  const currency=normalizeStockCurrency(data.currency||info.currency);
  $('stock-edit-priceid').value=priceId;
  $('stock-edit-isin').value=isin;
  $('stock-edit-symbol').value=symbol;
  $('stock-edit-name').value=name;
  $('stock-edit-market').value=market;
  fillStockCurrencyOptions(currency);
  $('stock-search').value=symbol+' — '+name;
  closeStockResults();
  const selected=$('stock-selected');
  selected.innerHTML=stockLogoMarkup(symbol,'is-small')+'<span>Sélection : '+escapeHtml(symbol+' — '+name)+' · '+escapeHtml(market)+' · '+escapeHtml(currency)+'</span>';
  selected.classList.add('is-selected');
  updateStockValueOnlyFields();
}
function updateStockValueOnlyFields(){const manual=isManualValueHolding({isin:$('stock-edit-isin')?.value,priceId:$('stock-edit-priceid')?.value});const input=$('stock-edit-quantity');const label=input?.closest('label');if(label)label.hidden=manual;if(input){input.required=!manual;input.disabled=manual;input.value=manual?'1':input.value;}const priceFields=$('stock-edit-currency')?.closest('.form-row');if(priceFields)priceFields.hidden=manual;const amountLabel=$('stock-invested-label');if(amountLabel)amountLabel.textContent=manual?'Montant détenu (€)':'Investi (€)';const help=$('stock-value-help');if(help)help.textContent=manual?'Support d’assurance vie à valorisation manuelle : indiquez le montant actuellement détenu. Aucune quantité ni cours de marché n’est nécessaire.':'La valeur actuelle est calculée en euros à partir du dernier cours disponible et du taux de change de référence. Les cours peuvent être différés.';}
function clearStockSelection(clearSearch=false){
  $('stock-edit-priceid').value='';
  $('stock-edit-isin').value='';
  $('stock-edit-symbol').value='';
  $('stock-edit-name').value='';
  $('stock-edit-market').value='';
  fillStockCurrencyOptions('EUR');
  if(clearSearch)$('stock-search').value='';
  const selected=$('stock-selected');
  selected.textContent='Aucune action sélectionnée.';
  selected.classList.remove('is-selected');updateStockValueOnlyFields();
}
async function searchStocks(query){
  const seq=++stockSearch.seq;
  const container=$('stock-search-results');
  stockSearch.results=[];
  container.hidden=false;
  container.innerHTML='<div class="stock-message">Recherche…</div>';
  $('stock-search').setAttribute('aria-expanded','true');
  try{
    const localResults=stockCatalogResults(query);
    const data=localResults.length?{data:localResults}:await stockFunction('search',{query});
    if(seq!==stockSearch.seq)return;
    const seen=new Set(),results=[];
    for(const item of Array.isArray(data?.data)?data.data:[]){
      const id=String(item?.priceId||item?.id||'').trim();
      if(!id||seen.has(id)||!item?.n)continue;
      seen.add(id);
      results.push({...item,id,priceId:id});
      if(results.length>=10)break;
    }
    stockSearch.results=results;
    if(!results.length){container.innerHTML='<div class="stock-message">Aucune action trouvée.</div>';return;}
    container.innerHTML=results.map((item,index)=>{
      const symbol=stockResultSymbol(item);
      const info=item.market?{label:item.market,currency:item.currency||'EUR'}:stockMarketInfo(item.priceId||item.id);
      const type=item.st==='e'?'ETF':'Action';
      return '<button type="button" class="stock-option" role="option" data-stock-result-index="'+index+'">'+stockLogoMarkup(symbol,'is-small')+'<span class="stock-option-symbol">'+escapeHtml(symbol)+'</span><span class="stock-option-name">'+escapeHtml(item.n||'')+'</span><span class="stock-option-market">'+escapeHtml(info.label+' · '+info.currency+' · '+type)+'</span></button>';
    }).join('');
  }catch(error){
    if(seq!==stockSearch.seq)return;
    console.error('Stock search failed',error);
    container.hidden=false;
    const message=error instanceof TypeError?'réseau indisponible, réessayez.':(error.message||'réessayez.');
    container.innerHTML='<div class="stock-message">Recherche indisponible : '+escapeHtml(message)+'</div>';
  }
}
function openStockEditor(id=null){
  const holding=id?(state.stockHoldings||[]).find(h=>h.id===id):null;
  if(id&&!holding)return;
  $('stock-form').reset();
  closeStockResults();
  fillStockAccountSelect();
  fillStockCurrencyOptions('EUR');
  $('stock-edit-id').value=holding?.id||'';
  if(holding){
    setStockSelection(holding);
    $('stock-edit-account').value=holding.accountId;
    $('stock-edit-invested').value=Number(holding.invested||0);
    $('stock-edit-quantity').value=String(holding.quantity??'');
  }else{
    clearStockSelection(true);
    $('stock-edit-account').value=defaultStockAccountId();
  }
  $('stock-modal-title').textContent=holding?'Modifier la position':'Ajouter une action';updateStockValueOnlyFields();$('stock-dialog').showModal();
}
function deleteStockHolding(id){
  const holding=(state.stockHoldings||[]).find(h=>h.id===id);
  if(!holding)return;
  if(!window.confirm('Supprimer la position « '+holding.symbol+' » ? Les totaux seront recalculés.'))return;
  prepareUndo();
  cloud.stockHoldingsDirty=true;
  state.stockHoldings=state.stockHoldings.filter(h=>h.id!==id);
  renderAll();
  showToast('Position actions supprimée.',true);
}
function renderAll(){fillAccountSelects();renderDashboard();renderAccounts();renderTransactions();renderRecurring();renderMonthlyHistory();renderCrypto();renderStocks();saveState();}
function showToast(message,withUndo=false){const el=$('toast');if(!el)return;el.replaceChildren(document.createTextNode(message));if(withUndo&&undoPoint){const button=document.createElement('button');button.type='button';button.className='toast-undo';button.textContent='Annuler';button.setAttribute('aria-label','Annuler la dernière action');button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();try{undoLastAction();}catch(error){console.error('Undo failed',error);showToast('Impossible d’annuler cette action : '+(error.message||'erreur inconnue.'));}},{once:true});el.append(document.createTextNode(' '),button);}el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.classList.remove('show');if(withUndo)undoPoint=null;},10000);}
function navigate(view){
  document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id===view+'-view'));
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
  $('breadcrumb-current').textContent=({dashboard:"Vue d'ensemble",accounts:'Mes comptes',transactions:'Opérations',history:'Historique mensuel',crypto:'Crypto',stocks:'Actions',recurring:'Récurrences'})[view]||view;
  if(view==='recurring')renderRecurring();
  if(view==='accounts')renderAccounts();if(view==='transactions')renderTransactions();if(view==='history')renderMonthlyHistory();
  if(view==='crypto'){renderCrypto();if(Date.now()-cryptoPrices.updatedAt>CRYPTO_REFRESH_MS)loadCryptoPrices();}
  if(view==='stocks'){renderStocks();if(Date.now()-stockPrices.updatedAt>STOCK_REFRESH_MS)loadStockPrices();}
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
function fillBankOptions(selected='other'){
  const select=$('edit-account-bank');
  if(!select)return;
  select.innerHTML=BANK_CATALOG.map(bank=>'<option value="'+bank.id+'">'+escapeHtml(bank.name)+'</option>').join('');
  select.value=isBankKey(selected)?selected:'other';
}
function updateAccountBankPreview(){
  const name=$('edit-account-name').value.trim()||'Compte';
  const bank=$('edit-account-bank').value||'other';
  $('account-bank-preview').innerHTML=bankLogo({name,bank});
}
function updateAccountPledgeFields(){
  const pledged=$('edit-account-pledged')?.checked===true;
  const note=$('edit-account-pledge-note');
  if(note)note.disabled=!pledged;
  $('account-pledge-note-field')?.classList.toggle('is-disabled',!pledged);
}
function openAccountEditor(id=null){
  const a=id?accountById(id):null;
  if(id&&!a)return;
  $('account-form').reset();
  $('edit-account-id').value=a?.id||'';
  $('account-modal-eyebrow').textContent=a?'PARAMÈTRES DU COMPTE':'NOUVEAU COMPTE';
  $('account-modal-title').textContent=a?'Configurer le compte':'Ajouter un compte';
  $('edit-account-name').value=a?.name||'';
  $('edit-account-kind').value=a?effectiveAccountType(a):'bank';
  fillBankOptions(a?bankKeyForAccount(a):'other');
  $('edit-account-opening').value=a?Number(a.opening||0):0;
  const pledge=a?accountPledgeFor(a.id):null;
  $('edit-account-pledged').checked=!!pledge;
  $('edit-account-pledge-note').value=pledge?.note||'';
  updateAccountPledgeFields();
  $('account-delete').hidden=!a;
  updateAccountBankPreview();
  $('account-dialog').showModal();
}
function deleteAccount(){
  const id=$('edit-account-id').value;
  const account=accountById(id);
  if(!account)return;
  if(state.accounts.length<=1){
    showToast('Ajoutez un autre compte avant de supprimer le dernier.');
    return;
  }
  const linkedTransactions=state.transactions.filter(t=>t.accountId===id);
  const linkedTemplates=(state.recurringTemplates||[]).filter(t=>t.accountId===id);
  const linkedStocks=(state.stockHoldings||[]).filter(t=>t.accountId===id);
  const linked=[];
  if(linkedTransactions.length)linked.push(linkedTransactions.length+' opération'+(linkedTransactions.length>1?'s':''));
  if(linkedTemplates.length)linked.push(linkedTemplates.length+' récurrence'+(linkedTemplates.length>1?'s':''));
  if(linkedStocks.length)linked.push(linkedStocks.length+' position'+(linkedStocks.length>1?'s':'')+' d’actions');
  let message='Supprimer le compte « '+account.name+' » ?';
  if(linked.length){
    const total=linkedTransactions.length+linkedTemplates.length+linkedStocks.length;
    message+='\n\n'+linked.join(', ')+' '+(total>1?'liées':'liée')+' à ce compte '+(total>1?'seront aussi supprimées':'sera aussi supprimée')+'.';
  }
  if(accountPledgeFor(id))message+='\n\nLe nantissement enregistré sur ce compte sera aussi supprimé.';
  message+='\n\nCette action est définitive.';
  if(!window.confirm(message))return;
  if(cloud.user)cloud.pendingAccountDeletes.add(id);
  for(const transaction of linkedTransactions)cloud.pendingDeletes.delete(transaction.id);
  for(const template of linkedTemplates)cloud.pendingTemplateDeletes.delete(template.id);
  state.accounts=state.accounts.filter(a=>a.id!==id);
  state.transactions=state.transactions.filter(t=>t.accountId!==id);
  state.recurringTemplates=(state.recurringTemplates||[]).filter(t=>t.accountId!==id);
  state.stockHoldings=(state.stockHoldings||[]).filter(t=>t.accountId!==id);
  if(state.accountPledges?.[id]){const next={...state.accountPledges};delete next[id];state.accountPledges=next;}
  cloud.accountTypesDirty=true;
  cloud.accountPledgesDirty=true;
  cloud.stockHoldingsDirty=true;
  undoPoint=null;
  if($('account-dialog').open)$('account-dialog').close();
  renderAll();
  showToast('Compte supprimé.');
}
function openLombardEditor(){
  const credit=state.lombardCredit;
  $('lombard-form').reset();
  $('lombard-edit-label').value=credit?.label||'Crédit lombard';
  $('lombard-edit-amount').value=credit?Number(credit.amount||0):'';
  $('lombard-edit-rate').value=credit?.rate===null||credit?.rate===undefined?'':credit.rate;
  $('lombard-edit-notes').value=credit?.notes||'';
  $('lombard-delete').hidden=!credit;
  $('lombard-dialog').showModal();
}
async function deleteLombardCredit(){
  if(!state.lombardCredit)return;
  if(!window.confirm('Supprimer le crédit lombard ? Les totaux seront recalculés.'))return;
  const button=$('lombard-delete');
  if(button)button.disabled=true;
  cloudStatus('Suppression du crédit lombard…',true);
  try{
    await saveLombardCreditToAuth(null);
    state.lombardCredit=null;
    if($('lombard-dialog').open)$('lombard-dialog').close();
    renderAll();
    showToast('Crédit lombard supprimé.');
    cloudStatus('Synchronisé en ligne',true);
  }catch(error){
    showToast('Suppression impossible : '+(error.message||'réessayez.'));
    cloudStatus('Erreur de sauvegarde',false);
  }finally{
    if(button)button.disabled=false;
  }
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
  [...state.transactions].sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>{const a=accountById(t.accountId);rows.push([t.date,t.label,a?.name||'',t.amount,balanceAt(t.accountId,t.date),a?.id==='tiime'&&a?.kind==='pro'?tiimeCalc(a,t.amount).net:'',a?.id==='tiime'&&a?.kind==='pro'?tiimeNetBalance(a):'']);});
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
$('accounts-add').addEventListener('click',()=>openAccountEditor());
$('dashboard-account-add').addEventListener('click',()=>openAccountEditor());
$('dashboard-add-account').addEventListener('click',()=>openAccountEditor());
$('lombard-manage').addEventListener('click',openLombardEditor);
$('account-search').addEventListener('input',renderAccounts);
$('account-kind-filter').addEventListener('change',renderAccounts);$('account-sort').addEventListener('change',renderAccounts);
$('transaction-search').addEventListener('input',renderTransactions);$('transaction-account-filter').addEventListener('change',renderTransactions);$('transaction-type-filter').addEventListener('change',renderTransactions);$('transaction-sort').addEventListener('change',renderTransactions);
['recurring-search','recurring-account-filter','recurring-status-filter','recurring-sort'].forEach(id=>$(id).addEventListener(id==='recurring-search'?'input':'change',renderRecurring));
['history-month','history-account-filter','history-type-filter','history-sort'].forEach(id=>$(id).addEventListener('change',renderMonthlyHistory));$('history-search').addEventListener('input',renderMonthlyHistory);
function openCloudDialog(mode='login'){
  const dialog=$('cloud-dialog');
  $('cloud-message').textContent=mode==='signup'?'Renseignez votre e-mail et un mot de passe d’au moins 8 caractères, puis cliquez sur « Créer un compte ».':cloud.user?'Vous êtes connecté à votre espace privé.':'Connectez-vous ou créez votre compte pour activer la synchronisation.';
  $('cloud-logout').hidden=!cloud.user;
  showMcpSettings();
  if(!dialog.open)dialog.showModal();
  setTimeout(()=>$('cloud-email').focus(),0);
}
$('cloud-open').addEventListener('click',()=>openCloudDialog());
$('auth-login').addEventListener('click',()=>openCloudDialog('login'));
$('auth-signup').addEventListener('click',()=>openCloudDialog('signup'));
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
  }catch(error){cloudMessage(frenchAuthError(error));}
});
$('cloud-signup').addEventListener('click',async()=>{
  const email=$('cloud-email').value.trim();
  const password=$('cloud-password').value;
  if(!email){cloudMessage('Renseignez une adresse e-mail.');$('cloud-email').focus();return;}
  if(password.length<8){cloudMessage('Le mot de passe doit contenir au moins 8 caractères.');$('cloud-password').focus();return;}
  const button=$('cloud-signup');
  button.disabled=true;
  cloudMessage('Création du compte…');
  try{
    const redirectUrl=new URL(window.location.href);redirectUrl.hash='';redirectUrl.search='';
    const {data,error}=await cloudClient().auth.signUp({email,password,options:{emailRedirectTo:redirectUrl.toString()}});
    if(error)throw error;
    if(data.session){cloudMessage('Compte créé. Chargement des données…');$('cloud-dialog').close();}
    else cloudMessage('Compte créé. Consultez votre e-mail pour confirmer l’adresse, puis connectez-vous.');
  }catch(error){cloudMessage(frenchAuthError(error));}
  finally{button.disabled=false;}
});
$('cloud-logout').addEventListener('click',async()=>{
  try{const {error}=await cloudClient().auth.signOut();if(error)throw error;localStorage.removeItem(STORAGE_KEY);localStorage.removeItem('gestion-comptes-cloud-migration-backup-v1');if($('cloud-dialog').open)$('cloud-dialog').close();lockApp('Déconnexion effectuée. Reconnectez-vous pour accéder à vos données.');}
  catch(error){cloudMessage(error.message||'Déconnexion impossible.');}
});
$('crypto-add').addEventListener('click',()=>openCryptoEditor());
$('crypto-refresh').addEventListener('click',loadCryptoPrices);
['crypto-performance-filter','crypto-sort'].forEach(id=>$(id).addEventListener('change',renderCrypto));
$('crypto-search').addEventListener('input',renderCrypto);
$('crypto-coin-search').addEventListener('input',event=>{
  const query=event.target.value.trim();
  clearCryptoCoin(false);
  clearTimeout(cryptoSearch.timer);
  if(query.length<2){closeCryptoCoinResults();return;}
  cryptoSearch.timer=setTimeout(()=>searchCryptoCoins(query),350);
});
$('crypto-coin-search').addEventListener('keydown',event=>{
  if(event.key==='Enter'){
    event.preventDefault();
    if(cryptoSearch.results.length)setCryptoCoin(cryptoSearch.results[0]);
  }else if(event.key==='Escape'){
    closeCryptoCoinResults();
  }
});
$('crypto-coin-results').addEventListener('click',event=>{
  const option=event.target.closest('[data-crypto-coin-index]');
  if(!option)return;
  const coin=cryptoSearch.results[Number(option.dataset.cryptoCoinIndex)];
  if(coin)setCryptoCoin(coin);
});
$('crypto-dialog').addEventListener('close',closeCryptoCoinResults);
document.addEventListener('click',event=>{
  if(!event.target.closest('#crypto-coin-search')&&!event.target.closest('#crypto-coin-results'))closeCryptoCoinResults();
});
$('crypto-form').addEventListener('submit',event=>{
  event.preventDefault();
  const id=$('crypto-edit-id').value;
  const existing=id?(state.cryptoHoldings||[]).find(h=>h.id===id):null;
  const symbol=$('crypto-edit-symbol').value.trim().toUpperCase();
  const name=$('crypto-edit-name').value.trim()||symbol;
  const coingeckoId=$('crypto-edit-coingecko').value.trim().toLowerCase();
  const invested=Number($('crypto-edit-invested').value);
  const quantity=Number($('crypto-edit-quantity').value);
  if(!symbol||!coingeckoId){
    showToast('Sélectionnez une crypto dans la liste de recherche.');
    return;
  }
  if(!Number.isFinite(invested)||invested<0||!Number.isFinite(quantity)||quantity<0){
    showToast('Vérifiez le montant investi et la quantité détenue.');
    return;
  }
  const record={...(existing||{}),id:id||crypto.randomUUID(),symbol,name,coingeckoId,invested,quantity,sortOrder:existing?.sortOrder??Math.max(0,...(state.cryptoHoldings||[]).map(h=>Number(h.sortOrder)||0))+1};
  if(existing)state.cryptoHoldings=state.cryptoHoldings.map(h=>h.id===id?record:h);
  else state.cryptoHoldings=[...(state.cryptoHoldings||[]),record];
  $('crypto-dialog').close();
  renderAll();
  showToast(existing?'Position modifiée.':'Position ajoutée.');
  if(coingeckoId&&cryptoPrices.values[coingeckoId]===undefined)loadCryptoPrices();
});
$('stocks-add').addEventListener('click',()=>openStockEditor());
$('stocks-refresh').addEventListener('click',loadStockPrices);
['stocks-account-filter','stocks-performance-filter','stocks-sort'].forEach(id=>$(id).addEventListener('change',renderStocks));
$('stocks-search').addEventListener('input',renderStocks);
$('stock-search').addEventListener('input',event=>{
  const query=event.target.value.trim();
  clearStockSelection(false);
  closeStockResults();
  if(query.length<2)return;
  stockSearch.timer=setTimeout(()=>searchStocks(query),350);
});
$('stock-search').addEventListener('keydown',event=>{
  if(event.key==='Enter'){
    event.preventDefault();
    // Ne pas choisir automatiquement la première place quand plusieurs marchés
    // proposent le même nom : l'utilisateur doit vérifier la devise et la place.
    if(stockSearch.results.length===1){
      const result=stockSearch.results[0];
      const info=stockMarketInfo(result.id);
      setStockSelection({priceId:result.priceId||result.id,isin:result.isin,symbol:stockResultSymbol(result),name:result.n,market:result.market||info.label,currency:result.currency||info.currency});
    }
  }else if(event.key==='Escape'){
    closeStockResults();
  }
});
$('stock-search-results').addEventListener('click',event=>{
  const option=event.target.closest('[data-stock-result-index]');
  if(!option)return;
  const result=stockSearch.results[Number(option.dataset.stockResultIndex)];
  if(!result)return;
  const info=stockMarketInfo(result.id);
  setStockSelection({priceId:result.priceId||result.id,isin:result.isin,symbol:stockResultSymbol(result),name:result.n,market:result.market||info.label,currency:result.currency||info.currency});
});
$('stock-dialog').addEventListener('close',closeStockResults);
document.addEventListener('click',event=>{
  if(!event.target.closest('#stock-search')&&!event.target.closest('#stock-search-results'))closeStockResults();
});
$('stock-form').addEventListener('submit',event=>{
  event.preventDefault();
  const id=$('stock-edit-id').value;
  const existing=id?(state.stockHoldings||[]).find(h=>h.id===id):null;
  const accountId=$('stock-edit-account').value;
  const priceId=$('stock-edit-priceid').value.trim();
  const isin=$('stock-edit-isin').value.trim().toUpperCase();
  const symbol=$('stock-edit-symbol').value.trim().toUpperCase();
  const name=$('stock-edit-name').value.trim()||symbol;
  const market=$('stock-edit-market').value.trim()||stockMarketInfo(priceId).label;
  const currency=normalizeStockCurrency($('stock-edit-currency').value);
  const invested=Number($('stock-edit-invested').value);
  const specialManual=isManualValueHolding({isin,priceId});const quantityText=$('stock-edit-quantity').value.trim();const manualValue=specialManual||quantityText==='';const quantity=manualValue?(specialManual?1:0):Number(quantityText);if(!accountById(accountId)||!isInvestmentAccount(accountById(accountId))){showToast('Choisissez un compte de type PEA, CTO ou assurance vie.');return;}if(!priceId||!symbol){showToast('Sélectionnez l’instrument dans la liste de recherche.');return;}if(!Number.isFinite(invested)||invested<0||(!manualValue&&(!Number.isFinite(quantity)||quantity<0))){showToast('Vérifiez le montant investi et la quantité détenue.');return;}
  if(isin&&!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)){showToast('ISIN invalide : vérifiez les 12 caractères.',false);return;}
   const record={...(existing||{}),id:id||crypto.randomUUID(),accountId,priceId,isin,symbol,name,market,currency,invested,quantity,manualValue,sortOrder:existing?.sortOrder??Math.max(0,...(state.stockHoldings||[]).map(h=>Number(h.sortOrder)||0))+1};
  if(existing)state.stockHoldings=state.stockHoldings.map(h=>h.id===id?record:h);
  else state.stockHoldings=[...(state.stockHoldings||[]),record];
  cloud.stockHoldingsDirty=true;
  $('stock-dialog').close();
  renderAll();
  showToast(existing?'Position actions modifiée.':'Position actions ajoutée.');
  if(!manualValue&&stockPrices.values[priceId]===undefined)loadStockPrices();
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
$('lombard-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const amount=Number($('lombard-edit-amount').value);
  const rateValue=$('lombard-edit-rate').value.trim();
  const rate=rateValue===''?null:Number(rateValue);
  if(!Number.isFinite(amount)||amount<0){showToast('Renseignez une dette lombard valide (zéro ou plus).');return;}
  if(rate!==null&&(!Number.isFinite(rate)||rate<0||rate>100)){showToast('Le taux annuel doit être compris entre 0 et 100 %.');return;}
  const credit={
    label:$('lombard-edit-label').value.trim()||'Crédit lombard',
    amount,
    rate,
    notes:$('lombard-edit-notes').value.trim()
  };
  const submitButton=event.target.querySelector('button[type="submit"]');
  if(submitButton)submitButton.disabled=true;
  cloudStatus('Enregistrement du crédit lombard…',true);
  try{
    const saved=await saveLombardCreditToAuth(credit);
    state.lombardCredit=saved;
    $('lombard-dialog').close();
    renderAll();
    showToast('Crédit lombard enregistré.');
    cloudStatus('Synchronisé en ligne',true);
  }catch(error){
    showToast('Crédit lombard non enregistré : '+(error.message||'réessayez.'));
    cloudStatus('Erreur de sauvegarde',false);
  }finally{
    if(submitButton)submitButton.disabled=false;
  }
});
$('lombard-delete').addEventListener('click',deleteLombardCredit);
$('account-form').addEventListener('submit',event=>{
  event.preventDefault();
  const id=$('edit-account-id').value;
  const existing=id?accountById(id):null;
  const accountId=existing?.id||crypto.randomUUID();
  const name=$('edit-account-name').value.trim();
  const accountType=$('edit-account-kind').value;
  const kind=['pea','av','cto'].includes(accountType)?'savings':accountType;
  const bank=$('edit-account-bank').value;
  const opening=Number($('edit-account-opening').value)||0;
  if(!name){showToast('Renseignez le nom du compte.');return;}
  if(!['bank','savings','pro','pea','av','cto'].includes(accountType)){showToast('Choisissez un type de compte valide.');return;}
  if(!isBankKey(bank)){showToast('Choisissez une banque dans la liste.');return;}
  if(existing){
    prepareUndo();
    existing.name=name;
    existing.short=accountShort(name);
    existing.bank=bank;
    existing.kind=kind;
    existing.accountType=accountType;
    existing.opening=opening;
  }else{
    state.accounts.push({id:accountId,name,short:accountShort(name),bank,kind,accountType,opening,vatRate:20,socialRate:45,netOpening:0});
  }
  const pledged=$('edit-account-pledged').checked;
  const pledgeNote=$('edit-account-pledge-note').value.trim().slice(0,160);
  const pledges={...state.accountPledges};
  if(pledged)pledges[accountId]={note:pledgeNote};
  else delete pledges[accountId];
  state.accountPledges=pledges;
  cloud.accountTypesDirty=true;
  cloud.accountPledgesDirty=true;
  $('account-dialog').close();
  renderAll();
  showToast(existing?'Paramètres du compte enregistrés.':'Compte ajouté.',!!existing);
});
$('account-delete').addEventListener('click',deleteAccount);
$('edit-account-name').addEventListener('input',updateAccountBankPreview);
$('edit-account-bank').addEventListener('change',updateAccountBankPreview);
$('edit-account-pledged').addEventListener('change',updateAccountPledgeFields);
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
  const editCrypto=event.target.closest('[data-edit-crypto]');
  if(editCrypto){openCryptoEditor(editCrypto.dataset.editCrypto);return;}
  const deleteCrypto=event.target.closest('[data-delete-crypto]');
  if(deleteCrypto){deleteCryptoHolding(deleteCrypto.dataset.deleteCrypto);return;}
  const editStock=event.target.closest('[data-edit-stock]');
  if(editStock){openStockEditor(editStock.dataset.editStock);return;}
  const deleteStock=event.target.closest('[data-delete-stock]');
  if(deleteStock){deleteStockHolding(deleteStock.dataset.deleteStock);return;}
  const editAccount=event.target.closest('[data-edit-account]');
  if(editAccount){event.stopPropagation();openAccountEditor(editAccount.dataset.editAccount);return;}
  const history=event.target.closest('[data-account-transactions]');
  if(history){event.stopPropagation();navigate('transactions');$('transaction-account-filter').value=history.dataset.accountTransactions;renderTransactions();return;}
  const account=event.target.closest('[data-account-open]');
  if(account){openAccountEditor(account.dataset.accountOpen);}
});
hydrateCryptoPrices();
hydrateStockPrices();
setInterval(()=>{
  if(!document.hidden&&(state.cryptoHoldings||[]).length)loadCryptoPrices();
},CRYPTO_REFRESH_MS);
setInterval(()=>{
  if(!document.hidden&&(state.stockHoldings||[]).length)loadStockPrices();
},STOCK_REFRESH_MS);
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&(state.cryptoHoldings||[]).length&&Date.now()-cryptoPrices.updatedAt>CRYPTO_REFRESH_MS)loadCryptoPrices();
  if(!document.hidden&&(state.stockHoldings||[]).length&&Date.now()-stockPrices.updatedAt>STOCK_REFRESH_MS)loadStockPrices();
});
initCloud();
