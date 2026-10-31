/**
 * Supabase recurring-template row mapping.
 */
(function exposeSupabaseRecurringTemplateMapper(root) {
  'use strict';
  const api = Object.freeze({
    toCloud(template, userId) {
      return {
        id: template.id, user_id: userId, account_id: template.accountId,
        day_of_month: Number(template.day) || 1, frequency: template.frequency,
        months: template.months || [], start_month: template.startMonth || null,
        end_month: template.endMonth || null, once_date: template.date || null,
        label: template.label, amount: template.amount === '' || template.amount === undefined ? null : template.amount,
        enabled: template.enabled !== false
      };
    },
    fromCloud(template) {
      return {
        id: template.id, accountId: template.account_id, day: Number(template.day_of_month) || 1,
        frequency: template.frequency, months: template.months || [],
        startMonth: template.start_month || undefined, endMonth: template.end_month || undefined,
        date: template.once_date || undefined, label: template.label,
        amount: template.amount === null ? null : Number(template.amount), enabled: template.enabled
      };
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SupabaseRecurringTemplateMapper = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
