(function exposeMcpTokenService(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.McpTokenService = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create({ authenticationService, endpoint, publishableKey, fetchImpl = (...args) => fetch(...args) }) {
    if (!authenticationService || !endpoint || !publishableKey) throw new TypeError('authentication service, endpoint and publishable key are required');
    async function request(payload) {
      const session = await authenticationService.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('Session expirée. Reconnectez-vous.');
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + accessToken, apikey: publishableKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({ error: 'Réponse serveur illisible.' }));
      if (!response.ok) throw new Error(result.error || 'Impossible de gérer le jeton MCP.');
      return result;
    }
    async function ensureUser(user) {
      if (!user) throw new Error('Connectez-vous avant de gérer les jetons MCP.');
    }
    return Object.freeze({
      async list({ user }) { await ensureUser(user); return request({ action: 'list' }); },
      async create({ user, ...payload }) { await ensureUser(user); return request({ action: 'create', ...payload }); },
      async revoke({ user, ...payload }) { await ensureUser(user); return request({ action: 'revoke', ...payload }); }
    });
  }
  return Object.freeze({ create });
});
