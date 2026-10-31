/**
 * DOM adapters for account, operations, monthly history and recurring screens.
 * These functions still consume the legacy bootstrap bindings during migration.
 */
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
  renderWealthViews();
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
  const accounts=AccountListRules.filterAndSort({
    accounts:state.accounts,query,kind,sort,
    effectiveType:effectiveAccountType,kindLabel,
    bankName:account=>bankByKey(bankKeyForAccount(account)).name,
    balance:accountOverviewBalance
  });
  $('all-accounts').innerHTML=accounts.length?accounts.map(a=>accountMarkup(a)).join(''):'<div class="empty-state">Aucun compte ne correspond aux filtres.</div>';
  const pledgedVisible=accounts.filter(a=>accountPledgeFor(a.id)).length;
  $('accounts-total-label').textContent=accounts.length+' / '+state.accounts.length+' comptes'+(pledgedVisible?' · '+pledgedVisible+' nanti'+(pledgedVisible>1?'s':''):'');
}
function isOperationalAccount(account){return !['av','pea','cto'].includes(effectiveAccountType(account));}
function fillAccountSelects(){
  const accountGroups=AccountListRules.selectGroups(state.accounts,{effectiveType:effectiveAccountType});
  const operationalAccounts=accountGroups.operational;
  const opts=operationalAccounts.map(a=>'<option value="'+a.id+'">'+escapeHtml(a.name)+'</option>').join('');
  const allOpts=state.accounts.map(a=>'<option value="'+a.id+'">'+escapeHtml(a.name)+'</option>').join('');
  $('transaction-account').innerHTML=opts;
  const personalAccounts=accountGroups.personal,personalOpts=personalAccounts.map(a=>'<option value="'+a.id+'">'+escapeHtml(a.name)+'</option>').join('');
  const current=$('transaction-account-filter').value;
  $('transaction-account-filter').innerHTML=personalOpts;
  $('transaction-account-filter').value=personalAccounts.some(a=>a.id===current)?current:(personalAccounts[0]?.id||'');
  const proAccounts=accountGroups.professional,proOpts=proAccounts.map(a=>'<option value="'+a.id+'">'+escapeHtml(a.name)+'</option>').join('');
  const proFilter=$('pro-transaction-account-filter');
  if(proFilter){const selected=proFilter.value;proFilter.innerHTML=proOpts;proFilter.value=proAccounts.some(a=>a.id===selected)?selected:(proAccounts[0]?.id||'');}
  for(const id of ['history-account-filter','recurring-account-filter']){
    const filter=$(id); if(!filter) continue;
    const selected=filter.value;
    filter.innerHTML='<option value="all">Tous les comptes</option>'+opts;
    filter.value=selected==='all'||operationalAccounts.some(a=>a.id===selected)?selected:'all';
  }
  const stockFilter=$('stocks-account-filter');
  if(stockFilter){
    const selected=stockFilter.value;
    const investmentOpts=accountGroups.investment.map(a=>'<option value="'+a.id+'">'+escapeHtml(a.name)+'</option>').join('');
    stockFilter.innerHTML='<option value="all">Tous les comptes d’investissement</option>'+investmentOpts;
    stockFilter.value=selected==='all'||accountGroups.investment.some(a=>a.id===selected)?selected:'all';
  }
}
function renderTransactions(){
  const proView=$('pro-view')?.classList.contains('active')===true,prefix=proView?'pro-transaction-':'transaction-';
  const accountFilter=$(prefix+'account-filter').value,typeFilter=$(prefix+'type-filter').value,query=$(prefix+'search').value.trim().toLocaleLowerCase('fr'),sort=$(prefix+'sort')?.value||'date-asc';
  const account=accountById(accountFilter),isPro=account&&effectiveAccountType(account)==='pro',asOf=today(),currentBalance=balanceAt(accountFilter,asOf);
  const displayRows=transactionQueries.accountTransactionDisplayRows({accountId:accountFilter,typeFilter,query,sort});
  const head=$(prefix+'head'),rows=$(prefix+'rows'),footer=$(prefix+'footer');
  head.innerHTML='<tr><th>ORDRE</th><th>POINTÉE</th><th>DATE</th><th>OPÉRATION</th>'+(isPro?'':'<th>COMPTE</th>')+'<th>MONTANT</th><th>SOLDE À DATE</th>'+(isPro?'<th>MONTANT (AVEC TVA ET CHARGES SOCIALES)</th><th>SOLDE À DATE (AVEC TVA ET CHARGES SOCIALES)</th>':'')+'<th>ACTIONS</th></tr>';
  const balanceRow=account?'<tr class="transaction-current-balance"><td colspan="'+(isPro?4:5)+'"><strong>Solde à date</strong><span class="balance-date">Au '+dateFormat(asOf)+'</span></td><td class="table-amount">—</td><td class="table-balance"><strong>'+euro(currentBalance)+'</strong></td>'+(isPro?'<td>—</td><td class="table-balance"><strong>'+euro(proAdjustedBalanceAt(account,asOf))+'</strong></td>':'')+'<td>—</td></tr>':'';
  rows.innerHTML=balanceRow+(displayRows.length?displayRows.map(({transaction:t,balance,position,accountTransactionCount})=>{
    const a=accountById(t.accountId)||{name:'Compte supprimé',short:'?',kind:'bank'};
    const recurringKind=isPro?proRecurringKind(t):null,actualAmount=recurringKind?0:Number(t.amount),adjusted=isPro?proAdjustedAmount(t):0;
    return '<tr class="'+(t.isPaid?'transaction-paid':'')+'"><td class="order-actions"><button type="button" data-move-transaction="'+t.id+'" data-direction="-1" '+(position<=0?'disabled':'')+' aria-label="Monter cette opération" title="Monter">↑</button><button type="button" data-move-transaction="'+t.id+'" data-direction="1" '+(position===accountTransactionCount-1?'disabled':'')+' aria-label="Descendre cette opération" title="Descendre">↓</button></td><td><label class="paid-check"><input type="checkbox" data-toggle-paid="'+t.id+'" '+(t.isPaid?'checked':'')+' aria-label="Marquer '+escapeHtml(t.label)+' comme débitée ou pointée"><span>'+(t.isPaid?'Pointée':'À pointer')+'</span></label></td><td>'+dateFormat(t.date)+'</td><td class="transaction-label">'+escapeHtml(t.label)+'</td>'+(isPro?'':'<td><div class="table-account">'+bankLogo(a)+'<span>'+escapeHtml(a.name)+'</span></div></td>')+'<td class="table-amount '+(actualAmount>=0?'positive':'negative')+'">'+(actualAmount>0?'+':'')+euro(actualAmount)+'</td><td class="table-balance">'+euro(balance)+'</td>'+(isPro?'<td class="table-amount '+(recurringKind?'negative':(adjusted>=0?'positive':'negative'))+'">'+(!recurringKind&&adjusted>0?'+':'')+euro(adjusted)+'</td><td class="table-balance">'+euro(proAdjustedBalanceAt(a,t.date))+'</td>':'')+'<td><div class="row-actions"><button data-edit-transaction="'+t.id+'">Modifier</button><button data-delete-transaction="'+t.id+'">Supprimer</button></div></td></tr>';
  }).join(''):'<tr><td colspan="'+(isPro?9:8)+'"><div class="empty-state">Aucune opération trouvée. Ajoutez une opération pour la voir ici.</div></td></tr>');
  footer.textContent=displayRows.length+' opération(s) affichée(s) · Le solde à date exclut les opérations datées après aujourd’hui.';
}
function renderMonthlyHistory(){
  if(!$('history-rows'))return;
  const monthSelect=$('history-month');
  const availableMonths=[...new Set((state.transactions||[]).map(t=>String(t.date||'').slice(0,7)).filter(m=>/^\d{4}-\d{2}$/.test(m)))].sort((a,b)=>b.localeCompare(a));
  const previousMonth=monthSelect.value;
  monthSelect.innerHTML=availableMonths.length?availableMonths.map(m=>'<option value="'+m+'">'+escapeHtml(monthName(m))+'</option>').join(''):'<option value="">Aucun mois disponible</option>';
  monthSelect.disabled=!availableMonths.length;
  const selectedMonth=availableMonths.includes(previousMonth)?previousMonth:(availableMonths.includes(monthValueNow())?monthValueNow():(availableMonths[0]||''));
  monthSelect.value=selectedMonth;
  const month=selectedMonth,accountFilter=$('history-account-filter').value||'all',typeFilter=$('history-type-filter').value||'all',query=$('history-search').value.trim().toLocaleLowerCase('fr'),sort=$('history-sort').value||'date-asc';
  const history=transactionQueries.monthlyHistory({month,accountFilter,typeFilter,query,sort});
  const {rows,incoming,outgoing}=history;
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
    return '<tr><td><input class="recurring-enabled" type="checkbox" data-recurring-enabled="'+escapeHtml(t.id)+'" '+(t.enabled?'checked':'')+' aria-label="Activer '+escapeHtml(t.label)+'"></td><td><div class="recurring-account-cell">'+bankLogo(a)+'<span>'+escapeHtml(a.name)+'</span></div></td><td><div>'+escapeHtml(recurringFrequencyLabel(t))+'</div>'+(t.frequency==='once'?'':'<label class="recurring-day-label">Jour <input class="recurring-day" type="number" min="1" max="31" step="1" data-recurring-day="'+escapeHtml(t.id)+'" value="'+Number(t.day||1)+'" aria-label="Jour du mois"></label>')+'</td><td><input class="recurring-label" type="text" data-recurring-label="'+escapeHtml(t.id)+'" value="'+escapeHtml(t.label)+'" aria-label="Libellé"></td><td><input class="recurring-amount" type="text" inputmode="decimal" autocomplete="off" data-recurring-amount="'+escapeHtml(t.id)+'" value="'+escapeHtml(value)+'" placeholder="À renseigner" aria-label="Montant"></td><td class="recurring-actions"><button type="button" class="secondary-button" data-edit-recurring="'+escapeHtml(t.id)+'">Modifier</button><button type="button" class="secondary-button danger-button" data-delete-recurring="'+escapeHtml(t.id)+'">Supprimer</button></td></tr>';
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
  $('recurring-edit-once-date').value=dateInputFormat(template?.date||today());
  $('recurring-edit-enabled').checked=template?template.enabled!==false:true;
  const selectedMonths=template?.months?.length?template.months:(template?.frequency==='quarterly'?[1,4,7,10]:[Number((template?.date||today()).slice(5,7))||1]);
  document.querySelectorAll('[name="recurring-month-option"]').forEach(input=>{input.checked=selectedMonths.includes(Number(input.value));});
  $('recurring-modal-title').textContent=template?'Modifier une récurrence':'Nouvelle récurrence';
  updateRecurringEditorFields();
  $('recurring-dialog').showModal();
}
function deleteRecurringTemplate(id){
  const template=recurringTemplateCommands.findById(id);
  if(!template)return;
  if(!window.confirm('Supprimer la récurrence « '+template.label+' » ? Les opérations déjà générées resteront dans l’historique.'))return;
  prepareUndo();
  if(cloud.user)cloud.pendingTemplateDeletes.add(template.id);
  recurringTemplateCommands.remove(id);
  renderAll();
  showToast('Récurrence supprimée. Les opérations déjà créées sont conservées.',true);
}
function dueDateForTemplate(template,month){return RecurringRules.dueDateForTemplate(template,month);}
function generatedMonths(){return generatedMonthsRepository.list();}
function monthAlreadyGenerated(month){
  return RecurringCommands.inspectMonth({
    transactions:state.transactions, month, generatedMonthsRepository
  }).status==='already-generated';
}
function generateRecurringForMonth(month){
  if(!/^\d{4}-\d{2}$/.test(month)){showToast('Choisissez un mois valide.');return;}
  if(generationInProgress.has(month))return;
  const result=RecurringCommands.prepareGeneration({
    templates:state.recurringTemplates||[], transactions:state.transactions,
    month, generatedMonthsRepository
  });
  if(result.status==='already-generated'){
    const message='Erreur : les opérations de '+monthName(month)+' ont déjà été générées. La génération est bloquée pour éviter les doublons.';
    if($('recurring-summary'))$('recurring-summary').textContent=message;
    showToast(message);renderRecurring();return;
  }
  if(result.status==='invalid-month'){showToast('Choisissez un mois valide.');return;}
  generationInProgress.add(month);
  const button=$('recurring-add-month');if(button)button.disabled=true;
  if(result.status==='no-additions'){
    generationInProgress.delete(month);
    if(button)button.disabled=false;
    const message='Aucune nouvelle opération à ajouter pour '+monthName(month)+'. Vérifiez les montants et les fréquences.';
    if($('recurring-summary'))$('recurring-summary').textContent=message;showToast(message);renderRecurring();return;
  }
  const additions=result.additions;
  RecurringCommands.commitGeneration({
    additions, transactions:state.transactions, month, generatedMonthsRepository,
    beforeMutation:prepareUndo
  });
  generationInProgress.delete(month);
  renderAll();
  const message=additions.length+' opération(s) ajoutée(s) pour '+monthName(month)+'. Cette génération est maintenant verrouillée.';
  if($('recurring-summary'))$('recurring-summary').textContent=message+' Les doublons ne pourront pas être générés une seconde fois.';
  showToast(message,true);
}

/* --- Positions actions et ETF --- */
