/**
 * DOM event wiring and browser startup. Called by app.js after composition bindings
 * and screen adapters are available.
 */
function initializeDomEventHandlers() {
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
}
