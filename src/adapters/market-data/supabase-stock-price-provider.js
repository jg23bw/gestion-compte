(function exposeSupabaseStockPriceProvider(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SupabaseStockPriceProvider = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create({ getClient, functionName, now = Date.now }) {
    if (typeof getClient !== 'function') throw new TypeError('client provider is required');
    if (!functionName) throw new TypeError('function name is required');
    const cooldownUntil = new Map();

    async function invoke(action, payload = {}) {
      const operation = String(action || '').trim();
      if (!operation) throw new TypeError('market data action is required');
      if (now() < (cooldownUntil.get(operation) || 0)) {
        throw new Error('Fournisseur temporairement limité : réessaie dans une minute.');
      }
      const client = getClient();
      if (!client?.functions?.invoke) throw new Error('connexion cloud requise pour les données boursières');
      const { data, error } = await client.functions.invoke(functionName, { body: { action: operation, ...payload } });
      if (error) {
        let message = error.message || 'service boursier indisponible';
        try {
          if (error.context && typeof error.context.json === 'function') {
            const body = await error.context.json();
            if (body?.error) message = body.error;
          }
        } catch (_) {}
        const status = Number(error.context?.status || error.status || 0);
        if (status === 429 || /rate limit|too many requests|limite.*atteinte/i.test(message)) {
          cooldownUntil.set(operation, now() + 60000);
          message = 'Limite du fournisseur de données atteinte (HTTP 429). Les nouvelles requêtes sont suspendues pendant une minute.';
        } else if (status >= 500) message = 'Service de données temporairement indisponible (HTTP ' + status + '). Réessaie plus tard.';
        else if (status === 404) message = 'Historique indisponible pour cet actif (HTTP 404).';
        else if (error instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(message)) message = 'réseau indisponible';
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    }

    return Object.freeze({
      invoke,
      async getPrice(id) {
        if (!id) throw new TypeError('price id is required');
        const data = await invoke('price', { id });
        const price = Number(data?.price);
        if (!Number.isFinite(price) || price <= 0) throw new Error('aucun cours reçu');
        return price;
      }
    });
  }
  return Object.freeze({ create });
});
