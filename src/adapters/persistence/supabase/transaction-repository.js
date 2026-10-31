/**
 * Supabase transaction repository.
 * Owns transaction-table queries and the legacy-schema compatibility fallback.
 */
(function exposeSupabaseTransactionRepository(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SupabaseTransactionRepository = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LEGACY_SCHEMA_ERROR = /recurring.?key|is_paid|sort_order|schema cache|column.*not found/i;

  function create({ client, userId }) {
    if (!client || typeof client.from !== 'function') throw new TypeError('client must expose from(table)');
    if (!userId) throw new TypeError('userId is required');

    return Object.freeze({
      async listAll() {
        const { data, error } = await client.from('transactions').select('*');
        if (error) throw error;
        return data || [];
      },

      async upsertMany(rows) {
        if (!Array.isArray(rows)) throw new TypeError('rows must be an array');
        if (!rows.length) return { compatibilityFallback: false };
        let result = await client.from('transactions').upsert(rows, { onConflict: 'id' });
        if (result.error && LEGACY_SCHEMA_ERROR.test(result.error.message || '')) {
          const compatibleRows = rows.map(({ recurring_key, is_paid, sort_order, ...row }) => row);
          result = await client.from('transactions').upsert(compatibleRows, { onConflict: 'id' });
          if (result.error) throw result.error;
          return { compatibilityFallback: true };
        }
        if (result.error) throw result.error;
        return { compatibilityFallback: false };
      },

      async deleteById(id) {
        const { error } = await client.from('transactions').delete().eq('id', id).eq('user_id', userId);
        if (error) throw error;
      }
    });
  }

  return Object.freeze({ create });
});
