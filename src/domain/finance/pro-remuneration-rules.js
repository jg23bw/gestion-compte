/**
 * Pure rules for the monthly EURL remuneration cash-flow estimate.
 */
(function exposeProRemunerationRules(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ProRemunerationRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  // External personal transfers may be entered as ordinary expenses rather than
  // linked account-to-account transfers. Detect common bank-statement labels
  // generically (e.g. "Vers [beneficiary]"), without depending on a bank name.
  const isTransfer = transaction => Boolean(transaction.transferId || transaction.transferRole)
    || transaction.professionalCategory === 'personal-transfer'
    || /^(?:vers\s+\S|virement\b|transfert\b)/i.test(String(transaction.label || '').trim());
  // VAT and social-contribution payments are cash movements for provisions
  // already accounted for separately; they must not reduce remuneration twice.
  const isAlreadyProvisionedCharge = transaction => ['social', 'vat'].includes(transaction.professionalCategory)
    || ['social', 'vat'].includes(transaction.professionalKind)
    || ['social', 'vat'].includes(transaction.category);

  function normalizeSimulations(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && typeof item === 'object'
      && typeof item.id === 'string'
      && typeof item.accountId === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(item.invoiceDate)
      && Number.isFinite(Number(item.caHt)))
      .map(item => ({
        ...item,
        caHt: roundMoney(item.caHt),
        socialRate: item.socialRate !== null && item.socialRate !== undefined && Number.isFinite(Number(item.socialRate)) ? Number(item.socialRate) : 45,
        pastCharges: roundMoney(item.pastCharges),
        availableResult: roundMoney(item.availableResult),
        remuneration: roundMoney(item.remuneration),
        socialProvision: roundMoney(item.socialProvision),
        futureCharges: roundMoney(item.futureCharges),
        transferAmount: roundMoney(item.transferAmount),
        cashBalance: item.cashBalance !== null && item.cashBalance !== undefined && item.cashBalance !== '' && Number.isFinite(Number(item.cashBalance)) ? roundMoney(item.cashBalance) : null,
        cashRemaining: item.cashRemaining !== null && item.cashRemaining !== undefined && item.cashRemaining !== '' && Number.isFinite(Number(item.cashRemaining)) ? roundMoney(item.cashRemaining) : null,
        pastChargeItems: Array.isArray(item.pastChargeItems) ? item.pastChargeItems : [],
        futureChargeItems: Array.isArray(item.futureChargeItems) ? item.futureChargeItems : []
      }));
  }

  function addOneMonth(date) {
    const [year, month, day] = date.split('-').map(Number);
    const nextMonth = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0)).getUTCDate();
    const targetDay = Math.min(day, lastDay);
    return nextMonth.getUTCFullYear() + '-' + String(nextMonth.getUTCMonth() + 1).padStart(2, '0')
      + '-' + String(targetDay).padStart(2, '0');
  }

  const isInvoice = transaction => transaction.professionalOperationType === 'invoice'
    || (Number(transaction.amount) > 0 && /^\s*facture\s+\d+\s*$/i.test(String(transaction.label || '')));

  function displayOrder(transactions, sort = 'date-desc') {
    return transactions.slice().sort((a, b) => {
      const pendingFirst = Number(a.isPaid === true) - Number(b.isPaid === true);
      if (pendingFirst) return pendingFirst;
      const created = Number(a.createdAt || 0) - Number(b.createdAt || 0);
      if (sort === 'date-asc') return String(a.date || '').localeCompare(String(b.date || '')) || created;
      if (sort === 'label') return String(a.label || '').localeCompare(String(b.label || ''), 'fr');
      if (sort === 'amount-asc') return Number(a.amount) - Number(b.amount);
      if (sort === 'amount-desc') return Number(b.amount) - Number(a.amount);
      return String(b.date || '').localeCompare(String(a.date || '')) || -created;
    });
  }

  // Reconstitue la chronologie à partir des dates, mais conserve l'ordre réel
  // du tableau pour départager plusieurs opérations d'une même date.
  function chronologicalOrder(transactions, sort = 'date-desc') {
    const tableOrder = new Map(displayOrder(transactions, sort).map((item, index) => [String(item.id), index]));
    return transactions.slice().sort((a, b) =>
      String(a.date || '').localeCompare(String(b.date || ''))
      || (tableOrder.get(String(a.id)) ?? 0) - (tableOrder.get(String(b.id)) ?? 0)
    );
  }

  function findLatestInvoicePair(transactions = [], accountId, displaySort = 'date-desc') {
    if (!accountId) return null;
    const accountTransactions = transactions.filter(item => item.accountId === accountId);
    const ordered = chronologicalOrder(accountTransactions, displaySort);
    const invoices = ordered.filter(isInvoice);
    if (invoices.length < 2) return null;

    // Priorité à la facture la plus récente encore à encaisser. La borne précédente
    // est la dernière facture effectivement encaissée avant celle-ci.
    let current = invoices.slice().reverse().find(item => item.isPaid !== true);
    if (!current) current = invoices[invoices.length - 1];
    const currentIndex = ordered.indexOf(current);
    let previous = invoices.slice(0, invoices.indexOf(current)).reverse()
      .find(item => item.isPaid === true);
    if (!previous) previous = invoices.slice(0, invoices.indexOf(current)).reverse()[0] || null;
    if (!previous || ordered.indexOf(previous) >= currentIndex) return null;

    const invoiceTtc = roundMoney(Number(current.amount));
    return {
      currentInvoice: current,
      previousInvoice: previous,
      invoiceTtc,
      caHt: roundMoney(invoiceTtc / 1.2),
      currentInvoicePaid: current.isPaid === true
    };
  }

  function calculate({
    transactions = [], accountId, previousInvoiceDate, invoiceDate,
    previousInvoiceId = null, invoiceId = null,
    caHt, invoiceTtc = null, currentInvoicePaid = null,
    socialRate = 45, cashBalance = null, displaySort = 'date-desc'
  } = {}) {
    if (!accountId) throw new TypeError('Un compte professionnel doit être sélectionné.');
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(previousInvoiceDate || '') || !/^\\d{4}-\\d{2}-\\d{2}$/.test(invoiceDate || '')) {
      throw new TypeError('Les deux dates de facture sont obligatoires.');
    }
    if (invoiceDate < previousInvoiceDate) throw new RangeError('La nouvelle facture doit être postérieure à la facture précédente.');
    const turnover = Number(caHt);
    const rate = Number(socialRate);
    if (!Number.isFinite(turnover) || turnover < 0) throw new TypeError('Le chiffre d’affaires HT doit être un montant positif ou nul.');
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new RangeError('Le taux de cotisations doit être compris entre 0 et 100 %.');

    const accountTransactions = transactions.filter(item => item.accountId === accountId);
    const ordered = chronologicalOrder(accountTransactions, displaySort);
    const invoiceRows = ordered.map((item, index) => ({ item, index })).filter(row => isInvoice(row.item));
    const currentInvoice = invoiceId
      ? invoiceRows.find(row => String(row.item.id) === String(invoiceId))
      : invoiceRows.filter(row => row.item.date === invoiceDate)
        .sort((a, b) => Number(a.item.isPaid === true) - Number(b.item.isPaid === true))[0];
    const previousInvoice = previousInvoiceId
      ? invoiceRows.find(row => String(row.item.id) === String(previousInvoiceId))
      : invoiceRows.filter(row => row.item.date === previousInvoiceDate && row.item.isPaid === true).slice(-1)[0]
        || invoiceRows.filter(row => row.item.date === previousInvoiceDate).slice(-1)[0];

    const currentIndex = currentInvoice?.index ?? -1;
    const previousIndex = previousInvoice?.index ?? -1;
    if (currentIndex >= 0 && previousIndex >= 0 && previousIndex >= currentIndex) {
      throw new RangeError('La facture encaissée doit précéder la facture à encaisser.');
    }

    let pastRows;
    if (currentIndex >= 0 && previousIndex >= 0) {
      pastRows = ordered.slice(previousIndex + 1, currentIndex);
    } else {
      // Compatibilité des simulations manuelles sans lignes de facture identifiables :
      // les bornes calendaires restent strictement exclusives.
      pastRows = ordered.filter(item => item.date > previousInvoiceDate && item.date < invoiceDate);
    }

    let futurePeriodEndDate = addOneMonth(invoiceDate);
    const nextInvoice = currentIndex >= 0
      ? invoiceRows.find(row => row.index > currentIndex)
      : null;
    if (nextInvoice && nextInvoice.item.date < futurePeriodEndDate) {
      futurePeriodEndDate = nextInvoice.item.date;
    }
    const futureRows = currentIndex >= 0
      ? ordered.slice(currentIndex + 1).filter(item => item.date <= futurePeriodEndDate
        && (!nextInvoice || ordered.indexOf(item) < nextInvoice.index))
      : ordered.filter(item => item.date > invoiceDate && item.date <= futurePeriodEndDate);

    const isEligibleExpense = item => Number(item.amount) < 0
      && !isInvoice(item) && !isTransfer(item) && !isAlreadyProvisionedCharge(item);
    const toChargeItem = item => ({
      id: String(item.id), date: item.date,
      label: String(item.label || 'Charge'),
      amount: roundMoney(Math.abs(Number(item.amount)))
    });

    // Le pointage ne change pas l'appartenance à la période : toutes les dépenses
    // saisies sont comptées, qu'elles soient pointées ou non.
    const pastChargeItems = pastRows.filter(isEligibleExpense).map(toChargeItem);
    const futureChargeItems = futureRows.filter(isEligibleExpense).map(toChargeItem);

    const pastCharges = roundMoney(pastChargeItems.reduce((sum, item) => sum + item.amount, 0));
    const futureCharges = roundMoney(futureChargeItems.reduce((sum, item) => sum + item.amount, 0));
    const availableResult = roundMoney(turnover - pastCharges);
    const remuneration = availableResult > 0 ? roundMoney(availableResult / (1 + rate / 100)) : 0;
    const socialProvision = roundMoney(remuneration * rate / 100);
    const transferBeforeFloor = roundMoney(remuneration - futureCharges);
    const transferAmount = Math.max(0, transferBeforeFloor);
    const normalizedCashBalance = cashBalance !== null && cashBalance !== undefined && cashBalance !== '' && Number.isFinite(Number(cashBalance)) ? roundMoney(cashBalance) : null;
    const cashRemaining = normalizedCashBalance === null
      ? null : roundMoney(normalizedCashBalance - transferAmount - futureCharges);

    return {
      accountId, previousInvoiceDate, invoiceDate, futurePeriodEndDate, caHt: roundMoney(turnover),
      invoiceTtc: invoiceTtc === null || invoiceTtc === undefined ? null : roundMoney(invoiceTtc),
      currentInvoicePaid: currentInvoicePaid === null ? null : currentInvoicePaid === true, socialRate: rate,
      pastCharges, pastChargeItems, availableResult, remuneration, socialProvision,
      futureCharges, futureChargeItems, transferAmount, cashBalance: normalizedCashBalance,
      cashRemaining, resultIsNegative: availableResult < 0,
      futureChargesExceedRemuneration: transferBeforeFloor < 0,
      futureShortfall: roundMoney(Math.max(0, -transferBeforeFloor))
    };
  }

  return Object.freeze({ roundMoney, normalizeSimulations, isInvoice, displayOrder, chronologicalOrder, findLatestInvoicePair, calculate });
});
