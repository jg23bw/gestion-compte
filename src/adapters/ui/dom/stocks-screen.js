/**
 * DOM adapter for the Actions / ETF screen. It retains legacy composition bindings
 * while the application bootstrap is progressively decoupled.
 */
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
  // Ces ETF/ETC n'ont pas d'image fiable sur la source FMP utilisée ici :
  // ne pas lancer une requête connue pour répondre 404, garder un logo typographique.
  const symbolsWithoutReliableLogo=new Set(['PUST','CSPX','IGLN','SSLV','XNAS','SUR000001737']);
  const label=symbolsWithoutReliableLogo.has(raw)?raw.slice(0,4):raw.slice(0,1);
  const palette=[['#eef2ff','#4e63cf'],['#eaf8f1','#1b8963'],['#fff3e7','#ac7128'],['#f4efff','#7053c2'],['#eef8fb','#2c7f9d']];
  let hash=0;for(const char of raw.slice(0,1))hash=(hash*31+char.charCodeAt(0))%palette.length;
  const colors=palette[hash];
  const wrapper='<span class="stock-logo asset-logo'+(extraClass?' '+extraClass:'')+'" style="background:'+colors[0]+';color:'+colors[1]+'" aria-label="'+escapeHtml(raw)+'">';
  const fallback='<span class="asset-logo-fallback stock-logo-fallback">'+escapeHtml(label)+'</span>';
  if(symbolsWithoutReliableLogo.has(raw))return wrapper+fallback+'</span>';
  const url=raw==='SU'?'https://api.elbstream.com/logos/isin/FR0000121972':'https://images.financialmodelingprep.com/symbol/'+encodeURIComponent(raw)+'.png';
  return wrapper+fallback+'<img src="'+escapeHtml(url)+'" alt="" loading="lazy" onload="if(this.previousElementSibling)this.previousElementSibling.hidden=true" onerror="if(this&&this.parentElement){this.hidden=true;this.parentElement.classList.add(&#39;logo-failed&#39;)}"></span>';
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
  return {nativePrice,rate,price:StockValuation.euroPrice(nativePrice,rate)};
}
async function stockFunction(action,payload={}){
  return stockPriceProvider.invoke(action,payload);
}
const stockPriceProvider=StockPriceProviderPort.assert(SupabaseStockPriceProvider.create({getClient:()=>cloud.client,functionName:STOCK_FUNCTION_NAME}));
const stockFxProvider=ExchangeRateProviderPort.assert(HttpExchangeRateProvider.create({endpoint:STOCK_FX_ENDPOINT}));
async function fetchStockNativePrice(priceId){
  return stockPriceProvider.getPrice(priceId);
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
    const rates=await stockFxProvider.fetchRates(currencies);
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
  const ids=[...new Set(stockHoldingCommands.findAll().filter(h=>!isManualValueHolding(h)).map(h=>h.priceId).filter(Boolean))];
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
  const currencies=[...new Set(stockHoldingCommands.findAll().map(h=>normalizeStockCurrency(h.currency)).filter(code=>code!=='EUR'))];
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
    // Un seul appel fournisseur à la fois : évite les rafales qui déclenchent des HTTP 429.
    await Promise.all([fxTask,worker()]);
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
    renderOpportunities();
    renderAccounts();
  }
}
function renderStocks(){
  if(!$('stocks-rows'))return;
  syncMarketColumnHeaders('stocks');
  syncMarketSortHeaders('stocks');
  const allHoldings=[...stockHoldingCommands.findAll()];
  const query=$('stocks-search')?.value.trim().toLocaleLowerCase('fr')||'';
  const accountFilter=$('stocks-account-filter')?.value||'all';
  const sort=$('stocks-sort')?.value||'manual';
  const metrics=new Map(allHoldings.map(h=>{
    const details=stockPriceDetails(h);
    const valuation=StockValuation.positionMetrics(h,{
      nativePrice:details.nativePrice,fxRate:details.rate,now:Date.now(),today
    });
    return [h.id,{...details,...valuation}];
  }));
  const symbolOf=holding=>String(holding.symbol||'');
  let holdings=allHoldings.filter(h=>{const account=accountById(h.accountId);if(!isInvestmentAccount(account))return false;const m=metrics.get(h.id);
    const searchable=(symbolOf(h)+' '+String(h.name||'')+' '+String(h.market||'')+' '+String(account?.name||'')).toLocaleLowerCase('fr');
    if(!searchable.includes(query))return false;
    if(accountFilter!=='all'&&h.accountId!==accountFilter)return false;
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
  holdings=sortMarketHoldings('stocks',holdings,metrics);
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
  renderMarketDailySummary('stocks',holdings,metrics);

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

  const filtered=query!==''||accountFilter!=='all';
  $('stocks-rows').innerHTML=holdings.length?holdings.map(h=>{
    const m=metrics.get(h.id);
    const account=accountById(h.accountId)||{id:'',name:'Compte supprimé',kind:'bank'};
    const market=String(h.market||stockMarketInfo(h.priceId).label);
    const nativeLabel=m.nativePrice!==null&&normalizeStockCurrency(h.currency)!=='EUR'?'<small>'+escapeHtml(nativeMoney(m.nativePrice,h.currency))+'</small>':'';
    const manual=isManualValueHolding(h);const changes=marketChangeForHolding('stocks',h);const extraColumns=marketVisibleColumns('stocks').map(id=>marketChangeCell(changes[id],id)).join('');
    return '<tr><td><div class="stock-title">'+stockLogoMarkup(h.symbol)+'<div class="stock-title-text"><strong>'+escapeHtml(h.symbol)+'</strong><small>'+escapeHtml(h.name||h.symbol)+'</small><span class="stock-meta"><span class="stock-meta-text">'+escapeHtml(account.name)+' · '+escapeHtml(market)+'</span>'+pledgeBadgeMarkup(account.id)+'</span></div></div></td><td class="table-amount">'+euro(m.invested)+'</td><td class="stock-quantity">'+(manual?'—':numberFr(m.quantity))+'</td><td class="stock-price">'+(manual?'—':m.price===null?'—':euroPrecise(m.price))+nativeLabel+'</td><td class="table-balance">'+(m.value===null?'—':euro(m.value))+'</td><td class="table-amount '+(m.gain===null?'':m.gain>0?'positive':m.gain<0?'negative':'')+'">'+(m.gain===null?'—':(m.gain>0?'+':'')+euro(m.gain))+'</td><td class="stock-performance '+(m.performance===null?'':m.performance>0?'positive':m.performance<0?'negative':'')+'">'+(m.performance===null?'—':formatSignedPercent(m.performance))+'</td>'+extraColumns+'<td><div class="row-actions"><button type="button" data-edit-stock="'+escapeHtml(h.id)+'">Modifier</button><button type="button" data-delete-stock="'+escapeHtml(h.id)+'">Supprimer</button></div></td></tr>';
  }).join(''):'<tr><td colspan="'+(8+marketVisibleColumns('stocks').length)+'"><div class="empty-state">'+(filtered?'Aucune position ne correspond aux filtres.':'Aucune position actions ou ETF. Cliquez sur « Ajouter une action » pour commencer.')+'</div></td></tr>';

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
function updateStockValueOnlyFields(){const manual=isManualValueHolding({isin:$('stock-edit-isin')?.value,priceId:$('stock-edit-priceid')?.value});const input=$('stock-edit-quantity');const label=input?.closest('label');if(label)label.hidden=manual;if(input){input.required=!manual;input.disabled=manual;input.value=manual?'1':input.value;}const priceFields=$('stock-edit-currency')?.closest('.form-row');if(priceFields)priceFields.hidden=manual;const amountLabel=$('stock-invested-label');if(amountLabel)amountLabel.textContent=manual?'Montant détenu (€)':'Investi (€)';const help=$('stock-value-help');if(help)help.textContent=manual?'Saisissez le montant actuellement détenu. La valeur projetée évolue automatiquement au taux annuel indicatif de 2,10 % (taux 2025 publié pour Suravenir Rendement 2), à compter de la saisie.':'La valeur actuelle est calculée en euros à partir du dernier cours disponible et du taux de change de référence. Les cours peuvent être différés.';}
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
  const holding=id?stockHoldingCommands.findAll().find(h=>h.id===id):null;
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
  const holding=stockHoldingCommands.findAll().find(h=>h.id===id);
  if(!holding)return;
  if(!window.confirm('Supprimer la position « '+holding.symbol+' » ? Les totaux seront recalculés.'))return;
  prepareUndo();
  cloud.stockHoldingsDirty=true;
  stockHoldingCommands.delete(id);
  renderAll();
  showToast('Position actions supprimée.',true);
}
