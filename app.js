const STORAGE_KEY = 'gestion-comptes-v1';
const DEFAULT_ACCOUNTS = [
  {id:'lbp',name:'La Banque Postale',short:'LB',kind:'bank',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'fortuneo',name:'Fortuneo',short:'F',kind:'bank',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'fortuneo-plus',name:'Fortuneo livret Plus',short:'F+',kind:'savings',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'cic-montpont',name:'CIC Montpont-Ménestrol',short:'CIC',kind:'bank',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'cic-montevrayn',name:'CIC Montévrayn',short:'CIC',kind:'bank',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'bourso',name:'Boursobank',short:'B',kind:'bank',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'bourso-plus',name:'Livret Boursobank Boursoplus',short:'B+',kind:'savings',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'bourso-first',name:'Livret Boursobank BoursoFirst',short:'BF',kind:'savings',opening:0,vatRate:20,socialRate:45,netOpening:0},
  {id:'tiime',name:'Compte professionnel Tiime',short:'T',kind:'pro',opening:0,vatRate:20,socialRate:45,netOpening:0}
];
const $ = id => document.getElementById(id);
const euro = value => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(value)||0);
const dateFormat = value => { if(!value)return '—'; const d=new Date(value+'T12:00:00'); return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short',year:'numeric'}).format(d); };
const today = () => new Date().toLocaleDateString('en-CA');
let state = loadState();
let toastTimer;
function loadState(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && Array.isArray(saved.accounts) && Array.isArray(saved.transactions)){
      const accounts=saved.accounts.map(a=>({...a,...(DEFAULT_ACCOUNTS.find(d=>d.id===a.id)||{}) ,...a}));
      DEFAULT_ACCOUNTS.forEach(d=>{if(!accounts.some(a=>a.id===d.id))accounts.push({...d});});
      return {accounts,transactions:saved.transactions};
    }
  }catch(e){console.warn('Données locales illisibles',e);}
  return {accounts:DEFAULT_ACCOUNTS.map(a=>({...a})),transactions:[]};
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function accountById(id){return state.accounts.find(a=>a.id===id);}
function accountTransactions(accountId){return state.transactions.filter(t=>t.accountId===accountId).sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt-b.createdAt);}
function balanceAt(accountId,untilDate=null){
  const a=accountById(accountId);if(!a)return 0;
  return Number(a.opening||0)+accountTransactions(accountId).filter(t=>!untilDate||t.date<=untilDate).reduce((sum,t)=>sum+Number(t.amount),0);
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
function bankLogo(account){const cls=account.id.startsWith('lbp')?'lbp':account.id.startsWith('fortuneo')?'fortuneo':account.id.startsWith('cic')?'cic':account.id.startsWith('bourso')?'bourso':'tiime';return '<span class="bank-logo '+cls+'">'+escapeHtml(account.short)+'</span>';}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function kindLabel(a){return a.kind==='pro'?'Professionnel':a.kind==='savings'?'Épargne':'Compte courant';}
function accountMarkup(a,compact=false){
  const balance=balanceAt(a.id);
  if(compact)return '<div class="account-row" data-account-open="'+a.id+'">'+bankLogo(a)+'<div class="account-info"><strong>'+escapeHtml(a.name)+'</strong><small>'+kindLabel(a)+'</small></div><div class="account-balance">'+euro(balance)+'<small>'+state.transactions.filter(t=>t.accountId===a.id).length+' opération(s)</small></div></div>';
  const extra=a.kind==='pro'?'<div class="account-card-label">Net estimé après provisions : <strong>'+euro(tiimeNetBalance(a))+'</strong></div>':'<div class="account-card-label">'+state.transactions.filter(t=>t.accountId===a.id).length+' transaction(s) enregistrée(s)</div>';
  return '<article class="account-card" data-account-open="'+a.id+'"><div class="account-card-top">'+bankLogo(a)+'<div class="account-info"><strong>'+escapeHtml(a.name)+'</strong><small>'+kindLabel(a)+'</small></div><button class="edit-account" data-edit-account="'+a.id+'" aria-label="Configurer '+escapeHtml(a.name)+'" title="Configurer le compte">···</button></div><div class="account-card-balance">'+euro(balance)+'</div>'+extra+'<div class="account-card-foot"><span>Solde actuel</span><button data-account-transactions="'+a.id+'">Historique →</button></div></article>';
}
function renderDashboard(){
  const total=state.accounts.reduce((sum,a)=>sum+balanceAt(a.id),0);
  const bank=state.accounts.filter(a=>a.kind!=='pro').reduce((sum,a)=>sum+balanceAt(a.id),0);
  const pro=accountById('tiime');
  $('total-balance').textContent=euro(total);$('bank-balance').textContent=euro(bank);$('pro-balance').textContent=euro(pro?tiimeNetBalance(pro):0);
  $('dashboard-accounts').innerHTML=state.accounts.map(a=>accountMarkup(a,true)).join('');
  const recent=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt).slice(0,6);
  $('recent-transactions').innerHTML=recent.length?recent.map(t=>{const a=accountById(t.accountId)||{name:'Compte supprimé'};return '<div class="recent-row"><span class="movement-icon '+(t.amount>=0?'income':'expense')+'">'+(t.amount>=0?'↙':'↗')+'</span><div class="movement-main"><strong>'+escapeHtml(t.label)+'</strong><small>'+escapeHtml(a.name)+' · '+dateFormat(t.date)+'</small></div><span class="movement-amount '+(t.amount>=0?'positive':'negative')+'">'+(t.amount>0?'+':'')+euro(t.amount)+'</span></div>';}).join(''):'<div class="empty-state">Aucune opération pour le moment.<br>Ajoutez une transaction pour commencer.</div>';
  $('account-count').textContent=state.accounts.length;
}
function renderAccounts(){
  const query=$('account-search').value.trim().toLocaleLowerCase('fr');
  const accounts=state.accounts.filter(a=>a.name.toLocaleLowerCase('fr').includes(query));
  $('all-accounts').innerHTML=accounts.length?accounts.map(a=>accountMarkup(a)).join(''):'<div class="empty-state">Aucun compte ne correspond à cette recherche.</div>';
  $('accounts-total-label').textContent=state.accounts.length+' comptes';
}
function fillAccountSelects(){
  const opts=state.accounts.map(a=>'<option value="'+a.id+'">'+escapeHtml(a.name)+'</option>').join('');
  $('transaction-account').innerHTML=opts;
  const current=$('transaction-account-filter').value;
  $('transaction-account-filter').innerHTML='<option value="all">Tous les comptes</option>'+opts;
  if(state.accounts.some(a=>a.id===current))$('transaction-account-filter').value=current;
}
function renderTransactions(){
  const accountFilter=$('transaction-account-filter').value,typeFilter=$('transaction-type-filter').value,query=$('transaction-search').value.trim().toLocaleLowerCase('fr');
  const sorted=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
  const list=sorted.filter(t=>{
    const a=accountById(t.accountId);
    return (accountFilter==='all'||t.accountId===accountFilter)&&(typeFilter==='all'||(typeFilter==='income'?t.amount>=0:t.amount<0))&&((t.label+' '+(a?.name||'')).toLocaleLowerCase('fr').includes(query));
  });
  $('transaction-head').innerHTML='<tr><th>DATE</th><th>TRANSACTION</th><th>COMPTE</th><th>MONTANT</th><th>SOLDE À DATE</th>'+(accountFilter==='tiime'?'<th>MONTANT APRÈS PROVISIONS</th><th>SOLDE NET ESTIMÉ</th>':'')+'<th>ACTIONS</th></tr>';
  $('transaction-rows').innerHTML=list.length?list.map(t=>{
    const a=accountById(t.accountId)||{name:'Compte supprimé',short:'?',kind:'bank'};
    const balance=balanceAt(t.accountId,t.date);
    const calc=tiimeCalc(a,Number(t.amount));
    const net=tiimeNetBalance(a);
    return '<tr><td>'+dateFormat(t.date)+'</td><td class="transaction-label">'+escapeHtml(t.label)+'</td><td><div class="table-account">'+bankLogo(a)+'<span>'+escapeHtml(a.name)+'</span></div></td><td class="table-amount '+(t.amount>=0?'positive':'negative')+'">'+(t.amount>0?'+':'')+euro(t.amount)+'</td><td class="table-balance">'+euro(balance)+'</td>'+(accountFilter==='tiime'?'<td>'+euro(calc.net)+'</td><td class="table-balance">'+euro(net)+'</td>':'')+'<td><div class="row-actions"><button data-edit-transaction="'+t.id+'">Modifier</button><button data-delete-transaction="'+t.id+'">Supprimer</button></div></td></tr>';
  }).join(''):'<tr><td colspan="8"><div class="empty-state">Aucune transaction trouvée. Ajoutez une opération pour la voir ici.</div></td></tr>';
  $('transaction-footer').textContent=list.length+' opération(s) affichée(s) · Solde à date calculé à partir du solde de départ et des mouvements enregistrés.';
}
function renderAll(){fillAccountSelects();renderDashboard();renderAccounts();renderTransactions();saveState();}
function showToast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
function navigate(view){
  document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id===view+'-view'));
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
  $('breadcrumb-current').textContent=({dashboard:"Vue d'ensemble",accounts:'Mes comptes',transactions:'Transactions'})[view]||view;
  if(view==='accounts')renderAccounts();if(view==='transactions')renderTransactions();
  window.scrollTo({top:0,behavior:'smooth'});
}
function openTransaction(accountId=null,transaction=null){
  $('transaction-form').reset();$('transaction-id').value=transaction?.id||'';
  $('transaction-modal-title').textContent=transaction?'Modifier la transaction':'Nouvelle transaction';
  $('transaction-date').value=transaction?.date||today();$('transaction-amount').value=transaction?transaction.amount:'';
  $('transaction-label').value=transaction?.label||'';
  fillAccountSelects();$('transaction-account').value=transaction?.accountId||accountId||state.accounts[0]?.id||'';
  $('transaction-dialog').showModal();
}
function openAccountEditor(id){
  const a=accountById(id);if(!a)return;
  $('account-form').reset();$('edit-account-id').value=a.id;$('account-modal-title').textContent='Configurer le compte';
  $('edit-account-name').value=a.name;$('edit-account-opening').value=Number(a.opening||0);
  $('tiime-settings').classList.toggle('hidden',a.kind!=='pro');
  $('edit-vat-rate').value=a.vatRate??20;$('edit-social-rate').value=a.socialRate??45;$('edit-account-net-opening').value=Number(a.netOpening||0);
  $('account-dialog').showModal();
}
function exportData(){
  const payload={application:'Gestion de comptes',exportedAt:new Date().toISOString(),...state};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='gestion-comptes-'+today()+'.json';a.click();URL.revokeObjectURL(url);showToast('Export JSON téléchargé.');
}
function downloadCsv(){
  const rows=[['Date','Transaction','Compte','Montant','Solde à date','Montant après provisions','Solde net estimé']];
  [...state.transactions].sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>{const a=accountById(t.accountId);rows.push([t.date,t.label,a?.name||'',t.amount,balanceAt(t.accountId,t.date),a?.kind==='pro'?tiimeCalc(a,t.amount).net:'',a?.kind==='pro'?tiimeNetBalance(a):'']);});
  const csv=rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='transactions-'+today()+'.csv';a.click();URL.revokeObjectURL(url);showToast('Export CSV téléchargé.');
}
document.querySelectorAll('.nav-item').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.view)));
document.querySelectorAll('[data-goto]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.goto)));
['quick-add','accounts-add','transactions-add'].forEach(id=>$(id).addEventListener('click',()=>openTransaction()));
$('account-search').addEventListener('input',renderAccounts);
$('transaction-search').addEventListener('input',renderTransactions);
$('transaction-account-filter').addEventListener('change',renderTransactions);
$('transaction-type-filter').addEventListener('change',renderTransactions);
$('export-btn').addEventListener('click',()=>{
  const choice=window.confirm('OK : exporter toutes les données en JSON.\nAnnuler : exporter uniquement les transactions en CSV.');
  choice?exportData():downloadCsv();
});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.close).close()));
$('transaction-form').addEventListener('submit',event=>{
  event.preventDefault();
  const id=$('transaction-id').value,accountId=$('transaction-account').value,date=$('transaction-date').value,amount=Number($('transaction-amount').value),label=$('transaction-label').value.trim();
  if(!date||!label||!Number.isFinite(amount)){showToast('Vérifiez les informations saisies.');return;}
  const previous=id?state.transactions.find(t=>t.id===id):null;
  const record={id:id||crypto.randomUUID(),accountId,date,amount,label,createdAt:previous?.createdAt||Date.now()};
  if(previous)state.transactions=state.transactions.map(t=>t.id===id?record:t);else state.transactions.push(record);
  $('transaction-dialog').close();renderAll();showToast(previous?'Transaction modifiée.':'Transaction ajoutée.');
});
$('account-form').addEventListener('submit',event=>{
  event.preventDefault();const a=accountById($('edit-account-id').value);if(!a)return;
  a.name=$('edit-account-name').value.trim();a.opening=Number($('edit-account-opening').value)||0;
  if(a.kind==='pro'){a.vatRate=Math.min(100,Math.max(0,Number($('edit-vat-rate').value)||0));a.socialRate=Math.min(100,Math.max(0,Number($('edit-social-rate').value)||0));a.netOpening=Number($('edit-account-net-opening').value)||0;}
  $('account-dialog').close();renderAll();showToast('Paramètres du compte enregistrés.');
});
document.addEventListener('click',event=>{
  const edit=event.target.closest('[data-edit-transaction]');
  if(edit){const t=state.transactions.find(t=>t.id===edit.dataset.editTransaction);if(t)openTransaction(t.accountId,t);return;}
  const del=event.target.closest('[data-delete-transaction]');
  if(del){const t=state.transactions.find(t=>t.id===del.dataset.deleteTransaction);if(t&&window.confirm('Supprimer la transaction « '+t.label+' » ?')){state.transactions=state.transactions.filter(x=>x.id!==t.id);renderAll();showToast('Transaction supprimée.');}return;}
  const editAccount=event.target.closest('[data-edit-account]');
  if(editAccount){event.stopPropagation();openAccountEditor(editAccount.dataset.editAccount);return;}
  const history=event.target.closest('[data-account-transactions]');
  if(history){event.stopPropagation();navigate('transactions');$('transaction-account-filter').value=history.dataset.accountTransactions;renderTransactions();return;}
  const account=event.target.closest('[data-account-open]');
  if(account){openAccountEditor(account.dataset.accountOpen);}
});
renderAll();