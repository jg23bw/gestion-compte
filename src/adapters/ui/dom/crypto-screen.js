/**
 * DOM adapter for the Crypto screen. It keeps the existing screen behavior while
 * the composition layer is being migrated to explicit dependency injection.
 */
function cryptoPrice(holding){
  const value=Number(cryptoPrices.values[holding.coingeckoId]);
  return Number.isFinite(value)&&value>0?value:null;
}
function cryptoImage(holding){
  const value=cryptoPrices.images?.[holding.coingeckoId];
  return typeof value==='string'?value:'';
}
function cryptoLogoMarkup(image,symbol,extraClass=''){
  const initials=escapeHtml(String(symbol||'?').slice(0,3).toUpperCase());
  return '<span class="crypto-logo asset-logo'+(extraClass?' '+extraClass:'')+'" aria-label="'+initials+'"><span class="asset-logo-fallback">'+initials+'</span>'+(image?'<img src="'+escapeHtml(image)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onload="if(this.previousElementSibling)this.previousElementSibling.hidden=true" onerror="if(this&&this.parentElement){this.hidden=true;this.parentElement.classList.add(\'logo-failed\')}">':'')+'</span>';
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
      cryptoPrices.market=saved.market&&typeof saved.market==='object'?saved.market:{};
      cryptoPrices.history=saved.history&&typeof saved.history==='object'?saved.history:{};
      cryptoPrices.updatedAt=Number(saved.updatedAt)||0;
    }
  }catch(error){console.warn('Cache des prix crypto illisible',error);}
}
async function loadCryptoPrices(){
  const holdings=(state.cryptoHoldings||[]).filter(h=>h.coingeckoId);
  const ids=[...new Set(holdings.map(h=>h.coingeckoId))];
  const symbols={};
  holdings.forEach(h=>{const symbol=String(h.symbol||'').trim().toUpperCase();if(symbol&&!symbols[h.coingeckoId])symbols[h.coingeckoId]=symbol;});
  if(!ids.length){renderCrypto();return;}
  if(cryptoPrices.loading)return;
  cryptoPrices.loading=true;
  cryptoPrices.error='';
  renderCrypto();
  try{
    let values={},images={},sourceError='',fallbackUsed=false;
    try{
      const payload=await stockFunction('crypto-market',{ids,symbols});
      const data=Array.isArray(payload?.data)?payload.data:[];
      for(const coin of data){
        if(!coin?.id)continue;
        const price=Number(coin.current_price);
        if(Number.isFinite(price)&&price>0)values[coin.id]=price;
        if(typeof coin.image==='string'&&coin.image)images[coin.id]=coin.image;
        if(coin.source==='coinbase')fallbackUsed=true;
        const reported={day:coin.price_change_percentage_24h===null?undefined:Number(coin.price_change_percentage_24h),week:coin.price_change_percentage_7d_in_currency===null?undefined:Number(coin.price_change_percentage_7d_in_currency),month:coin.price_change_percentage_30d_in_currency===null?undefined:Number(coin.price_change_percentage_30d_in_currency)};
        const marketChanges=Object.fromEntries(Object.entries(reported).filter(([,value])=>Number.isFinite(value)));
        // Un prix de repli n’a pas de variations : on conserve celles déjà connues
        // au lieu de les effacer.
        if(Object.keys(marketChanges).length)cryptoPrices.market[coin.id]={...(cryptoPrices.market[coin.id]||{}),...marketChanges};
      }
      if(!Object.keys(values).length)throw new Error('aucun prix reçu de CoinGecko');
    }catch(error){sourceError=error.message||'CoinGecko indisponible';}
    // Pas d'appel direct à CoinCap depuis le navigateur : les prix de secours
    // sont déjà agrégés côté Edge (Coinbase). En cas d'indisponibilité, on conserve
    // le cache local au lieu de multiplier les requêtes vers un second fournisseur.
    if(!Object.keys(values).length)throw new Error(/load failed|failed to fetch|networkerror/i.test(sourceError)?'connexion aux fournisseurs de prix impossible. Vérifiez le réseau puis réessayez.':sourceError||'aucun prix reçu');
    const unresolved=ids.filter(id=>!Number.isFinite(Number(values[id]))||Number(values[id])<=0);
    if(unresolved.length)console.warn('Prix crypto manquants pour certains actifs :',unresolved);
    cryptoPrices.values={...cryptoPrices.values,...values};
    cryptoPrices.images={...cryptoPrices.images,...images};
    cryptoPrices.updatedAt=Date.now();
    try{localStorage.setItem(CRYPTO_PRICE_CACHE_KEY,JSON.stringify({values:cryptoPrices.values,images:cryptoPrices.images,market:cryptoPrices.market,history:cryptoPrices.history,updatedAt:cryptoPrices.updatedAt}));}catch(error){}
  }catch(error){
    console.error('Crypto price fetch failed',error);
    cryptoPrices.error=error.message||'prix indisponible';
  }finally{
    cryptoPrices.loading=false;
    renderCrypto();
    renderDashboard();
    renderOpportunities();
  }
}
function renderCrypto(){
  if(!$('crypto-rows'))return;
  syncMarketColumnHeaders('crypto');
  syncMarketSortHeaders('crypto');
  const allHoldings=[...(state.cryptoHoldings||[])];
  const query=$('crypto-search')?.value.trim().toLocaleLowerCase('fr')||'';
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
  holdings=sortMarketHoldings('crypto',holdings,metrics);
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
  renderMarketDailySummary('crypto',holdings,metrics);

  const priceStatus=$('crypto-price-status');
  if(priceStatus){
    if(cryptoPrices.loading){priceStatus.textContent='Actualisation des prix…';priceStatus.classList.remove('is-error');}
    else if(cryptoPrices.error){priceStatus.textContent='Prix indisponible : '+cryptoPrices.error;priceStatus.classList.add('is-error');}
    else if(cryptoPrices.updatedAt){priceStatus.textContent='Prix actualisés à '+cryptoTimeLabel(cryptoPrices.updatedAt)+' · source CoinGecko';priceStatus.classList.remove('is-error');}
    else{priceStatus.textContent='Prix pas encore chargés.';priceStatus.classList.remove('is-error');}
  }
  const migration=$('crypto-migration');
  if(migration)migration.hidden=cryptoTableReady!==false;

  const filtered=query!=='';
  $('crypto-rows').innerHTML=holdings.length?holdings.map(h=>{
    const m=metrics.get(h.id);
    const changes=marketChangeForHolding('crypto',h);const extraColumns=marketVisibleColumns('crypto').map(id=>marketChangeCell(changes[id],id)).join('');
    return '<tr><td><div class="crypto-coin">'+cryptoLogoMarkup(cryptoImage(h),h.symbol)+'<div class="crypto-coin-text"><strong>'+escapeHtml(h.symbol)+'</strong><small>'+escapeHtml(h.name||h.symbol)+'</small></div></div></td><td class="table-amount">'+euro(m.invested)+'</td><td class="crypto-quantity">'+numberFr(m.quantity)+'</td><td class="crypto-price">'+(m.price===null?'—':euroPrecise(m.price))+'</td><td class="table-balance">'+(m.value===null?'—':euro(m.value))+'</td><td class="table-amount '+(m.gain===null?'':m.gain>0?'positive':m.gain<0?'negative':'')+'">'+(m.gain===null?'—':(m.gain>0?'+':'')+euro(m.gain))+'</td><td class="crypto-performance '+(m.performance===null?'':m.performance>0?'positive':m.performance<0?'negative':'')+'">'+(m.performance===null?'—':formatSignedPercent(m.performance))+'</td>'+extraColumns+'<td><div class="row-actions"><button type="button" data-edit-crypto="'+escapeHtml(h.id)+'">Modifier</button><button type="button" data-delete-crypto="'+escapeHtml(h.id)+'">Supprimer</button></div></td></tr>';
  }).join(''):'<tr><td colspan="'+(8+marketVisibleColumns('crypto').length)+'"><div class="empty-state">'+(filtered?'Aucune position ne correspond aux filtres.':'Aucune position crypto. Cliquez sur « Ajouter une position » pour commencer.')+'</div></td></tr>';

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
    const coins=await coinGeckoCatalogProvider.searchCoins(query,{signal:controller.signal});
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

