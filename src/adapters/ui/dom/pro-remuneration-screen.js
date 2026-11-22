/**
 * DOM adapter for the monthly professional remuneration simulator.
 * Reads existing professional-account operations and stores immutable snapshots
 * in the authenticated user's private Auth metadata.
 */
(function exposeProRemunerationScreen(root) {
  'use strict';
  let selectedAccountId = '';
  let bound = false;

  const moneyInput = value => Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const detailList = (items, emptyLabel) => items.length
    ? '<ul class="pro-remuneration-details">' + items.map(item => '<li><span>' + escapeHtml(item.date) + ' · ' + escapeHtml(item.label) + '</span><strong>' + euro(item.amount) + '</strong></li>').join('') + '</ul>'
    : '<p class="pro-remuneration-empty">' + emptyLabel + '</p>';

  function professionalAccounts() {
    return (state.accounts || []).filter(account => effectiveAccountType(account) === 'pro');
  }

  function latestSimulation(accountId) {
    return ProRemunerationRules.normalizeSimulations(state.proRemunerationSimulations)
      .filter(item => item.accountId === accountId)
      .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))[0] || null;
  }

  function readForm() {
    const accountId = $('pro-remuneration-account')?.value || '';
    const previousInvoiceDate = $('pro-remuneration-previous-date')?.value || '';
    const invoiceDate = $('pro-remuneration-invoice-date')?.value || '';
    const caHt = parseFrenchNumber($('pro-remuneration-ca')?.value || '');
    const socialRate = parseFrenchNumber($('pro-remuneration-rate')?.value || '45');
    const account = accountById(accountId);
    const cashBalance = account ? balanceAt(accountId, invoiceDate) : null;
    return ProRemunerationRules.calculate({
      transactions: state.transactions || [], accountId, previousInvoiceDate, invoiceDate,
      caHt, socialRate, cashBalance, displaySort: $('pro-transaction-sort')?.value || 'date-desc'
    });
  }

  function renderPreview() {
    const target = $('pro-remuneration-preview');
    if (!target) return;
    if (!$('pro-remuneration-ca')?.value.trim()) {
      target.innerHTML = '<p class="pro-remuneration-empty">Saisissez le chiffre d’affaires HT pour afficher la simulation.</p>';
      target.dataset.result = 'invalid';
      return;
    }
    try {
      const result = readForm();
      target.innerHTML = '<div class="pro-remuneration-result-grid">'
        + '<article><span>Dépenses de la période (pointées ou non, hors URSSAF et TVA)</span><strong>' + euro(result.pastCharges) + '</strong></article>'
        + '<article><span>Résultat disponible</span><strong class="' + (result.availableResult < 0 ? 'negative' : '') + '">' + euro(result.availableResult) + '</strong></article>'
        + '<article><span>Rémunération estimée</span><strong>' + euro(result.remuneration) + '</strong></article>'
        + '<article><span>Provision URSSAF (' + moneyInput(result.socialRate) + ' %)</span><strong>' + euro(result.socialProvision) + '</strong></article>'
        + '<article><span>Charges futures hors URSSAF et TVA (jusqu’au ' + dateFormat(result.futurePeriodEndDate) + ')</span><strong>' + euro(result.futureCharges) + '</strong></article>'
        + '<article class="highlight"><span>Virement personnel estimé</span><strong>' + euro(result.transferAmount) + '</strong></article>'
        + '</div>'
        + '<details class="pro-remuneration-live-details"><summary>Voir les opérations retenues</summary><h4>Charges débitées sur la période</h4>' + detailList(result.pastChargeItems, 'Aucune charge passée retenue.') + '<h4>Charges à venir hors URSSAF et TVA</h4>' + detailList(result.futureChargeItems, 'Aucune charge future retenue.') + '</details>'
        + (result.resultIsNegative ? '<p class="pro-remuneration-warning">Les charges passées dépassent le chiffre d’affaires HT : aucune rémunération n’est proposée.</p>' : '')
        + (result.futureChargesExceedRemuneration ? '<p class="pro-remuneration-warning">Les charges futures dépassent la rémunération estimée de ' + euro(result.futureShortfall) + '. Le virement est ramené à zéro.</p>' : '')
        + (result.cashRemaining !== null ? '<p class="pro-remuneration-cash">Trésorerie estimée restante après virement et charges futures : <strong>' + euro(result.cashRemaining) + '</strong></p><small>Ce contrôle suppose que l’encaissement de la facture est aussi enregistré comme opération pointée.</small>' : '');
      target.dataset.result = 'valid';
    } catch (error) {
      target.innerHTML = '<p class="pro-remuneration-empty">' + escapeHtml(error.message || 'Renseignez les paramètres pour afficher la simulation.') + '</p>';
      target.dataset.result = 'invalid';
    }
  }

  function renderHistory(accountId) {
    const target = $('pro-remuneration-history');
    if (!target) return;
    const rows = ProRemunerationRules.normalizeSimulations(state.proRemunerationSimulations)
      .filter(item => item.accountId === accountId)
      .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
    target.innerHTML = rows.length ? rows.map(item => '<article class="pro-remuneration-history-item">'
      + '<div><strong>Facture encaissée le ' + dateFormat(item.invoiceDate) + '</strong><small>Période depuis le ' + dateFormat(item.previousInvoiceDate) + '</small></div>'
      + '<div><span>CA HT</span><strong>' + euro(item.caHt) + '</strong></div>'
      + '<div><span>Rémunération</span><strong>' + euro(item.remuneration) + '</strong></div>'
      + '<div><span>Provision URSSAF</span><strong>' + euro(item.socialProvision) + '</strong></div>'
      + '<div><span>Virement estimé</span><strong class="positive">' + euro(item.transferAmount) + '</strong></div>'
      + '<details><summary>Détail des charges retenues</summary><h4>Dépenses passées (pointées ou non, hors URSSAF et TVA)</h4>' + detailList(item.pastChargeItems, 'Aucune charge passée retenue.')
      + '<h4>Charges futures hors URSSAF et TVA</h4>' + detailList(item.futureChargeItems, 'Aucune charge future retenue.') + '</details>'
      + '</article>').join('') : '<div class="pro-remuneration-empty">Aucune simulation enregistrée pour ce compte.</div>';
  }

  function renderProRemunerationScreen() {
    const container = $('pro-remuneration');
    if (!container) return;
    const accounts = professionalAccounts();
    if (!accounts.length) {
      container.innerHTML = '<div class="pro-remuneration-empty">Ajoutez d’abord un compte professionnel pour calculer votre rémunération.</div>';
      return;
    }
    if (!accounts.some(account => account.id === selectedAccountId)) selectedAccountId = accounts[0].id;
    const previous = latestSimulation(selectedAccountId);
    const selected = accounts.find(account => account.id === selectedAccountId);
    const currentInvoiceDate = $('pro-remuneration-invoice-date')?.value || today();
    const currentCa = $('pro-remuneration-ca')?.value || '';
    const currentRate = $('pro-remuneration-rate')?.value || '45';
    const currentPreviousDate = $('pro-remuneration-previous-date')?.value || previous?.invoiceDate || '';
    container.innerHTML = '<section class="panel pro-remuneration-panel">'
      + '<div class="panel-heading"><div><h2>Calcul de rémunération</h2><p>Estimation mensuelle à partir des dépenses de la période, pointées ou non, et des charges à venir</p></div><span class="pro-remuneration-tag">Simulation</span></div>'
      + '<form id="pro-remuneration-form" class="pro-remuneration-form">'
      + '<label>Compte professionnel<select id="pro-remuneration-account">' + accounts.map(account => '<option value="' + escapeHtml(account.id) + '"' + (account.id === selectedAccountId ? ' selected' : '') + '>' + escapeHtml(account.name) + '</option>').join('') + '</select></label>'
      + '<div class="pro-remuneration-input-grid">'
      + '<label>Nouvelle facture encaissée le<input id="pro-remuneration-invoice-date" type="date" required value="' + escapeHtml(currentInvoiceDate) + '"></label>'
      + '<label>Facture précédente encaissée le<input id="pro-remuneration-previous-date" type="date" required value="' + escapeHtml(currentPreviousDate) + '"></label>'
      + '<label>Chiffre d’affaires HT (€)<input id="pro-remuneration-ca" inputmode="decimal" placeholder="Ex. : 12 000,00" required value="' + escapeHtml(currentCa) + '"></label>'
      + '<label>Taux de cotisations estimé (%)<input id="pro-remuneration-rate" inputmode="decimal" value="' + escapeHtml(currentRate) + '" required></label>'
      + '</div><p class="pro-remuneration-help">La première simulation nécessite la date d’encaissement de la facture précédente. Ensuite, cette date est préremplie avec la dernière simulation enregistrée. Les opérations de la date de la facture précédente sont incluses. Les dépenses passées sont comptées qu’elles soient pointées ou non. Les virements entre comptes et les virements externes identifiés par leur libellé (par exemple « Vers [bénéficiaire] »), ainsi que les paiements URSSAF et TVA déjà provisionnés, sont exclus.</p>'
      + '<div id="pro-remuneration-preview" class="pro-remuneration-preview" aria-live="polite"></div>'
      + '<div class="pro-remuneration-actions"><button type="submit" class="primary-button">Enregistrer cette simulation</button></div>'
      + '</form></section><section class="panel pro-remuneration-history-panel"><div class="panel-heading"><div><h2>Historique des rémunérations</h2><p>Les simulations enregistrées restent consultables ici.</p></div></div><div id="pro-remuneration-history" class="pro-remuneration-history"></div></section>';
    $('pro-remuneration-form').addEventListener('input', renderPreview);
    $('pro-remuneration-account').addEventListener('change', event => {
      selectedAccountId = event.currentTarget.value;
      const nextPreviousDate = latestSimulation(selectedAccountId)?.invoiceDate || '';
      $('pro-remuneration-previous-date').value = nextPreviousDate;
      renderProRemunerationScreen();
    });
    $('pro-remuneration-form').addEventListener('submit', saveSimulation);
    renderPreview();
    renderHistory(selected.id);
  }

  async function saveSimulation(event) {
    event.preventDefault();
    const button = $('pro-remuneration-form')?.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    try {
      const result = readForm();
      const existing = ProRemunerationRules.normalizeSimulations(state.proRemunerationSimulations);
      if (existing.some(item => item.accountId === result.accountId && item.invoiceDate === result.invoiceDate)) {
        throw new Error('Une simulation existe déjà pour cette date de facture. Modifiez la date ou consultez l’historique.');
      }
      const record = {
        ...result,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      };
      const next = ProRemunerationRules.normalizeSimulations([...existing, record]);
      if (!cloud.user) throw new Error('Connectez-vous pour enregistrer vos simulations.');
      await authMetadataRepository().update({ proRemunerationSimulations: next });
      state.proRemunerationSimulations = next;
      $('pro-remuneration-previous-date').value = result.invoiceDate;
      $('pro-remuneration-invoice-date').value = result.futurePeriodEndDate;
      $('pro-remuneration-ca').value = '';
      renderProRemunerationScreen();
      showToast('Simulation de rémunération enregistrée.');
    } catch (error) {
      showToast('Enregistrement impossible : ' + (error.message || 'vérifiez les données.'));
    } finally {
      if (button) button.disabled = false;
    }
  }

  function initializeProRemunerationScreen() {
    if (bound) return;
    bound = true;
    renderProRemunerationScreen();
  }

  root.renderProRemunerationScreen = renderProRemunerationScreen;
  root.initializeProRemunerationScreen = initializeProRemunerationScreen;
})(typeof globalThis !== 'undefined' ? globalThis : this);
