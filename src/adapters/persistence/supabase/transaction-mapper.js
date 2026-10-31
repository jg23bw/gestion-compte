/**
 * Supabase row mapper for transactions.
 * Keeps the database schema at the persistence boundary.
 */
(function exposeSupabaseTransactionMapper(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SupabaseTransactionMapper = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function create({ now = () => new Date() } = {}) {
    if (typeof now !== 'function') throw new TypeError('now must be a function');
    return Object.freeze({
      toCloud(transaction, userId) {
        const timestamp = now();
        const createdAt = Number(transaction.createdAt);
        const created = Number.isFinite(createdAt) && createdAt > 0
          ? new Date(createdAt)
          : timestamp;
        return {
          id: transaction.id,
          user_id: userId,
          account_id: transaction.accountId,
          transaction_date: transaction.date,
          label: transaction.label,
          amount: Number(transaction.amount),
          is_paid: transaction.isPaid === true,
          sort_order: Number.isFinite(Number(transaction.sortOrder)) ? Number(transaction.sortOrder) : null,
          source: transaction.recurringTemplateId ? 'recurring' : 'manual',
          recurring_template_id: transaction.recurringTemplateId || null,
          generated_month: transaction.recurringKey ? transaction.date.slice(0, 7) : null,
          recurring_key: transaction.recurringKey || null,
          created_at: created.toISOString(),
          updated_at: timestamp.toISOString()
        };
      },
      fromCloud(row) {
        const createdAt = Date.parse(row.created_at);
        return {
          id: row.id,
          accountId: row.account_id,
          date: row.transaction_date,
          amount: Number(row.amount),
          label: row.label,
          isPaid: row.is_paid === true,
          sortOrder: Number.isFinite(Number(row.sort_order)) && row.sort_order !== null ? Number(row.sort_order) : undefined,
          createdAt: Number.isFinite(createdAt) ? createdAt : now().getTime(),
          recurringKey: row.recurring_key || undefined,
          recurringTemplateId: row.recurring_template_id || undefined
        };
      }
    });
  }

  return Object.freeze({ create });
});
