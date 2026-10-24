+'<line x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(top+plotH)+'" class="fire-graph-axis"/><line x1="'+left+'" y1="'+(top+plotH)+'" x2="'+(chartWidth-right)+'" y2="'+(top+plotH)+'" class="fire-graph-axis"/><polyline points="'+nominalPoints+'" class="fire-graph-nominal"/><polyline points="'+realPoints+'" class="fire-graph-real"/>'+(focusAge<endAge?'<polyline points="'+nominalFuturePoints+'" class="fire-graph-nominal fire-graph-future"/><polyline points="'+realFuturePoints+'" class="fire-graph-real fire-graph-future"/><line x1="'+focusEndX.toFixed(1)+'" y1="'+top+'" x2="'+focusEndX.toFixed(1)+'" y2="'+(top+plotH)+'" class="fire-graph-focus-divider"/>':'')+'<line x1="'+(chartWidth-right)+'" y1="'+top+'" x2="'+(chartWidth-right)+'" y2="'+(top+plotH)+'" class="fire-graph-end-marker"/>'+xLabels+hitPoints+'<line x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(top+plotH)+'" class="fire-graph-axis"/><line x1="'+left+'" y1="'+(top+plotH)+'" x2="'+(chartWidth-right)+'" y2="'+(top+plotH)+'" class="fire-graph-axis"/><polyline points="'+nominalPoints+'" class="fire-graph-nominal"/><polyline points="'+realPoints+'" class="fire-graph-real"/>'+xLabels+hitPoints+'<line id="fire-crosshair" x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(top+plotH)+'" class="fire-graph-crosshair" visibility="hidden"/><circle id="fire-hover-dot" cx="'+left+'" cy="'+top+'" r="6" class="fire-graph-hover-dot" visibility="hidden"/></svg><div id="fire-graph-tooltip" class="fire-graph-tooltip" role="status" hidden></div></div><div class="fire-year-list">'+series.map(p=>{
   const retired=p.phase==='Retraits';
   const rentAtDate=p.passiveIncome??passiveIncome;
   const detail=retired?'<div class="fire-monthly-net"><span>Revenu net disponible par mois</span><strong>'+euro(p.net/12+rentAtDate)+'</strong><div class="fire-monthly-breakdown"><span>Du capital (après impôts)</span><b>'+euro(p.net/12)+'</b><span>Des loyers nets</span><b>'+euro(rentAtDate)+'</b></div></div><p class="fire-year-detail">Retrait brut : '+euro(p.gross)+'/an · impôts estimés : '+euro(p.tax)+'/an · revenu financier net : '+euro(p.net)+'/an</p>':'<p class="fire-year-detail">Épargne mensuelle : '+euro(saving)+'</p>';
   return '<article class="fire-year-row '+(retired?'fire-year-retirement':'fire-year-accumulation')+'"><div class="fire-year-heading"><div><strong>'+p.age+' ans</strong><small>'+(retired?'Retraite':'Accumulation')+'</small></div><div class="fire-year-capital"><strong>'+euro(p.value)+'</strong><small>'+euro(p.real)+' en euros constants</small></div></div>'+detail+'</article>';
 }).join('')+'</div><p class="projection-outcome">'+(exhaustedAge!==null?'Capital épuisé vers '+exhaustedAge+' ans.':'Capital restant à '+endAge+' ans : '+euro(series[series.length-1].value)+' ('+euro(series[series.length-1].real)+' en euros constants).')+'</p>';
 const graphSvg=$('fire-chart').querySelector('.fire-graph');
 const graphWrap=$('fire-chart').querySelector('.fire-graph-wrap');
 const graphTip=$('fire-graph-tooltip');
 const crosshair=$('fire-crosshair');
 const hoverDot=$('fire-hover-dot');
 const showGraphPoint=(index)=>{
   const p=series[index];if(!p)return;
   const x=xAt(index),y=yAt(p.value);
   crosshair.setAttribute('x1',x);crosshair.setAttribute('x2',x);crosshair.setAttribute('visibility','visible');
   hoverDot.setAttribute('cx',x);hoverDot.setAttribute('cy',y);hoverDot.setAttribute('visibility','visible');
   graphTip.innerHTML='<strong>'+p.age+' ans · '+(p.phase==='Retraits'?'Retraite':'Accumulation')+'</strong><div>Patrimoine nominal : <b>'+euro(p.value)+'</b></div><div>Patrimoine réel : <b>'+euro(p.real)+'</b></div>'+(p.phase==='Retraits'?'<hr><div>Retrait brut annuel : <b>'+euro(p.gross)+'</b></div><div>Impôts estimés : <b>'+euro(p.tax)+'</b></div><div>Revenu net annuel : <b>'+euro(p.net)+'</b></div><div class="tooltip-monthly"><div><span>Capital net par mois</span><b>'+euro(p.net/12)+'</b></div><div><span>Loyers nets par mois</span><b>'+euro(p.passiveIncome??passiveIncome)+'</b></div><hr><div><strong>Total net disponible par mois</strong><b>'+euro(p.net/12+(p.passiveIncome??passiveIncome))+'</b></div></div>':'<div>Épargne mensuelle : <b>'+euro(saving)+'</b></div>');
   graphTip.hidden=false;
   const rect=graphWrap.getBoundingClientRect();
   const svgRect=graphSvg.getBoundingClientRect();
   const px=svgRect.left-rect.left+x/chartWidth*svgRect.width;
   const py=svgRect.top-rect.top+y/chartHeight*svgRect.height;
   graphTip.style.left=Math.max(8,Math.min(rect.width-graphTip.offsetWidth-8,px-graphTip.offsetWidth/2))+'px';
   // Place le tooltip au-dessus du point survolé, en gardant une marge dans le graphique.
   // Si le point est trop haut, le tooltip reste au bord supérieur plutôt que de sortir du conteneur.
   graphTip.style.top=Math.max(8,py-graphTip.offsetHeight-16)+'px';
 };
 graphSvg.querySelectorAll('.fire-graph-hit').forEach(el=>{
   const show=()=>showGraphPoint(Number(el.dataset.index));
   el.addEventListener('mouseenter',show);el.addEventListener('focus',show);
   el.addEventListener('click',show);
   el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});
 });
 graphSvg.addEventListener('mouseleave',()=>{if(!graphSvg.querySelector('.fire-graph-hit:focus')){graphTip.hidden=true;crosshair.setAttribute('visibility','hidden');hoverDot.setAttribute('visibility','hidden');}});
 // Scénarios déterministes : prudent, central, favorable et choc boursier au départ de la retraite.
 const scenarios=[{name:'Prudent',rate:Math.max(-0.02,rate-0.03)},{name:'Central',rate},{name:'Favorable',rate:rate+0.02},{name:'Choc initial −20 %',rate,crash:true}];
 const runFireScenario=(sc,horizonAge)=>{
   let b=current,ageFire=current>=target?currentAge:null,fireBal=current>=target?current:null,startMonth=ageFire===null?null:0,drained=null;
   const months=Math.max(0,Math.round((horizonAge-currentAge)*12)),mr=Math.pow(Math.max(0.000001,1+sc.rate),1/12)-1;
   for(let m=1;m<=months;m++){
     if(ageFire===null){b=b*(1+mr)+saving;const inflationFactor=Math.pow(1+inflation,m/12);const targetIncome=desiredIncome*inflationFactor;const rentIncome=passiveIncome*inflationFactor;if(b*withdrawal/12*netFactor+rentIncome>=targetIncome){ageFire=currentAge+m/12;fireBal=b;startMonth=m;}}
     else{if(sc.crash&&m===(startMonth??0)+1)b*=0.8;b=Math.max(0,b*(1+mr));const retiredMonths=Math.max(0,m-(startMonth??0)-1);const planned=financialNeed>0?(fireBal||0)*withdrawal/12*Math.pow(1+inflation,retiredMonths/12):0;const actual=Math.min(b,planned);b=Math.max(0,b-actual);if(planned>0&&b<=0&&drained===null)drained=currentAge+m/12;}
   }
   return {balance:b,ageFire,drained};
 };
 const scenarioResults=scenarios.map(sc=>({...sc,result:runFireScenario(sc,endAge)}));
 const scenarioRows=scenarioResults.map(({name,rate:scenarioRate,result})=>'<tr><td>'+name+' ('+(scenarioRate*100).toFixed(1)+' %)</td><td>'+(result.ageFire===null?'Non atteint':result.ageFire.toFixed(1)+' ans')+'</td><td>'+(result.drained===null?'Non épuisé avant '+endAge:result.drained.toFixed(1)+' ans')+'</td><td>'+euro(result.balance)+'</td><td>'+euro(result.balance/Math.pow(1+inflation,endAge-currentAge))+'</td></tr>').join('');
 const milestoneRows=[80,90,95].filter(age=>age>currentAge&&age<=endAge).map(milestone=>'<tr><td>'+milestone+' ans</td>'+scenarios.map(sc=>{const result=runFireScenario(sc,milestone);return '<td>'+euro(result.balance)+'</td><td>'+euro(result.balance/Math.pow(1+inflation,milestone-currentAge))+'</td>';}).join('')+'</tr>').join('');
 const scenarioEl=$('fire-scenarios');if(scenarioEl)scenarioEl.innerHTML='<table class="fire-scenario-table"><thead><tr><th>Scénario</th><th>Âge FIRE</th><th>Épuisement</th><th>Capital final nominal</th><th>Capital final réel</th></tr></thead><tbody>'+scenarioRows+'</tbody></table><h3 class="fire-milestones-title">Capital restant à 80, 90 et 95 ans</h3><table class="fire-scenario-table"><thead><tr><th>Âge</th>'+scenarios.map(sc=>'<th>'+sc.name+' nominal</th><th>'+sc.name+' réel</th>').join('')+'</tr></thead><tbody>'+milestoneRows+'</tbody></table><p class="fire-year-detail">Le scénario « Choc initial » applique une baisse ponctuelle de 20 % au premier mois de retraite. Les autres scénarios conservent un rendement annuel constant ; aucun scénario déterministe ne garantit le résultat réel.</p>';
 $('fire-real-return').textContent=(realAnnualRate*100).toFixed(2)+' %';
 $('fire-net-need').textContent=euro(financialNeed);

 const taxRegime=$('fire-tax-regime'),customLabel=$('fire-custom-tax-label');
 if(taxRegime&&customLabel)customLabel.hidden=taxRegime.value!=='custom';
 const btc=Number($('lombard-btc-price')?.value)||0,fx=Number($('lombard-fx')?.value)||1,principal=Number($('lombard-principal')?.value)||0,repaid=Number($('lombard-repaid')?.value)||0;
 const remaining=Math.max(0,principal-repaid),loanBtc=60000/(70100/fx),personalBtc=69800/(85100/fx),loanValue=loanBtc*btc/fx,personalValue=personalBtc*btc/fx;
 const loanGain=loanValue-60000,personalGain=personalValue-69800;
 $('lombard-remaining').textContent=euro(remaining);$('lombard-loan-btc').textContent=loanBtc.toFixed(6)+' BTC';$('lombard-loan-value').textContent=euro(loanValue);$('lombard-personal-value').textContent=euro(personalValue);
 $('lombard-loan-gain').textContent=(loanGain>=0?'+':'')+euro(loanGain);$('lombard-loan-detail').textContent='Coût d’achat : 60 000 € · valeur estimée : '+euro(loanValue)+'.';
 $('lombard-personal-gain').textContent=(personalGain>=0?'+':'')+euro(personalGain);$('lombard-personal-detail').textContent='Coût d’achat : 69 800 € · valeur estimée : '+euro(personalValue)+'.';
 const totalBtcValue=loanValue+personalValue;const netAfterSale=totalBtcValue-remaining;
 $('lombard-scenarios').innerHTML=[{label:'Aucun BTC vendu',v:0},{label:'Vente de 25 % des BTC',v:totalBtcValue*.25},{label:'Vente de 50 % des BTC',v:totalBtcValue*.5},{label:'Vente de 100 % des BTC',v:totalBtcValue}].map(x=>'<div><span>'+x.label+'</span><strong>'+euro(x.v)+'</strong><small>Après remboursement de la dette : '+(x.v>=remaining?euro(x.v-remaining):'reste '+euro(remaining-x.v)+' de dette')+'</small></div>').join('');
}

function navigate(view){
  document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id===view+'-view'));
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
  $('breadcrumb-current').textContent=({dashboard:"Vue d'ensemble",accounts:'Mes comptes',transactions:'Opérations',history:'Historique mensuel',crypto:'Crypto',stocks:'Actions',recurring:'Récurrences',fire:'FIRE',comparisons:'Comparaisons',lombard:'Lombard'})[view]||view;
  if(['dashboard','fire','comparisons','lombard'].includes(view))renderWealthViews();
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
['fire-age','fire-end-age','fire-rent','fire-passive-income','fire-withdrawal','fire-saving','fire-return','fire-inflation','fire-gain-share','fire-custom-tax'].forEach(id=>{
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
   const record={...(existing||{}),id:id||crypto.randomUUID(),accountId,priceId,isin,symbol,name,market,currency,invested,quantity,manualValue,manualValueDate:manualValue?(existing?.manualValue&&Number(existing.invested)===invested?(existing.manualValueDate||today()):today()):undefined,sortOrder:existing?.sortOrder??Math.max(0,...(state.stockHoldings||[]).map(h=>Number(h.sortOrder)||0))+1};
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
