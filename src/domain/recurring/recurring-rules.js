/**
 * Pure recurring-template rules.
 */
(function exposeRecurringRules(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.RecurringRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function dueDateForTemplate(template, month) {
    if (!/^\d{4}-\d{2}$/.test(month)) return null;
    const [year, monthNumber] = month.split('-').map(Number);
    if (monthNumber < 1 || monthNumber > 12) return null;
    if (template.frequency === 'once') {
      return template.date === year + '-' + String(monthNumber).padStart(2, '0')
        + '-' + String(template.day).padStart(2, '0') ? template.date : null;
    }
    if (template.frequency === 'monthly') {
      if (template.startMonth && month < template.startMonth) return null;
      if (template.endMonth && month > template.endMonth) return null;
    } else if (template.frequency === 'quarterly' || template.frequency === 'annual') {
      if (!(template.months || []).includes(monthNumber)) return null;
    } else {
      return null;
    }
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const day = Math.min(Number(template.day) || 1, daysInMonth);
    return year + '-' + String(monthNumber).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }

  function buildTransactionsForMonth(templates, transactions, month, options = {}) {
    if (!/^\d{4}-\d{2}$/.test(month)) return [];
    const existingKeys = new Set((transactions || []).map(item => item.recurringKey).filter(Boolean));
    const createId = options.createId || (() => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
      throw new Error('Un générateur d’identifiants doit être fourni.');
    });
    const now = options.now || Date.now;
    const additions = [];
    (templates || []).forEach(template => {
      if (!template.enabled || template.amount === null || template.amount === undefined
        || template.amount === '' || !Number.isFinite(Number(template.amount))) return;
      const date = dueDateForTemplate(template, month);
      if (!date) return;
      const recurringKey = template.id + '@' + date;
      if (existingKeys.has(recurringKey)) return;
      additions.push({
        id: createId(), accountId: template.accountId, date,
        amount: Number(template.amount), label: template.label,
        createdAt: now() + additions.length, recurringKey, recurringTemplateId: template.id
      });
      existingKeys.add(recurringKey);
    });
    return additions;
  }

  return Object.freeze({ dueDateForTemplate, buildTransactionsForMonth });
});
