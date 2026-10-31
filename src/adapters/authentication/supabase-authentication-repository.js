/**
 * Supabase Auth adapter. SDK response envelopes and errors are handled here.
 */
(function exposeSupabaseAuthenticationRepository(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SupabaseAuthenticationRepository = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function create({ getClient }) {
    if (typeof getClient !== 'function') throw new TypeError('getClient must be a function');

    function authClient() {
      const client = getClient();
      if (!client || !client.auth) throw new TypeError('Supabase client with Auth is required');
      return client.auth;
    }

    async function unwrap(operation) {
      const { data, error } = await operation();
      if (error) throw error;
      return data || {};
    }

    return Object.freeze({
      async getSession() {
        const data = await unwrap(() => authClient().getSession());
        return data.session || null;
      },
      onAuthStateChange(callback) {
        if (typeof callback !== 'function') throw new TypeError('callback must be a function');
        const result = authClient().onAuthStateChange((event, session) => callback(event, session || null));
        if (result.error) throw result.error;
        return result.data?.subscription || null;
      },
      async signIn({ email, password }) {
        return unwrap(() => authClient().signInWithPassword({ email, password }));
      },
      async signUp({ email, password, emailRedirectTo }) {
        return unwrap(() => authClient().signUp({
          email,
          password,
          options: { emailRedirectTo }
        }));
      },
      async signOut() {
        await unwrap(() => authClient().signOut());
      }
    });
  }

  return Object.freeze({ create });
});
