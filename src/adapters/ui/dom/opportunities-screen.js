/**
 * DOM adapter for the Opportunities screen. It is loaded before app.js and
 * intentionally consumes the legacy composition bindings until bootstrap DI is completed.
 */
function opportunityAssets(){
  const crypto=(state.cryptoHoldings||[]).map(h=>{const price=Number(cryptoPrices.values[h.coingeckoId]);const value=Number.isFinite(price)&&price>0?price*Number(h.quantity||0):null;return {id:'c-'+h.id,type:'crypto',symbol:String(h.symbol||h.coingeckoId||'').toUpperCase(),name:h.name||h.symbol||h.coingeckoId,price,value,invested:Number(h.invested)||0,changes:cryptoPrices.market[h.coingeckoId]||{},updatedAt:cryptoPrices.updatedAt,raw:h};});
  const stocks=stockHoldingCommands.findAll().map(h=>{const details=stockPriceDetails(h);const manual=isManualValueHolding(h);const value=manual?manualHoldingValue(h):(details.price!==null?Number(h.quantity||0)*details.price:null);return {id:'s-'+h.id,type:'stock',symbol:h.symbol,name:h.name||h.symbol,price:details.price,value,invested:Number(h.invested)||0,changes:{},updatedAt:stockPrices.updatedAt,raw:h};});
  return [...crypto,...stocks];
}
function opportunityPercent(value){if(value===null||value===undefined||value===''||!Number.isFinite(Number(value)))return '—';const n=Math.abs(Number(value))<0.005?0:Number(value);return (n>0?'+':'')+n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' %';}
function opportunityChange(asset,period){
  const key=period==='24h'?'day':period==='7d'?'week':'month';
  const reported=asset.changes?.[key];
  if(reported!==null&&reported!==undefined&&reported!==''&&Number.isFinite(Number(reported)))return Number(reported);
  if(asset.type==='stock'){
    const history=opportunityHistory?.[asset.id+'|1y']||[];
    if(history.length>1){
      const last=history[history.length-1];
      if(period==='24h'){
        // Variation de clôture à clôture issue de l'historique journalier StockAnalysis.
        // C'est une performance de la dernière séance disponible, pas une promesse de cours intrajournalier.
        const prior=history[history.length-2];
        if(prior&&last.c>0&&prior.c>0&&last.t>prior.t)return (last.c/prior.c-1)*100;
      }else{
        const days=period==='7d'?7:30,cutoff=last.t-days*86400000;
        let prior=null;for(const p of history){if(p.t<=cutoff)prior=p;else break;}
        if(prior&&prior.c>0)return (last.c/prior.c-1)*100;
      }
    }
  }
  return null;
}
function opportunitySignal(asset){
  const d=opportunityChange(asset,'24h'),w=opportunityChange(asset,'7d'),m=opportunityChange(asset,'30d');
  const available=[d,w,m].filter(v=>v!==null&&Number.isFinite(v));
  if(!available.length)return {label:'Données insuffisantes',tone:'neutral',score:null,reason:'Variation de marché indisponible ; aucun signal fiable ne peut être établi.'};
  const score=Math.max(0,Math.min(100,Math.round(50+(d||0)*.25+(w||0)*.6+(m||0)*.25)));
  if((w!==null&&w< -12)||(m!==null&&m< -25))return {label:'Risque / momentum faible',tone:'risk',score,reason:'Repli marqué sur une période : contrôler la thèse, la volatilité et la taille de position.'};
  if(w!==null&&m!==null&&w>0&&m>0&&(d===null||d>-3))return {label:'Momentum positif',tone:'positive',score,reason:'Variations hebdomadaire et mensuelle positives ; ce n’est pas à lui seul un signal d’achat.'};
  if(w!==null&&w<0&&m!==null&&m>0)return {label:'Repli à surveiller',tone:'watch',score,reason:'Repli court terme alors que le mois reste positif ; attendre une confirmation technique.'};
  return {label:'Signal mixte',tone:'neutral',score,reason:'Les horizons ne convergent pas suffisamment pour qualifier une tendance.'};
}
const OPPORTUNITY_LOGO_SYMBOLS={BTC:'btc',ETH:'eth',USDT:'usdt',BNB:'bnb',SOL:'sol',XRP:'xrp',USDC:'usdc',DOGE:'doge',ADA:'ada',AVAX:'avax',LINK:'link',DOT:'dot',TRX:'trx',LTC:'ltc',BCH:'bch',XLM:'xlm',SHIB:'shib',NEAR:'near',UNI:'uni',RNDR:'rndr',RENDER:'rndr',AAVE:'aave',ONDO:'ondo',SUI:'sui',APT:'apt',TON:'ton',ATOM:'atom',HBAR:'hbar',ICP:'icp',ETC:'etc',XMR:'xmr',KAS:'kas',PEPE:'pepe',ARB:'arb',OP:'op',MKR:'mkr',GRT:'grt',RSR:'rsr'};
function opportunityLogoUrl(asset){
  const symbol=String(asset.symbol||'').toUpperCase();
  const coinSymbol=OPPORTUNITY_LOGO_SYMBOLS[symbol]||symbol.toLowerCase();
  if(asset.type==='crypto'){
    const coinId=String(asset.raw?.coingeckoId||'');
    const cachedImage=coinId&&cryptoPrices.images?.[coinId];
    if(cachedImage)return cachedImage;
    // Render and Ondo ticker filenames are not consistently available in the static icon pack.
    if(symbol==='RENDER')return 'https://assets.coingecko.com/coins/images/11636/large/rndr.png';
    if(symbol==='RNDR')return 'https://assets.coingecko.com/coins/images/11636/large/rndr.png';
    if(symbol==='ONDO')return 'https://assets.coingecko.com/coins/images/26580/large/ONDO.png';
    return 'https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/'+encodeURIComponent(coinSymbol)+'.png';
  }
  const ticker=String(asset.symbol||'').toUpperCase();
  if(ticker==='SU'||/schneider electric/i.test(String(asset.name||'')))return 'https://api.elbstream.com/logos/isin/FR0000121972';
  return 'https://images.financialmodelingprep.com/symbol/'+encodeURIComponent(ticker)+'.png';
}
function opportunityLogoMarkup(asset){
  const symbol=String(asset.symbol||'?').toUpperCase();
  const initials=escapeHtml(symbol.slice(0,4));
  const noReliableLogo=new Set(['SSLV','IGLN','XNAS','PUST','CSPX','SUR000001737']);
  if(noReliableLogo.has(symbol))return '<span class="opportunity-asset-logo asset-logo logo-failed" aria-label="Actif '+initials+'"><span class="asset-logo-fallback opportunity-fallback">'+initials+'</span></span>';
  const url=opportunityLogoUrl(asset);
  return '<span class="opportunity-asset-logo asset-logo" aria-label="Actif '+initials+'"><span class="asset-logo-fallback opportunity-fallback">'+initials+'</span><img src="'+escapeHtml(url)+'" alt="" loading="lazy" onload="if(this.previousElementSibling)this.previousElementSibling.hidden=true" onerror="if(this&&this.parentElement){this.hidden=true;this.parentElement.classList.add(\'logo-failed\')}"></span>';
}
const normalizeOpportunityDailyPoints=window.OpportunityTechnical.normalizeDailyPoints;
const opportunitySmaPoints=window.OpportunityTechnical.smaPoints;
let opportunityChartInstance=null;
let opportunityChartResizeObserver=null;
let opportunityChartResizeHandler=null;
function destroyOpportunityChart(){
  if(opportunityChartResizeObserver){opportunityChartResizeObserver.disconnect();opportunityChartResizeObserver=null;}
  if(opportunityChartResizeHandler){window.removeEventListener('resize',opportunityChartResizeHandler);opportunityChartResizeHandler=null;}
  if(opportunityChartInstance){opportunityChartInstance.remove();opportunityChartInstance=null;}
}
function opportunityFormatPrice(value,asset){
  const rawCurrency=asset.type==='crypto'?'EUR':normalizeStockCurrency(asset.raw?.currency);
  const displayCurrency=rawCurrency==='GBX'?'GBP':rawCurrency;
  const displayValue=rawCurrency==='GBX'?value/100:value;
  return new Intl.NumberFormat('fr-FR',{style:'currency',currency:displayCurrency,maximumFractionDigits:Math.abs(displayValue)<1?5:2}).format(displayValue);
}
function renderOpportunityTradingViewChart(container,points,sma,period,asset){
  destroyOpportunityChart();
  const library=window.LightweightCharts;
  if(!library||typeof library.createChart!=='function'){
    container.innerHTML='<div class="opportunity-chart-empty" role="alert">Le composant TradingView n’a pas pu être chargé. Vérifie la connexion puis recharge la page.</div>';
    return;
  }
  container.innerHTML='<div id="opportunity-tv-chart" class="opportunity-tv-chart" role="img" aria-label="Graphique TradingView du cours et de la MM200 de '+escapeHtml(asset.symbol)+'"></div>';
  const target=$('opportunity-tv-chart');
  if(!target)return;
  const dark=document.documentElement.getAttribute('data-theme')==='dark';
  const textColor=dark?'#c5d1e2':'#68758a';
  const gridColor=dark?'rgba(170,190,220,.10)':'rgba(35,55,85,.08)';
  const rawCurrency=asset.type==='crypto'?'EUR':normalizeStockCurrency(asset.raw?.currency);
  const chartScale=rawCurrency==='GBX'?.01:1;
  const displayCurrency=rawCurrency==='GBX'?'GBP':rawCurrency;
  const formatter=value=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:displayCurrency,maximumFractionDigits:Math.abs(value)<1?5:2}).format(value);
  const formatPrice=value=>formatter(value*chartScale);
  const chart=library.createChart(target,{
    width:Math.max(320,target.clientWidth||800),height:340,
    layout:{background:{type:'solid',color:dark?'#142238':'#ffffff'},textColor,fontFamily:"'DM Sans', sans-serif",fontSize:11},
    grid:{vertLines:{color:gridColor},horzLines:{color:gridColor}},
    crosshair:{mode:library.CrosshairMode?.Normal??0,vertLine:{color:dark?'#91a7c8':'#8b98ad',width:1,style:2},horzLine:{color:dark?'#91a7c8':'#8b98ad',width:1,style:2}},
    rightPriceScale:{borderColor:gridColor,scaleMargins:{top:.12,bottom:.12}},
    timeScale:{borderColor:gridColor,timeVisible:false,secondsVisible:false,rightOffset:6,barSpacing:7},
    localization:{locale:'fr-FR',dateFormat:'dd MMM yyyy',priceFormatter:formatter},
    handleScroll:{mouseWheel:true,pressedMouseMove:true,horzTouchDrag:true,vertTouchDrag:false},
    handleScale:{mouseWheel:true,pinch:true,axisPressedMouseMove:true}
  });
  const priceSeries=chart.addLineSeries({color:'#526ff0',lineWidth:2,priceLineVisible:false,lastValueVisible:true,priceFormat:{type:'custom',formatter}});
  const smaSeries=chart.addLineSeries({color:'#e7a844',lineWidth:2,priceLineVisible:false,lastValueVisible:true,priceFormat:{type:'custom',formatter}});
  const asTime=point=>new Date(point.t).toISOString().slice(0,10);
  priceSeries.setData(points.map(point=>({time:asTime(point),value:point.c*chartScale})));
  smaSeries.setData(points.map((point,index)=>({time:asTime(point),value:Number.isFinite(sma[index])?sma[index]*chartScale:null})).filter(point=>Number.isFinite(point.value)));
  const tooltip=document.createElement('div');
  tooltip.className='opportunity-tv-tooltip';
  tooltip.setAttribute('aria-live','polite');
  tooltip.hidden=true;
  target.appendChild(tooltip);
  chart.subscribeCrosshairMove(param=>{
    if(!param||!param.time||!param.point||param.point.x<0||param.point.y<0||param.point.x>target.clientWidth||param.point.y>target.clientHeight){
      tooltip.hidden=true;return;
    }
    const price=param.seriesData.get(priceSeries),average=param.seriesData.get(smaSeries);
    if(!price){tooltip.hidden=true;return;}
    const time=typeof param.time==='string'?param.time:(param.time.year+'-'+String(param.time.month).padStart(2,'0')+'-'+String(param.time.day).padStart(2,'0'));
    const date=new Date(time+'T00:00:00Z');
    const dateText=new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeZone:'UTC'}).format(date);
    const distance=average&&Number.isFinite(average.value)?(price.value/average.value-1)*100:null;
    tooltip.innerHTML='<strong>'+escapeHtml(dateText)+'</strong><span><i class="tooltip-price-dot"></i>Cours : '+escapeHtml(formatPrice(price.value/chartScale))+'</span><span><i class="tooltip-sma-dot"></i>MM200 : '+(distance===null?'Indisponible':escapeHtml(formatPrice(average.value/chartScale)))+'</span><span>Écart : '+(distance===null?'—':escapeHtml(opportunityPercent(distance)))+'</span>';
    tooltip.hidden=false;
    const left=Math.max(8,Math.min(param.point.x+12,target.clientWidth-190));
    const top=Math.max(8,Math.min(param.point.y+12,target.clientHeight-112));
    tooltip.style.left=left+'px';tooltip.style.top=top+'px';
  });
  chart.timeScale().fitContent();
  const visibleBars=asset.type==='crypto'?(period==='1m'?30:period==='3m'?90:points.length):(period==='1m'?21:period==='3m'?63:points.length);
  if(points.length>visibleBars)chart.timeScale().setVisibleLogicalRange({from:Math.max(0,points.length-visibleBars),to:points.length-1});
  opportunityChartInstance=chart;
  if(typeof ResizeObserver!=='undefined'){
    opportunityChartResizeObserver=new ResizeObserver(entries=>{
      const width=Math.floor(entries[0]?.contentRect?.width||target.clientWidth);
      if(width>0&&opportunityChartInstance===chart)chart.applyOptions({width});
    });
    opportunityChartResizeObserver.observe(target);
  }else{
    opportunityChartResizeHandler=()=>{if(opportunityChartInstance===chart&&target.clientWidth>0)chart.applyOptions({width:target.clientWidth});};
    window.addEventListener('resize',opportunityChartResizeHandler,{passive:true});
  }
}
function isActiveOpportunityChart(assetId,period){
  const select=$('opportunity-chart-asset');
  const activePeriod=document.querySelector('[data-chart-period].is-active')?.dataset.chartPeriod||'1y';
  return !!select&&select.value===assetId&&activePeriod===period;
}
async function loadOpportunityHistory(assetId,period){
  const asset=opportunityAssets().find(a=>a.id===assetId);if(!asset)return;
  // 1m, 3m et 1y utilisent le même historique annuel : on évite les appels
  // identiques et on conserve 200 clôtures pour calculer la MM200.
  const historyPeriod='1y';
  const key=asset.id+'|'+historyPeriod;
  if(opportunityHistory[key]){if(isActiveOpportunityChart(assetId,period))renderOpportunityChart(assetId,period);return;}
  if(opportunityHistoryLoading[key])return opportunityHistoryLoading[key];
  if(isActiveOpportunityChart(assetId,period)){
    const container=$('opportunity-price-chart');
    if(container){destroyOpportunityChart();container.innerHTML='<div class="opportunity-chart-empty" role="status"><span class="opportunity-loading-spinner" aria-hidden="true"></span>Chargement de l’historique réel de '+escapeHtml(asset.symbol)+'…</div>';}
  }
  opportunityHistoryLoading[key]=(async()=>{
    try{
      let points=[];
      if(asset.type==='crypto'){
        const days=365;
        const payload=await stockFunction('crypto-history',{id:asset.raw.coingeckoId,symbol:asset.symbol,days});
        points=normalizeOpportunityDailyPoints(payload.points,'crypto');
      }else{
        if(!asset.raw.priceId)throw new Error('Aucun identifiant de cours exploitable pour cet actif.');
        const payload=await stockFunction('history',{id:asset.raw.priceId,period:historyPeriod});
        points=normalizeOpportunityDailyPoints(payload.points,'stock');
      }
      if(!points.length)throw new Error('La source n’a renvoyé aucun cours historique pour cet actif.');
      opportunityHistory[key]=points;
      delete opportunityHistoryAttempts[key];
      delete opportunityHistoryErrors[key];
      if(isActiveOpportunityChart(assetId,period))renderOpportunityChart(assetId,period);
    }catch(error){
      opportunityHistoryAttempts[key]=Date.now();
      opportunityHistoryErrors[key]=error.message||'La source n’a pas répondu.';
      console.warn('Opportunity history unavailable for '+asset.symbol+' ('+historyPeriod+')',error);
      if(isActiveOpportunityChart(assetId,period)){
        const container=$('opportunity-price-chart'),summary=$('opportunity-chart-summary');
        if(container)container.innerHTML='<div class="opportunity-chart-empty" role="alert"><strong>Historique momentanément indisponible</strong><span>'+escapeHtml(error.message||'La source n’a pas répondu.')+'</span><small>La courbe n’est pas remplacée par une estimation ; une nouvelle tentative sera possible après 15 minutes ou via « Actualiser l’analyse ».</small></div>';
        if(summary)summary.innerHTML='<span>MM200 non calculable : historique indisponible.</span>';
      }
      if(opportunityHistoryRetryTimer)clearTimeout(opportunityHistoryRetryTimer);
      opportunityHistoryRetryTimer=setTimeout(()=>{
        opportunityHistoryRetryTimer=null;
        if($('opportunities-view')?.classList.contains('active'))renderOpportunities();
      },900000);
    }finally{delete opportunityHistoryLoading[key];}
  })();
  return opportunityHistoryLoading[key];
}
const opportunityHistory={};
const opportunityHistoryLoading={};
// Dernier échec par actif : évite de relancer une rafale d’appels à chaque rendu
// quand un fournisseur est momentanément limité. Un clic sur l’actif force une nouvelle tentative.
const opportunityHistoryAttempts={};
const opportunityHistoryErrors={};
let opportunityHistoryRetryTimer=null;
function renderOpportunityChart(assetId,period){
  const asset=opportunityAssets().find(a=>a.id===assetId);if(!asset)return;
  const chart=$('opportunity-price-chart'),summary=$('opportunity-chart-summary');if(!chart||!summary)return;
  if(!opportunityHasHistorySource(asset)){destroyOpportunityChart();chart.innerHTML='<div class="opportunity-chart-empty" role="status">Historique indisponible pour '+escapeHtml(asset.symbol)+'. Cette position n’a pas de source de cours historique exploitable ; aucun prix n’est inventé.</div>';summary.innerHTML='<span>MM200 non calculable pour cette position.</span>';return;}
  const historyPeriod='1y';
  const fullPoints=opportunityHistory[asset.id+'|'+historyPeriod]||[];
  if(!fullPoints.length){
    const failedAt=Number(opportunityHistoryAttempts[asset.id+'|'+historyPeriod])||0;
    if(failedAt&&Date.now()-failedAt<900000){
      destroyOpportunityChart();
      chart.innerHTML='<div class="opportunity-chart-empty" role="status"><strong>Historique momentanément indisponible</strong><span>'+escapeHtml(opportunityHistoryErrors[asset.id+'|'+historyPeriod]||'Le fournisseur a limité les requêtes.')+'</span><small>Nouvelle tentative après 15 minutes ou via « Actualiser l’analyse » ; aucune estimation n’est affichée.</small></div>';
      summary.innerHTML='<span>MM200 et niveaux techniques indisponibles pour le moment.</span>';
      return;
    }
    loadOpportunityHistory(assetId,period);
    return;
  }
  const smaFull=opportunitySmaPoints(fullPoints,asset.type,200);
  const last=fullPoints[fullPoints.length-1],lastSma=smaFull[smaFull.length-1];
  const rangeDays=period==='1m'?30:period==='3m'?90:365;
  const visibleFrom=last.t-rangeDays*86400000;
  const visiblePoints=fullPoints.filter(p=>p.t>=visibleFrom);
  const first=visiblePoints[0]||fullPoints[0],change=(last.c/first.c-1)*100,distance=Number.isFinite(lastSma)?(last.c/lastSma-1)*100:null;
  const recent=fullPoints.filter(p=>p.t>=last.t-30*86400000).map(p=>p.c);
  const older=fullPoints.filter(p=>p.t>=last.t-60*86400000&&p.t<last.t-30*86400000).map(p=>p.c);
  const momentum=recent.length>1&&older.length>1?(recent[recent.length-1]/older[0]-1)*100:null;
  const window=fullPoints.filter(p=>p.t>=last.t-90*86400000).map(p=>p.c);
  const support=window.length?Math.min(...window):null,resistance=window.length?Math.max(...window):null;
  const trend=distance===null?'MM200 non calculable':distance>=0?'Cours au-dessus de la MM200':'Cours sous la MM200';
  const signal=distance===null?'Historique insuffisant ou discontinu pour confirmer la tendance longue':distance>3&&momentum!==null&&momentum>0?'Biais haussier à confirmer':distance< -3&&momentum!==null&&momentum<0?'Biais baissier / prudence':'Signal technique neutre ou mixte';
  const dateLabel=new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(last.t));
  summary.innerHTML='<div class="opportunity-chart-metric"><span>'+(asset.type==='crypto'?'Dernier cours journalier':'Dernière clôture')+' · '+escapeHtml(dateLabel)+'</span><strong>'+escapeHtml(opportunityFormatPrice(last.c,asset))+'</strong></div><div class="opportunity-chart-metric"><span>Variation période</span><strong class="'+(change>=0?'positive':'negative')+'">'+escapeHtml(opportunityPercent(change))+'</strong></div><div class="opportunity-chart-metric"><span>MM200 · 200 '+(asset.type==='crypto'?'jours':'séances')+'</span><strong>'+(Number.isFinite(lastSma)?escapeHtml(opportunityFormatPrice(lastSma,asset)):'Indisponible')+'</strong></div><div class="opportunity-chart-metric"><span>Écart cours / MM200</span><strong class="'+(distance===null?'':distance>=0?'positive':'negative')+'">'+(distance===null?'Historique insuffisant':escapeHtml(opportunityPercent(distance)))+'</strong></div><div class="opportunity-chart-metric"><span>Points journaliers valides</span><strong>'+fullPoints.length+'</strong></div><div class="opportunity-chart-metric"><span>Support 90 j*</span><strong>'+(support===null?'—':escapeHtml(opportunityFormatPrice(support,asset)))+'</strong></div><div class="opportunity-chart-metric"><span>Résistance 90 j*</span><strong>'+(resistance===null?'—':escapeHtml(opportunityFormatPrice(resistance,asset)))+'</strong></div><div class="opportunity-chart-decision"><strong>'+escapeHtml(signal)+'</strong><span>'+escapeHtml(trend)+(momentum===null?'':' · momentum 30 j : '+opportunityPercent(momentum))+'</span><small>* Extrêmes observés sur 90 jours. La MM200 est calculée sur les 200 derniers points journaliers valides ; les interruptions anormales invalident la moyenne. Le cours et la MM200 affichés correspondent à la même date.</small></div>';
  renderOpportunityTradingViewChart(chart,fullPoints,smaFull,period,asset);
}
function opportunityHasHistorySource(asset){
  return asset.type==='crypto' ? !!asset.raw?.coingeckoId : !!asset.raw?.priceId;
}
function setupOpportunityChart(){
  const select=$('opportunity-chart-asset');if(!select)return;
  // Ne pas sélectionner une position manuelle ou sans identifiant de cours
  // comme premier actif : elle ne peut pas produire de courbe historique.
  const assets=opportunityAssets().filter(opportunityHasHistorySource);
  const current=select.value;
  select.innerHTML=assets.map(a=>'<option value="'+escapeHtml(a.id)+'">'+escapeHtml(a.symbol+' · '+a.name)+'</option>').join('');
  if(!assets.length){
    select.innerHTML='<option value="">Aucun historique disponible</option>';
    const chart=$('opportunity-price-chart'),summary=$('opportunity-chart-summary');
    if(chart){destroyOpportunityChart();chart.innerHTML='<div class="opportunity-chart-empty" role="status">Aucun actif ne possède actuellement de source d’historique exploitable. Vérifie les identifiants de cours dans Actions ou les identifiants CoinGecko dans Crypto.</div>';}
    if(summary)summary.innerHTML='<span>Historique indisponible pour les positions actuelles.</span>';
    return;
  }
  select.value=assets.some(a=>a.id===current)?current:assets[0].id;
  const period=document.querySelector('[data-chart-period].is-active')?.dataset.chartPeriod||'1y';
  renderOpportunityChart(select.value,period);
}
function opportunityMovingAverageStatus(asset){
  const history=opportunityHistory[asset.id+'|1y']||[];
  if(history.length<200)return {label:'MM200 indisponible',tone:'neutral',distance:null};
  const sma=opportunitySmaPoints(history,asset.type,200),last=history[history.length-1],avg=sma[sma.length-1];
  if(!Number.isFinite(avg)||avg<=0)return {label:'MM200 indisponible',tone:'neutral',distance:null};
  const distance=(last.c/avg-1)*100;
  return {label:distance>=0?'Au-dessus MM200':'Sous MM200',tone:distance>=0?'positive':'negative',distance};
}
const MARKET_CHANGE_COLUMNS=[{id:'24h',label:'24 heures'},{id:'7d',label:'7 jours'},{id:'30d',label:'30 jours'}];
const MARKET_COLUMN_KEYS={crypto:'gestion-comptes-crypto-market-columns-v1',stocks:'gestion-comptes-stocks-market-columns-v1'};
const MARKET_SORT_KEYS={crypto:'gestion-comptes-crypto-table-sort-v1',stocks:'gestion-comptes-stocks-table-sort-v1'};
const MARKET_SORT_COLUMNS=[{id:'asset',label:'Actif'},{id:'invested',label:'Investi'},{id:'quantity',label:'Quantité'},{id:'price',label:'Prix actuel'},{id:'value',label:'Valeur actuelle'},{id:'gain',label:'Gain/perte'},{id:'performance',label:'%'},{id:'24h',label:'24 h'},{id:'7d',label:'7 jours'},{id:'30d',label:'30 jours'}];
function marketSortState(kind){try{return JSON.parse(localStorage.getItem(MARKET_SORT_KEYS[kind])||'null');}catch(_){return null;}}
function sortMarketHoldings(kind,holdings,metrics){const state=marketSortState(kind);if(!state||!MARKET_SORT_COLUMNS.some(c=>c.id===state.column))return holdings;const value=(h,id)=>{const m=metrics.get(h.id);if(id==='asset')return String(h.name||h.symbol||'').toLocaleLowerCase('fr');if(id==='invested')return m.invested;if(id==='quantity')return m.quantity;if(id==='price')return m.price??null;if(id==='value')return m.value??null;if(id==='gain')return m.gain??null;if(id==='performance')return m.performance??null;return marketChangeForHolding(kind,h)[id]??null;};return holdings.sort((a,b)=>{const av=value(a,state.column),bv=value(b,state.column);if(av===null&&bv===null)return String(a.symbol||'').localeCompare(String(b.symbol||''),'fr');if(av===null)return 1;if(bv===null)return -1;const cmp=typeof av==='string'?av.localeCompare(bv,'fr'):av-bv;return (state.direction==='asc'?1:-1)*cmp;});}
function marketSortHeader(kind,id,label){const state=marketSortState(kind);const active=state?.column===id;return '<button type="button" class="opportunity-sort-button" data-market-sort="'+kind+':'+id+'" aria-label="Trier par '+label+'">'+label+' <span aria-hidden="true">'+(active?(state.direction==='asc'?'↑':'↓'):'↕')+'</span></button>';}
function syncMarketSortHeaders(kind){document.querySelectorAll('[data-market-sort^="'+kind+':"]').forEach(button=>{const [buttonKind,id]=button.dataset.marketSort.split(':');const label=MARKET_SORT_COLUMNS.find(c=>c.id===id)?.label||button.textContent.trim();const state=marketSortState(buttonKind);button.innerHTML=label+' <span aria-hidden="true">'+(state?.column===id?(state.direction==='asc'?'↑':'↓'):'↕')+'</span>';});}
function marketVisibleColumns(kind){try{const saved=JSON.parse(localStorage.getItem(MARKET_COLUMN_KEYS[kind])||'null');if(Array.isArray(saved))return MARKET_CHANGE_COLUMNS.map(c=>c.id).filter(id=>saved.includes(id));}catch(_){}return MARKET_CHANGE_COLUMNS.map(c=>c.id);}
function positionMarketColumnPanel(kind){
  const panel=$(kind+'-column-settings'),button=$(kind+'-columns-toggle');
  if(!panel||!button||panel.hidden||!panel.classList.contains('market-column-settings-floating'))return;
  const rect=button.getBoundingClientRect(),margin=12,gap=8,width=Math.min(300,window.innerWidth-margin*2);
  panel.style.position='fixed';panel.style.width=width+'px';panel.style.maxWidth='calc(100vw - 24px)';
  const left=Math.max(margin,Math.min(rect.right-width,window.innerWidth-width-margin));panel.style.left=left+'px';panel.style.right='auto';
  const maxHeight=Math.min(420,Math.floor(window.innerHeight*0.65));panel.style.maxHeight=maxHeight+'px';
  const below=window.innerHeight-rect.bottom-gap-margin;
  const top=below>=Math.min(180,maxHeight)?rect.bottom+gap:Math.max(margin,rect.top-gap-Math.min(panel.scrollHeight,maxHeight));
  panel.style.top=top+'px';panel.style.bottom='auto';
}
window.addEventListener('resize',()=>{for(const kind of ['crypto','stocks'])positionMarketColumnPanel(kind);});
window.addEventListener('scroll',()=>{for(const kind of ['crypto','stocks'])positionMarketColumnPanel(kind);},true);
function renderMarketColumnSettings(kind){const panel=$(kind+'-column-settings');if(!panel)return;const visible=marketVisibleColumns(kind);panel.innerHTML='<div class="opportunity-column-settings-title">Variations affichées</div>'+MARKET_CHANGE_COLUMNS.map(c=>'<label class="opportunity-column-option"><input type="checkbox" data-market-column-kind="'+kind+'" data-market-column="'+c.id+'" '+(visible.includes(c.id)?'checked ':'')+'><span>'+c.label+'</span></label>').join('')+'<button type="button" class="opportunity-column-reset" data-market-columns-reset="'+kind+'">Tout afficher</button>';}
function marketChangeForHolding(kind,holding){const id=(kind==='crypto'?'c-':'s-')+holding.id;const asset=opportunityAssets().find(a=>a.id===id);return asset?{'24h':opportunityChange(asset,'24h'),'7d':opportunityChange(asset,'7d'),'30d':opportunityChange(asset,'30d')}:{'24h':null,'7d':null,'30d':null};}

function renderMarketDailySummary(kind,holdings,metrics){
  const prefix=kind==='crypto'?'crypto':'stocks';
  const amountEl=$(prefix+'-daily-amount'),percentEl=$(prefix+'-daily-percent'),statusEl=$(prefix+'-daily-status');
  if(!amountEl||!percentEl||!statusEl)return;
  let deltaTotal=0,previousTotal=0,valid=0,missing=0;
  for(const holding of holdings){
    const metric=metrics.get(holding.id);
    if(!metric||metric.value===null||!Number.isFinite(metric.value)||metric.value<=0||(isManualValueHolding(holding)&&kind==='stocks')){missing++;continue;}
    const change=marketChangeForHolding(kind,holding)['24h'];
    if(change===null||!Number.isFinite(change)||change<=-100){missing++;continue;}
    const previousValue=metric.value/(1+change/100);
    if(!Number.isFinite(previousValue)||previousValue<=0){missing++;continue;}
    previousTotal+=previousValue;deltaTotal+=metric.value-previousValue;valid++;
  }
  if(valid===0){
    amountEl.textContent='—';percentEl.textContent='—';
    amountEl.classList.remove('positive','negative');percentEl.classList.remove('positive','negative');
    statusEl.textContent='Variation journalière indisponible';return;
  }
  const percent=previousTotal>0?deltaTotal/previousTotal*100:null;
  amountEl.textContent=(deltaTotal>0?'+':'')+euro(deltaTotal);
  percentEl.textContent=percent===null?'—':formatSignedPercent(percent);
  amountEl.classList.toggle('positive',deltaTotal>0);amountEl.classList.toggle('negative',deltaTotal<0);
  percentEl.classList.toggle('positive',percent!==null&&percent>0);percentEl.classList.toggle('negative',percent!==null&&percent<0);
  statusEl.textContent=(missing===0?'Portefeuille complet':'Données partielles · '+valid+' position(s) valorisée(s)')+' · variation sur 24 h';
}

function marketChangeCell(value,period){const cls=value===null?'missing':value>0?'positive':value<0?'negative':'neutral';const daily=period==='24h';return '<td class="'+(daily?'market-daily-change-cell':'')+'"><span class="opportunity-ranking-change '+cls+(daily?' market-daily-change-pill':'')+'">'+(value===null?'—':escapeHtml(opportunityPercent(value)))+'</span></td>';}
function syncMarketColumnHeaders(kind){const visible=new Set(marketVisibleColumns(kind));document.querySelectorAll('[data-market-head^="'+kind+':"]').forEach(th=>{th.hidden=!visible.has(th.dataset.marketHead.split(':')[1]);});}
const OPPORTUNITY_COLUMNS_KEY='gestion-comptes-opportunity-columns-v1';
const OPPORTUNITY_SORT_KEY='gestion-comptes-opportunity-sort-v1';
const OPPORTUNITY_COLUMN_DEFS=[
  {id:'asset',label:'Actif',locked:true},
  {id:'type',label:'Type'},
  {id:'value',label:'Valeur détenue'},
  {id:'24h',label:'24 h'},
  {id:'7d',label:'7 jours'},
  {id:'30d',label:'30 jours'},
  {id:'mm200',label:'Tendance MM200'}
];
function opportunityVisibleColumns(){
  try{
    const saved=JSON.parse(localStorage.getItem(OPPORTUNITY_COLUMNS_KEY)||'null');
    if(Array.isArray(saved)){const valid=saved.filter(id=>OPPORTUNITY_COLUMN_DEFS.some(c=>c.id===id));return ['asset',...valid.filter(id=>id!=='asset')];}
  }catch(_){}
  return OPPORTUNITY_COLUMN_DEFS.map(c=>c.id);
}
function saveOpportunityColumns(ids){
  const clean=['asset',...OPPORTUNITY_COLUMN_DEFS.map(c=>c.id).filter(id=>id!=='asset'&&ids.includes(id))];
  try{localStorage.setItem(OPPORTUNITY_COLUMNS_KEY,JSON.stringify(clean));}catch(_){}
}
function renderOpportunityColumnSettings(){
  const panel=$('opportunity-column-settings');if(!panel)return;
  const visible=opportunityVisibleColumns();
  panel.innerHTML='<div class="opportunity-column-settings-title">Colonnes visibles</div>'+OPPORTUNITY_COLUMN_DEFS.map(c=>'<label class="opportunity-column-option"><input type="checkbox" data-op-column="'+c.id+'" '+(visible.includes(c.id)?'checked ':'')+(c.locked?'disabled ':'')+'><span>'+c.label+'</span></label>').join('')+'<button type="button" class="opportunity-column-reset" data-op-columns-reset>Tout afficher</button>';
}
function renderOpportunityHeatmap(period='24h'){
  const container=$('opportunity-heatmap');if(!container)return;
  const assets=opportunityAssets();
  if(!assets.length){container.innerHTML='<div class="empty-state">Ajoute des positions dans Actions ou Crypto pour afficher le classement.</div>';return;}
  const columns=opportunityVisibleColumns();
  const sortState=(()=>{try{return JSON.parse(localStorage.getItem(OPPORTUNITY_SORT_KEY)||'null')||{column:period,direction:'desc'};}catch(_){return {column:period,direction:'desc'};}})();
  const rows=assets.map(asset=>({asset,changes:{'24h':opportunityChange(asset,'24h'),'7d':opportunityChange(asset,'7d'),'30d':opportunityChange(asset,'30d')},mm:opportunityMovingAverageStatus(asset)}));
  const sortValue=row=>sortState.column==='asset'?String(row.asset.name||row.asset.symbol).toLocaleLowerCase('fr'):sortState.column==='type'?row.asset.type:sortState.column==='value'?row.asset.value:sortState.column==='mm200'?row.mm.distance:row.changes[sortState.column];
  rows.sort((a,b)=>{
    const av=sortValue(a),bv=sortValue(b);
    if(av===null||av===undefined)return bv===null||bv===undefined?String(a.asset.symbol).localeCompare(String(b.asset.symbol),'fr'):1;
    if(bv===null||bv===undefined)return -1;
    const cmp=typeof av==='string'?av.localeCompare(bv,'fr'):(av-bv);
    return cmp*(sortState.direction==='asc'?1:-1);
  });
  const allChanges=rows.flatMap(r=>Object.values(r.changes));
  const positive=allChanges.filter(v=>v!==null&&v>0).length,negative=allChanges.filter(v=>v!==null&&v<0).length,missing=allChanges.filter(v=>v===null).length;
  const summary=$('opportunity-heatmap-summary');
  if(summary)summary.innerHTML='<span><strong>'+rows.length+'</strong> actifs suivis</span><span class="opportunity-heatmap-summary-up"><strong>'+positive+'</strong> performances positives</span><span class="opportunity-heatmap-summary-down"><strong>'+negative+'</strong> performances négatives</span><span><strong>'+missing+'</strong> variations indisponibles</span>';
  const labels={'asset':'Actif','type':'Type','value':'Valeur détenue','24h':'24 h','7d':'7 jours','30d':'30 jours','mm200':'Tendance MM200'};
  const header=columns.map(id=>'<th><button type="button" class="opportunity-sort-button" data-op-sort="'+id+'" aria-label="Trier par '+labels[id]+'">'+labels[id]+' <span aria-hidden="true">'+(sortState.column===id?(sortState.direction==='asc'?'↑':'↓'):'↕')+'</span></button></th>').join('');
  const cell=(id,row)=>{
    const asset=row.asset;
    if(id==='asset')return '<td><div class="opportunity-ranking-asset">'+opportunityLogoMarkup(asset)+'<span><strong>'+escapeHtml(asset.symbol)+'</strong><small>'+escapeHtml(asset.name)+'</small></span></div></td>';
    if(id==='type')return '<td><span class="opportunity-ranking-type">'+(asset.type==='crypto'?'Crypto':'Action / ETF')+'</span></td>';
    if(id==='value')return '<td class="opportunity-ranking-value">'+(asset.value===null?'—':escapeHtml(euro(asset.value)))+'</td>';
    if(['24h','7d','30d'].includes(id)){const change=row.changes[id],cls=change===null?'missing':change>0?'positive':change<0?'negative':'neutral';return '<td><span class="opportunity-ranking-change '+cls+'">'+(change===null?'Indisponible':escapeHtml(opportunityPercent(change)))+'</span></td>';}
    const mm=row.mm,mmText=mm.distance===null?mm.label:mm.label+' · '+opportunityPercent(mm.distance);
    return '<td><span class="opportunity-ranking-mm '+mm.tone+'">'+escapeHtml(mmText)+'</span></td>';
  };
  container.innerHTML='<table class="opportunity-ranking-table"><thead><tr>'+header+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+columns.map(id=>cell(id,row)).join('')+'</tr>').join('')+'</tbody></table>';
}
function renderOpportunityAssets(filter='all'){
  const container=$('opportunity-assets');if(!container)return;
  const assets=opportunityAssets().filter(a=>filter==='all'||a.type===filter);
  if(!assets.length){container.innerHTML='<div class="empty-state">Aucun actif dans cette catégorie. Ajoute une position dans Crypto ou Actions.</div>';return;}
  assets.sort((a,b)=>(b.value||0)-(a.value||0));
  container.innerHTML=assets.map(asset=>{const signal=opportunitySignal(asset),change=opportunityChange(asset,'24h'),value=asset.value===null?'Cours indisponible':euro(asset.value);return '<article class="opportunity-asset-row"><div class="opportunity-asset-main">'+opportunityLogoMarkup(asset)+'<div><strong>'+escapeHtml(asset.name)+'</strong><small>'+escapeHtml(asset.symbol)+' · '+(asset.type==='crypto'?'Crypto':'Action / ETF')+'</small></div></div><div class="opportunity-asset-value"><strong>'+value+'</strong><small>Valeur détenue</small></div><div class="opportunity-asset-change '+(change===null?'muted':change>0?'positive':change<0?'negative':'')+'"><strong>'+(change===null?'—':opportunityPercent(change))+'</strong><small>24 h</small></div><div class="opportunity-asset-signal"><span class="opportunity-signal '+signal.tone+'">'+escapeHtml(signal.label)+'</span><small>'+escapeHtml(signal.reason)+'</small></div></article>';}).join('');
}
async function loadOpportunityFearGreed(){
  const valueEl=$('opportunity-fear-greed'),labelEl=$('opportunity-fear-greed-label');if(!valueEl)return;
  try{
    const result=await fearGreedProvider.fetchLatest();
    const value=result.value;
    valueEl.textContent=String(value)+'/100';
    if(labelEl)labelEl.textContent=result.classification+' · '+(value<45?'Fear dominant':value>55?'Greed dominant':'zone neutre');
    const marker=$('opportunity-fear-greed-marker');
    if(marker){marker.style.left=Math.max(0,Math.min(100,value))+'%';marker.setAttribute('aria-label','Score '+value+' sur 100');}
  }catch{
    valueEl.textContent='—';
    if(labelEl)labelEl.textContent='Indice indisponible (source externe)';
  }
}
function renderOpportunities(){
  if(!$('opportunities-view'))return;
  const assets=opportunityAssets(),priced=assets.filter(a=>a.value!==null),total=priced.reduce((sum,a)=>sum+a.value,0);
  $('opportunity-total-value').textContent=euro(total);
  $('opportunity-asset-count').textContent=priced.length+' position(s) valorisée(s) sur '+assets.length+' suivie(s)';
  const day=assets.filter(a=>a.value!==null&&Number.isFinite(opportunityChange(a,'24h')));
  const weighted=day.length?day.reduce((sum,a)=>sum+a.value*opportunityChange(a,'24h'),0)/(day.reduce((sum,a)=>sum+a.value,0)||1):null;
  const dayEl=$('opportunity-crypto-day');if(dayEl){dayEl.textContent=opportunityPercent(weighted);dayEl.classList.toggle('positive',weighted!==null&&weighted>0);dayEl.classList.toggle('negative',weighted!==null&&weighted<0);}
  const fresh=$('opportunity-data-freshness');if(fresh)fresh.textContent=day.length+' position(s) avec variation 24 h disponible ; les autres sont signalées séparément.';
  const activePeriod=document.querySelector('[data-op-period].is-active')?.dataset.opPeriod||'24h';
  const activeFilter=document.querySelector('[data-op-filter].is-active')?.dataset.opFilter||'all';
  renderOpportunityHeatmap(activePeriod);renderOpportunityAssets(activeFilter);setupOpportunityChart();loadOpportunityFearGreed();
  // Charge l’historique de toutes les positions avec une concurrence limitée pour
  // éviter les limites des fournisseurs. Un échec récent est retenté après 15 min
  // (ou immédiatement via le bouton « Actualiser l’analyse »).
  const historyAssets=assets.filter(opportunityHasHistorySource);
  const queue=historyAssets.filter(asset=>{
    const key=asset.id+'|1y';
    if(opportunityHistory[key]||opportunityHistoryLoading[key])return false;
    const failedAt=Number(opportunityHistoryAttempts[key])||0;
    return !failedAt||Date.now()-failedAt>=900000;
  });
  const worker=async()=>{
    while(queue.length){
      const asset=queue.shift();
      if(asset)await loadOpportunityHistory(asset.id,'1y');
    }
  };
  if(queue.length){
    Promise.allSettled(Array.from({length:Math.min(2,queue.length)},()=>worker())).then(()=>{
      renderOpportunityHeatmap(document.querySelector('[data-op-period].is-active')?.dataset.opPeriod||'24h');
      renderOpportunityAssets(document.querySelector('[data-op-filter].is-active')?.dataset.opFilter||'all');
      const select=$('opportunity-chart-asset');
      const period=document.querySelector('[data-chart-period].is-active')?.dataset.chartPeriod||'1y';
      if(select?.value)renderOpportunityChart(select.value,period);
    });
  }
}
