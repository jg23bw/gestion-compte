const STORAGE_KEY = 'gestion-comptes-v1';
const GENERATED_MONTHS_KEY = 'gestion-comptes-generated-months-v1';
const generationInProgress = new Set();
const generatedMonthsRepository = LocalStorageGeneratedMonthsRepository.create(localStorage, GENERATED_MONTHS_KEY);
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
const CRYPTO_FALLBACK_ENDPOINT='https://api.coincap.io/v2/assets';
const CRYPTO_HISTORY_ENDPOINT='https://api.coingecko.com/api/v3/coins/';
const COINCAP_IDS={'bitcoin':'bitcoin','ethereum':'ethereum','tether':'tether','binancecoin':'binance-coin','solana':'solana','ripple':'xrp','usd-coin':'usd-coin','dogecoin':'dogecoin','cardano':'cardano','avalanche-2':'avalanche','chainlink':'chainlink','polkadot':'polkadot','tron':'tron','litecoin':'litecoin','bitcoin-cash':'bitcoin-cash','stellar':'stellar','shiba-inu':'shiba-inu','near':'near-protocol','uniswap':'uniswap','render-token':'render-token','aave':'aave','ondo-finance':'ondo','bittensor':'bittensor','sui':'sui','aptos':'aptos','toncoin':'toncoin','cosmos':'cosmos','hedera-hashgraph':'hedera-hashgraph','internet-computer':'internet-computer','ethereum-classic':'ethereum-classic','monero':'monero','kaspa':'kaspa','pepe':'pepe','arbitrum':'arbitrum','optimism':'optimism','maker':'maker','the-graph':'the-graph'};
const coinCapFallbackProvider = CoinCapFallbackProvider.create({ endpoint: CRYPTO_FALLBACK_ENDPOINT, coinIds: COINCAP_IDS });
const fearGreedProvider = AlternativeMeFearGreedProvider.create({ endpoint: 'https://api.alternative.me/fng/?limit=1&format=json' });
const CRYPTO_SEARCH_ENDPOINT='https://api.coingecko.com/api/v3/search';
const coinGeckoCatalogProvider = CoinGeckoCatalogProvider.create({ searchEndpoint: CRYPTO_SEARCH_ENDPOINT, resultLimit: 10 });
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
const stockHoldingMetadataCommands = StockHoldingMetadataCommands.create({
  rules: StockHoldingRules.create({ currencies: STOCK_CURRENCIES, markets: STOCK_MARKETS, today })
});
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
const today = () => {const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
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
  totalAccountsBalance, totalStockValue, totalCryptoValue, lombardAmount,
  stockHoldings: () => stockHoldingCommands.findAll(), isManualValueHolding,
  manualHoldingValue, stockPriceDetails, accounts: () => state.accounts,
  effectiveAccountType, accountOverviewBalance
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
const themeButton=$('theme-toggle');
function applyTheme(theme){
 document.documentElement.dataset.theme=theme;
 if(themeButton){const dark=theme==='dark';themeButton.textContent=dark?'☀':'☾';themeButton.title=dark?'Passer en mode clair':'Passer en mode sombre';themeButton.setAttribute('aria-label',themeButton.title);}
 try{localStorage.setItem('gestion-comptes-theme',theme);}catch(error){}
}
let initialTheme='light';try{initialTheme=localStorage.getItem('gestion-comptes-theme')||'light';}catch(error){}
applyTheme(initialTheme);
themeButton?.addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
document.querySelectorAll('.nav-item').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.view)));
$('mobile-account-open')?.addEventListener('click',()=>openCloudDialog());

const fireSliderFormats={
 'fire-age':v=>Math.round(v)+' ans','fire-end-age':v=>Math.round(v)+' ans',
 'fire-rent':v=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(v)+' €',
 'fire-passive-income':v=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(v)+' €',
 'fire-pension':v=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(v)+' €',
 'fire-saving':v=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(v)+' €',
 'fire-withdrawal':v=>Number(v).toLocaleString('fr-FR',{maximumFractionDigits:2})+' %',
 'fire-return':v=>Number(v).toLocaleString('fr-FR',{maximumFractionDigits:1})+' %',
 'fire-inflation':v=>Number(v).toLocaleString('fr-FR',{maximumFractionDigits:1})+' %',
 'fire-gain-share':v=>Math.round(v)+' %','fire-custom-tax':v=>Number(v).toLocaleString('fr-FR',{maximumFractionDigits:1})+' %'
};
function updateFireSliderValue(id){
 const input=$(id),output=$(id+'-value');
 if(input&&output&&fireSliderFormats[id])output.textContent=fireSliderFormats[id](input.value);
}
['fire-age','fire-end-age','fire-rent','fire-passive-income','fire-pension','fire-withdrawal','fire-saving','fire-return','fire-inflation','fire-gain-share','fire-custom-tax'].forEach(id=>{
 const input=$(id);if(!input)return;
 updateFireSliderValue(id);
 input.addEventListener('input',()=>{updateFireSliderValue(id);renderWealthViews();});
});
['lombard-btc-price','lombard-fx','lombard-principal','lombard-repaid'].forEach(id=>$(id)?.addEventListener('input',renderWealthViews));
$('fire-tax-regime')?.addEventListener('change',renderWealthViews);

document.querySelectorAll('[data-goto]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.goto)));
$('recurring-add-month').addEventListener('click',()=>generateRecurringForMonth(nextMonthValue()));
$('recurring-add-template').addEventListener('click',()=>openRecurringEditor());
$('recurring-edit-frequency').addEventListener('change',updateRecurringEditorFields);
$('recurring-month').value=nextMonthValue();
$('history-month').value=monthValueNow();
$('recurring-rows').addEventListener('change',event=>{
  const enabled=event.target.closest('[data-recurring-enabled]');
  if(enabled){const t=recurringTemplateCommands.findById(enabled.dataset.recurringEnabled);if(t){prepareUndo();recurringTemplateCommands.update(t.id,{enabled:enabled.checked});saveState();renderRecurring();showToast('Récurrence mise à jour.',true);}return;}
  const amount=event.target.closest('[data-recurring-amount]');
  if(amount){const t=recurringTemplateCommands.findById(amount.dataset.recurringAmount);if(t){const parsed=amount.value.trim()===''?null:parseFrenchNumber(amount.value);if(parsed!==null&&!Number.isFinite(parsed)){showToast('Montant invalide. Utilisez une virgule pour les décimales.',false);amount.value=t.amount??'';return;}prepareUndo();recurringTemplateCommands.update(t.id,{amount:parsed});saveState();renderRecurring();showToast('Montant de la récurrence mis à jour.',true);}return;}
  const day=event.target.closest('[data-recurring-day]');
  if(day){const t=recurringTemplateCommands.findById(day.dataset.recurringDay);if(t){prepareUndo();recurringTemplateCommands.update(t.id,{day:Math.min(31,Math.max(1,Number(day.value)||1))});saveState();renderRecurring();showToast('Jour de la récurrence mis à jour.',true);}return;}
  const label=event.target.closest('[data-recurring-label]');
  if(label){const t=recurringTemplateCommands.findById(label.dataset.recurringLabel);if(t){prepareUndo();recurringTemplateCommands.update(t.id,{label:label.value.trim()||t.label});saveState();renderRecurring();showToast('Libellé de la récurrence mis à jour.',true);}}
});
$('recurring-form').addEventListener('submit',event=>{
  event.preventDefault();
  const id=$('recurring-edit-id').value;
  const existing=id?recurringTemplateCommands.findById(id):null;
  const label=$('recurring-edit-label').value.trim();
  const accountId=$('recurring-edit-account').value;
  const frequency=$('recurring-edit-frequency').value;
  const amountText=$('recurring-edit-amount').value.trim();
  const amount=amountText===''?null:parseFrenchNumber(amountText);
  const day=Math.min(31,Math.max(1,Number($('recurring-edit-day').value)||1));
  const date=dateInputParse($('recurring-edit-once-date').value);
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
  recurringTemplateCommands.save(record);
  $('recurring-dialog').close();renderAll();showToast(existing?'Récurrence modifiée.':'Récurrence ajoutée.',true);
});
['transactions-add'].forEach(id=>$(id).addEventListener('click',()=>openTransaction()));
$('accounts-add').addEventListener('click',()=>openAccountEditor());
$('lombard-manage').addEventListener('click',openLombardEditor);
$('account-search').addEventListener('input',renderAccounts);
$('account-kind-filter').addEventListener('change',renderAccounts);$('account-sort').addEventListener('change',renderAccounts);
$('transaction-search').addEventListener('input',renderTransactions);$('transaction-account-filter').addEventListener('change',renderTransactions);$('transaction-type-filter').addEventListener('change',renderTransactions);$('transaction-sort').addEventListener('change',renderTransactions);$('pro-transaction-search').addEventListener('input',renderTransactions);$('pro-transaction-account-filter').addEventListener('change',renderTransactions);$('pro-transaction-type-filter').addEventListener('change',renderTransactions);$('pro-transaction-sort').addEventListener('change',renderTransactions);$('pro-transactions-add').addEventListener('click',()=>openTransaction($('pro-transaction-account-filter').value||null));
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
    const result=await getAuthenticationService().signIn({email:$('cloud-email').value.trim(),password:$('cloud-password').value});
    if(result.session){cloudMessage('Connexion réussie. Chargement de vos données…');$('cloud-dialog').close();}
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
    const result=await getAuthenticationService().signUp({email,password,emailRedirectTo:redirectUrl.toString()});
    if(error)throw error;
    if(data.session){cloudMessage('Compte créé. Chargement des données…');$('cloud-dialog').close();}
    else cloudMessage('Compte créé. Consultez votre e-mail pour confirmer l’adresse, puis connectez-vous.');
  }catch(error){cloudMessage(frenchAuthError(error));}
  finally{button.disabled=false;}
});
$('cloud-logout-sidebar').addEventListener('click',()=> $('cloud-logout').click());
$('cloud-logout').addEventListener('click',async()=>{
  try{await getAuthenticationService().signOut();localStorage.removeItem(STORAGE_KEY);localStorage.removeItem('gestion-comptes-cloud-migration-backup-v1');if($('cloud-dialog').open)$('cloud-dialog').close();lockApp('Déconnexion effectuée. Reconnectez-vous pour accéder à vos données.');}
  catch(error){cloudMessage(error.message||'Déconnexion impossible.');}
});
$('crypto-add').addEventListener('click',()=>openCryptoEditor());
$('crypto-refresh').addEventListener('click',loadCryptoPrices);
['crypto-sort'].forEach(id=>$(id).addEventListener('change',()=>{try{localStorage.removeItem(MARKET_SORT_KEYS.crypto);}catch(_){}renderCrypto();}));
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
  const marketSortButton=event.target.closest('[data-market-sort]');
  if(marketSortButton){const [kind,column]=marketSortButton.dataset.marketSort.split(':');const previous=marketSortState(kind);const next={column,direction:previous?.column===column&&previous.direction==='desc'?'asc':'desc'};try{localStorage.setItem(MARKET_SORT_KEYS[kind],JSON.stringify(next));}catch(_){}if(kind==='crypto')renderCrypto();else renderStocks();syncMarketSortHeaders(kind);return;}
  for(const kind of ['crypto','stocks']){
    const toggle=event.target.closest('#'+kind+'-columns-toggle');
    if(toggle){
      const panel=$(kind+'-column-settings');
      if(panel){const opening=panel.hidden;panel.hidden=!opening;toggle.setAttribute('aria-expanded',String(opening));if(opening){renderMarketColumnSettings(kind);panel.classList.add('market-column-settings-floating');if(panel.parentElement!==document.body)document.body.appendChild(panel);positionMarketColumnPanel(kind);}}
      return;
    }
    const reset=event.target.closest('[data-market-columns-reset="'+kind+'"]');
    if(reset){try{localStorage.removeItem(MARKET_COLUMN_KEYS[kind]);}catch(_){}renderMarketColumnSettings(kind);if(kind==='crypto')renderCrypto();else renderStocks();return;}
  }
  const columnToggle=event.target.closest('#opportunity-columns-toggle');
  if(columnToggle){const panel=$('opportunity-column-settings');if(panel){panel.hidden=!panel.hidden;columnToggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)renderOpportunityColumnSettings();}return;}
  const resetColumns=event.target.closest('[data-op-columns-reset]');
  if(resetColumns){saveOpportunityColumns(OPPORTUNITY_COLUMN_DEFS.map(c=>c.id));renderOpportunityColumnSettings();renderOpportunityHeatmap(document.querySelector('[data-op-period].is-active')?.dataset.opPeriod||'24h');return;}
  const sortButton=event.target.closest('[data-op-sort]');
  if(sortButton){const col=sortButton.dataset.opSort;let current={column:col,direction:'desc'};try{const old=JSON.parse(localStorage.getItem(OPPORTUNITY_SORT_KEY)||'null');if(old?.column===col)current.direction=old.direction==='desc'?'asc':'desc';}catch(_){}try{localStorage.setItem(OPPORTUNITY_SORT_KEY,JSON.stringify(current));}catch(_){}renderOpportunityHeatmap(document.querySelector('[data-op-period].is-active')?.dataset.opPeriod||'24h');return;}

  if(!event.target.closest('#crypto-coin-search')&&!event.target.closest('#crypto-coin-results'))closeCryptoCoinResults();
});
$('crypto-form').addEventListener('submit',event=>{
  event.preventDefault();
  const id=$('crypto-edit-id').value;
  const existing=id?(state.cryptoHoldings||[]).find(h=>h.id===id):null;
  const symbol=$('crypto-edit-symbol').value.trim().toUpperCase();
  const name=$('crypto-edit-name').value.trim()||symbol;
  const coingeckoId=$('crypto-edit-coingecko').value.trim().toLowerCase();
  const invested=parseFrenchNumber($('crypto-edit-invested').value);
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

$('opportunities-refresh').addEventListener('click',()=>{
  Object.keys(opportunityHistoryAttempts).forEach(key=>delete opportunityHistoryAttempts[key]);
  Object.keys(opportunityHistoryErrors).forEach(key=>delete opportunityHistoryErrors[key]);
  loadCryptoPrices();loadStockPrices();renderOpportunities();
});
$('opportunity-chart-asset').addEventListener('change',()=>{
  const select=$('opportunity-chart-asset');
  // Sélection explicite : on autorise une nouvelle tentative même après un échec récent.
  delete opportunityHistoryAttempts[select.value+'|1y'];
  renderOpportunityChart(select.value,document.querySelector('[data-chart-period].is-active')?.dataset.chartPeriod||'1y');
});
document.querySelectorAll('[data-chart-period]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-chart-period]').forEach(b=>b.classList.toggle('is-active',b===button));renderOpportunityChart($('opportunity-chart-asset').value,button.dataset.chartPeriod);}));
document.querySelectorAll('[data-op-period]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-op-period]').forEach(b=>b.classList.toggle('is-active',b===button));renderOpportunityHeatmap(button.dataset.opPeriod);}));
document.querySelectorAll('[data-op-filter]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-op-filter]').forEach(b=>b.classList.toggle('is-active',b===button));renderOpportunityAssets(button.dataset.opFilter);}));
['stocks-account-filter','stocks-sort'].forEach(id=>$(id).addEventListener('change',()=>{if(id==='stocks-sort'){try{localStorage.removeItem(MARKET_SORT_KEYS.stocks);}catch(_){}}renderStocks();}));
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
  const existing=id?stockHoldingCommands.findAll().find(h=>h.id===id):null;
  const accountId=$('stock-edit-account').value;
  const priceId=$('stock-edit-priceid').value.trim();
  const isin=$('stock-edit-isin').value.trim().toUpperCase();
  const symbol=$('stock-edit-symbol').value.trim().toUpperCase();
  const name=$('stock-edit-name').value.trim()||symbol;
  const market=$('stock-edit-market').value.trim()||stockMarketInfo(priceId).label;
  const currency=normalizeStockCurrency($('stock-edit-currency').value);
  const invested=parseFrenchNumber($('stock-edit-invested').value);
  const specialManual=isManualValueHolding({isin,priceId});const quantityText=$('stock-edit-quantity').value.trim();const manualValue=specialManual||quantityText==='';const quantity=manualValue?(specialManual?1:0):Number(quantityText);if(!accountById(accountId)||!isInvestmentAccount(accountById(accountId))){showToast('Choisissez un compte de type PEA, CTO ou assurance vie.');return;}if(!priceId||!symbol){showToast('Sélectionnez l’instrument dans la liste de recherche.');return;}if(!Number.isFinite(invested)||invested<0||(!manualValue&&(!Number.isFinite(quantity)||quantity<0))){showToast('Vérifiez le montant investi et la quantité détenue.');return;}
  if(isin&&!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)){showToast('ISIN invalide : vérifiez les 12 caractères.',false);return;}
   const record={...(existing||{}),id:id||crypto.randomUUID(),accountId,priceId,isin,symbol,name,market,currency,invested,quantity,manualValue,manualValueDate:manualValue?(existing?.manualValue&&Number(existing.invested)===invested?(existing.manualValueDate||today()):today()):undefined,sortOrder:existing?.sortOrder??Math.max(0,...stockHoldingCommands.findAll().map(h=>Number(h.sortOrder)||0))+1};
  stockHoldingCommands.save(record);
  cloud.stockHoldingsDirty=true;
  $('stock-dialog').close();
  renderAll();
  showToast(existing?'Position actions modifiée.':'Position actions ajoutée.');
  if(!manualValue&&stockPrices.values[priceId]===undefined)loadStockPrices();
});

document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.close).close()));
$('transaction-form').addEventListener('submit',event=>{
  event.preventDefault();
  const id=$('transaction-id').value,accountId=$('transaction-account').value,date=dateInputParse($('transaction-date').value),amount=parseFrenchNumber($('transaction-amount').value),label=$('transaction-label').value.trim();
  if(!date||!label||!Number.isFinite(amount)){showToast('Vérifiez les informations saisies.');return;}
  const previous=id?transactionCommands.findById(id):null;
  // Capture l'état avant toute création ou modification pour rendre « Annuler » opérationnel.
  prepareUndo();
  transactionCommands.save({id:id||crypto.randomUUID(),accountId,date,amount,label,createdAt:Date.now()});
  $('transaction-dialog').close();renderAll();showToast(previous?'Opération modifiée.':'Opération ajoutée.',true);
});
$('lombard-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const amount=parseFrenchNumber($('lombard-edit-amount').value);
  const rateValue=$('lombard-edit-rate').value.trim();
  const rate=rateValue===''?null:parseFrenchNumber(rateValue);
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
  const accountType=$('edit-account-kind').value;
  const bank=$('edit-account-bank').value;
  const opening=parseFrenchNumber($('edit-account-opening').value)||0;
  const name=$('edit-account-name').value.trim();
  if(!name){showToast('Renseignez le nom du compte.');return;}
  if(!['bank','savings','pro','pea','av','cto'].includes(accountType)){showToast('Choisissez un type de compte valide.');return;}
  if(!isBankKey(bank)){showToast('Choisissez une banque dans la liste.');return;}
  if(existing)prepareUndo();
  const accountId=existing?.id||crypto.randomUUID();
  try{
    accountCommands.save({id:accountId,name,accountType,bank,opening,existing});
  }catch(error){
    showToast('Compte non enregistré : '+(error.message||'vérifiez les informations.'));
    return;
  }
  const pledged=$('edit-account-pledged').checked;
  const pledgeNote=$('edit-account-pledge-note').value.trim().slice(0,160);
  try{
    accountPledgeCommands.save({accountId,pledged,note:pledgeNote});
  }catch(error){
    showToast('Nantissement non enregistré : '+(error.message||'vérifiez le compte.'));
    return;
  }
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
  const marketColumn=event.target.closest('[data-market-column]');
  if(marketColumn){const kind=marketColumn.dataset.marketColumnKind;const ids=marketVisibleColumns(kind);const id=marketColumn.dataset.marketColumn;const next=marketColumn.checked?[...ids,id]:ids.filter(x=>x!==id);try{localStorage.setItem(MARKET_COLUMN_KEYS[kind],JSON.stringify(next));}catch(_){}renderMarketColumnSettings(kind);if(kind==='crypto')renderCrypto();else renderStocks();return;}
  const columnCheckbox=event.target.closest('[data-op-column]');
  if(columnCheckbox){const ids=opportunityVisibleColumns();const id=columnCheckbox.dataset.opColumn;const next=columnCheckbox.checked?[...ids,id]:ids.filter(x=>x!==id);saveOpportunityColumns(next);renderOpportunityColumnSettings();renderOpportunityHeatmap(document.querySelector('[data-op-period].is-active')?.dataset.opPeriod||'24h');return;}

  const paid=event.target.closest('[data-toggle-paid]');
  if(!paid)return;
  const transaction=state.transactions.find(t=>t.id===paid.dataset.togglePaid);
  if(!transaction)return;
  if(!paid.checked){
    prepareUndo();transactionCommands.setPaid(transaction.id,{isPaid:false});renderAll();
    showToast('Opération remise à pointer.',true);return;
  }
  const dateDialog=document.getElementById('point-date-dialog');
  const dateInput=document.getElementById('point-date-value');
  const dateForm=document.getElementById('point-date-form');
  if(!dateDialog||!dateInput||!dateForm){paid.checked=false;showToast('Impossible d’ouvrir la sélection de date.',false);return;}
  dateInput.value=dateInputFormat(transaction.date<=today()?transaction.date:today());
  dateDialog.returnValue='';
  dateDialog.showModal();
  dateForm.onsubmit=(submitEvent)=>{
    submitEvent.preventDefault();
    const chosenDate=dateInputParse(dateInput.value);
    if(!chosenDate||chosenDate>today()){showToast('Choisissez aujourd’hui ou une date passée.',false);return;}
    prepareUndo();
    transactionCommands.setPaid(transaction.id,{isPaid:true,date:chosenDate});
    dateDialog.close('confirm');
    renderAll();
    showToast('Opération pointée et repositionnée à la date choisie.',true);
  };
  dateDialog.addEventListener('close',function onPointDateClose(){
    dateDialog.removeEventListener('close',onPointDateClose);
    if(dateDialog.returnValue!=='confirm'){paid.checked=false;}
  });
});
document.addEventListener('click',event=>{
  const move=event.target.closest('[data-move-transaction]');
  if(move){moveTransaction(move.dataset.moveTransaction,Number(move.dataset.direction));return;}
  const edit=event.target.closest('[data-edit-transaction]');
  if(edit){const t=state.transactions.find(t=>t.id===edit.dataset.editTransaction);if(t)openTransaction(t.accountId,t);return;}
  const del=event.target.closest('[data-delete-transaction]');
  if(del){const t=transactionCommands.findById(del.dataset.deleteTransaction);if(t&&window.confirm('Supprimer l’opération « '+t.label+' » ?')){prepareUndo();if(cloud.user)cloud.pendingDeletes.add(t.id);transactionCommands.remove(t.id);renderAll();showToast('Opération supprimée.',true);}return;}
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
  if(!document.hidden&&stockHoldingCommands.findAll().length)loadStockPrices();
},STOCK_REFRESH_MS);
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&(state.cryptoHoldings||[]).length&&Date.now()-cryptoPrices.updatedAt>CRYPTO_REFRESH_MS)loadCryptoPrices();
  if(!document.hidden&&stockHoldingCommands.findAll().length&&Date.now()-stockPrices.updatedAt>STOCK_REFRESH_MS)loadStockPrices();
});
initCloud();
