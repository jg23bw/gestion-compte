/**
 * Supabase Auth user-metadata persistence adapter.
 * Keeps the Auth SDK interaction and refreshed user/session propagation outside app.js.
 */
(function exposeSupabaseAuthMetadataRepository(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SupabaseAuthMetadataRepository = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create({ auth, onUserUpdated = () => {} }) {
    if (!auth || typeof auth.updateUser !== 'function') throw new TypeError('auth must expose updateUser(metadata)');
    return Object.freeze({
      async update(metadata) {
        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new TypeError('metadata must be an object');
        const { data, error } = await auth.updateUser({ data: metadata });
        if (error) throw error;
        if (data && data.user) onUserUpdated(data.user);
        return data?.user || null;
      }
    });
  }
  return Object.freeze({ create });
});
