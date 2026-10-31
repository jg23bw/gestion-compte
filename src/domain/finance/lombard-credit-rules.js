/**
 * Pure normalization rules for the user's Lombard credit metadata.
 * The shape is kept compatible with user_metadata.lombardCredit.
 */
(function exposeLombardCreditRules(root) {
  'use strict';
  function normalize(credit) {
    if (!credit || typeof credit !== 'object' || Array.isArray(credit)) return null;
    const rawRate = credit.rate;
    const rate = rawRate === '' || rawRate === null || rawRate === undefined ? null : Number(rawRate);
    return {
      label: (String(credit.label || 'Crédit lombard').trim() || 'Crédit lombard').slice(0, 120),
      amount: Math.max(0, Number(credit.amount) || 0),
      rate: Number.isFinite(rate) ? Math.min(100, Math.max(0, rate)) : null,
      notes: String(credit.notes || '').trim().slice(0, 500)
    };
  }
  const api = Object.freeze({ normalize });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.LombardCreditRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
