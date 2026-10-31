/**
 * Static catalogs and default reference data used by the browser application.
 * Personal account/portfolio records are deliberately not stored here.
 */
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

const DEFAULT_RECURRING_TEMPLATES = [];

const COINCAP_IDS={'bitcoin':'bitcoin','ethereum':'ethereum','tether':'tether','binancecoin':'binance-coin','solana':'solana','ripple':'xrp','usd-coin':'usd-coin','dogecoin':'dogecoin','cardano':'cardano','avalanche-2':'avalanche','chainlink':'chainlink','polkadot':'polkadot','tron':'tron','litecoin':'litecoin','bitcoin-cash':'bitcoin-cash','stellar':'stellar','shiba-inu':'shiba-inu','near':'near-protocol','uniswap':'uniswap','render-token':'render-token','aave':'aave','ondo-finance':'ondo','bittensor':'bittensor','sui':'sui','aptos':'aptos','toncoin':'toncoin','cosmos':'cosmos','hedera-hashgraph':'hedera-hashgraph','internet-computer':'internet-computer','ethereum-classic':'ethereum-classic','monero':'monero','kaspa':'kaspa','pepe':'pepe','arbitrum':'arbitrum','optimism':'optimism','maker':'maker','the-graph':'the-graph'};

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
