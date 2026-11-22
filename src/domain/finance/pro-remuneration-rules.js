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
    || /^(?:vers\s+\S|virement\\b|transfert\\b)/i.test(String(transaction.label || '').trim());
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

  function calculate({ transactions = [], accountId, previousInvoiceDate, invoiceDate, caHt, socialRate = 45, cashBalance = null, displaySort = 'date-desc' } = {}) {
    if (!accountId) throw new TypeError('Un compte professionnel doit être sélectionné.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(previousInvoiceDate || '') || !/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate || '')) {
      throw new TypeError('Les deux dates de facture sont obligatoires.');
    }
    if (invoiceDate <= previousInvoiceDate) throw new RangeError('La nouvelle facture doit être postérieure à la facture précédente.');
    const turnover = Number(caHt);
    const rate = Number(socialRate);
    if (!Number.isFinite(turnover) || turnover < 0) throw new TypeError('Le chiffre d’affaires HT doit être un montant positif ou nul.');
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new RangeError('Le taux de cotisations doit être compris entre 0 et 100 %.');

    const accountTransactions = transactions.filter(item => item.accountId === accountId);
    const ordered = displayOrder(accountTransactions, displaySort);
    const invoiceRows = ordered.map((item, index) => ({ item, index })).filter(row => isInvoice(row.item));
    const currentInvoice = invoiceRows.find(row => row.item.date === invoiceDate);
    const previousInvoice = invoiceRows.find(row => row.item.date === previousInvoiceDate && (!currentInvoice || row.index > currentInvoice.index));
    const nextInvoice = currentInvoice ? invoiceRows.find(row => row.index > currentInvoice.index) : null;
    let pastRows;
    let futureRows;
    let futurePeriodEndDate = addOneMonth(invoiceDate);

    if (currentInvoice && previousInvoice) {
      // In the newest-first table, the current invoice is above the previous one.
      // The invoice rows are exclusive bounds; position resolves same-day operations.
      pastRows = ordered.slice(currentInvoice.index + 1, previousInvoice.index);
    } else {
      // Backward compatibility until both historical invoice rows are identified.
      pastRows = ordered.filter(item => item.date >= previousInvoiceDate && item.date <= invoiceDate && !isInvoice(item));
    }
    if (currentInvoice) {
      const endIndex = nextInvoice ? nextInvoice.index : ordered.length;
      futureRows = ordered.slice(currentInvoice.index + 1, endIndex);
      if (nextInvoice) futurePeriodEndDate = nextInvoice.item.date;
    } else {
      futureRows = ordered.filter(item => item.date > invoiceDate && item.date <= futurePeriodEndDate);
    }

    const pastChargeItems = pastRows.filter(item => Number(item.amount) < 0
      && !isInvoice(item) && !isTransfer(item) && !isAlreadyProvisionedCharge(item))
      .map(item => ({ id: String(item.id), date: item.date, label: String(item.label || 'Charge'), amount: roundMoney(Math.abs(Number(item.amount))) }));

    const futureChargeItems = futureRows.filter(item => item.isPaid !== true && Number(item.amount) < 0
      && !isInvoice(item) && !isTransfer(item) && !isAlreadyProvisionedCharge(item))
      .map(item => ({ id: String(item.id), date: item.date, label: String(item.label || 'Charge à venir'), amount: roundMoney(Math.abs(Number(item.amount))) }));

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
      accountId, previousInvoiceDate, invoiceDate, futurePeriodEndDate, caHt: roundMoney(turnover), socialRate: rate,
      pastCharges, pastChargeItems, availableResult, remuneration, socialProvision,
      futureCharges, futureChargeItems, transferAmount, cashBalance: normalizedCashBalance,
      cashRemaining, resultIsNegative: availableResult < 0,
      futureChargesExceedRemuneration: transferBeforeFloor < 0,
      futureShortfall: roundMoney(Math.max(0, -transferBeforeFloor))
    };
  }

  return Object.freeze({ roundMoney, normalizeSimulations, isInvoice, displayOrder, calculate });
});
