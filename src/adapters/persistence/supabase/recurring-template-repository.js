/**
 * Supabase repository for recurring transaction templates.
 */
(function exposeSupabaseRecurringTemplateRepository(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SupabaseRecurringTemplateRepository = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function create({ client, userId }) {
    if (!client || typeof client.from !== 'function') throw new TypeError('client must expose from(table)');
    if (!userId) throw new TypeError('userId is required');
    return Object.freeze({
      async listAll() {
        const { data, error } = await client.from('recurring_templates').select('*');
        if (error) throw error;
        return data || [];
      },
      async upsertMany(rows) {
        if (!Array.isArray(rows)) throw new TypeError('rows must be an array');
        if (!rows.length) return;
        const { error } = await client.from('recurring_templates').upsert(rows, { onConflict: 'user_id,id' });
        if (error) throw error;
      },
      async deleteById(id) {
        const { error } = await client.from('recurring_templates').delete().eq('id', id).eq('user_id', userId);
        if (error) throw error;
      }
    });
  }
  return Object.freeze({ create });
});
