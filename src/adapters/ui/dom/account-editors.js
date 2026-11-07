/**
 * DOM adapters for account, transaction and Lombard editing dialogs.
 * Business mutations remain delegated to application commands.
 */
function updateTransactionFormMode(){
  const isTransfer=$('transaction-kind').value==='transfer';
  const sourceId=$('transaction-account').value;
  const destinationSelect=$('transaction-transfer-account');
  destinationSelect.disabled=!isTransfer;
  destinationSelect.required=isTransfer;
  if(isTransfer&&destinationSelect.value===sourceId){
    const alternative=[...destinationSelect.options].find(option=>option.value&&option.value!==sourceId);
    if(alternative)destinationSelect.value=alternative.value;
  }
  $('transaction-transfer-fields').hidden=!isTransfer;
  $('transaction-account-caption').textContent=isTransfer?'Compte source':'Compte';
  const account=accountById(sourceId);
  $('transaction-classification').hidden=isTransfer||effectiveAccountType(account||{kind:'bank'})!=='pro';
  $('transaction-amount-help').textContent=isTransfer
    ?'Saisissez un montant positif : le compte source sera débité et le compte destinataire crédité.'
    :'Utilisez un montant positif pour une entrée d’argent et négatif pour une sortie.';
  if(isTransfer){
    $('transaction-provision').checked=false;$('transaction-vat').checked=false;$('transaction-social').checked=false;
    document.querySelectorAll('input[name="transaction-vat-treatment"],input[name="transaction-social-treatment"]').forEach(input=>{input.checked=false;});
    $('transaction-vat-treatment-fields').hidden=true;$('transaction-social-treatment-fields').hidden=true;
  }
}
function openTransaction(accountId=null,transaction=null){
  const linked=transaction?.transferId?transactionCommands.findLinkedTransactions(transaction.id):[];
  const record=linked.find(item=>item.transferRole==='outgoing')||transaction;
  const isTransfer=Boolean(record?.transferId);
  const incoming=linked.find(item=>item.transferRole==='incoming');
  $('transaction-form').reset();
  $('transaction-id').value=record?.id||'';
  $('transaction-modal-title').textContent=transaction?(isTransfer?'Modifier le virement':'Modifier l’opération'):'Nouvelle opération';
  $('transaction-kind').value=isTransfer?'transfer':'standard';
  $('transaction-kind').disabled=Boolean(transaction);
  $('transaction-date').value=dateInputFormat(record?.date||today());
  const legacyTemplate=record?.professionalAmount===undefined&&Number(record?.amount)===0&&record?.recurringTemplateId
    ?recurringTemplateCommands.findById(record.recurringTemplateId):null;
  const editableAmount=isTransfer?Math.abs(Number(record.amount))
    :record?.professionalTreatment==='effective'?Number(record.amount)
    :record?.professionalAmount!==undefined?Number(record.professionalAmount)
    :legacyTemplate?-Math.abs(Number(legacyTemplate.amount)||0):Number(record?.amount);
  $('transaction-amount').value=transaction?editableAmount:'';
  $('transaction-provision').checked=record?.professionalCategory==='provision';
  $('transaction-vat').checked=record?.professionalCategory==='vat';
  $('transaction-social').checked=record?.professionalCategory==='social';
  const treatment=record?.professionalTreatment||'';
  document.querySelectorAll('input[name="transaction-vat-treatment"],input[name="transaction-social-treatment"]').forEach(input=>{input.checked=input.value===treatment;});
  $('transaction-label').value=record?.label||'';
  fillAccountSelects();
  $('transaction-account').value=record?.accountId||accountId||state.accounts[0]?.id||'';
  $('transaction-transfer-account').value=record?.transferAccountId||incoming?.accountId||'';
  if(!$('transaction-transfer-account').value){
    const alternative=[...$('transaction-transfer-account').options].find(option=>option.value&&option.value!==$('transaction-account').value);
    $('transaction-transfer-account').value=alternative?.value||'';
  }
  updateTransactionFormMode();
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
  $('edit-account-net-opening').value=a?Number(a.netOpening??a.opening??0):0;
  $('account-net-opening-field').hidden=effectiveAccountType(a||{kind:'bank'})!=='pro';
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
  const linkedTransactions=transactionRepository.findByAccount(id);
  const linkedTemplates=recurringTemplateRepository.findAll().filter(t=>t.accountId===id);
  const linkedStocks=stockHoldingCommands.findAll().filter(t=>t.accountId===id);
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
  const removal=accountCommands.remove(id);
  if(!removal)return;
  if(cloud.user)cloud.pendingAccountDeletes.add(id);
  for(const transaction of removal.transactions)cloud.pendingDeletes.delete(transaction.id);
  for(const template of removal.templates)cloud.pendingTemplateDeletes.delete(template.id);
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
const mcpTokenService = McpTokenService.create({ authenticationService: { getSession: () => getAuthenticationService().getSession() }, endpoint: MCP_TOKEN_ENDPOINT, publishableKey: window.GESTION_SUPABASE_CONFIG.publishableKey });
