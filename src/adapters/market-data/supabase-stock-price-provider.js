(function exposeSupabaseStockPriceProvider(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SupabaseStockPriceProvider = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create({ getClient, functionName, now = Date.now }) {
    if (typeof getClient !== 'function') throw new TypeError('client provider is required');
    if (!functionName) throw new TypeError('function name is required');
    let cooldownUntil = 0;
    const inFlight = new Map();

    async function invoke(action, payload = {}) {
      const operation = String(action || '').trim();
      if (!operation) throw new TypeError('market data action is required');
      if (now() < cooldownUntil) {
        throw new Error('Fournisseur temporairement limité : réessaie dans une minute.');
      }
      const key = operation + ':' + JSON.stringify(payload || {});
      if (inFlight.has(key)) return inFlight.get(key);
      const request = (async () => {
        const client = getClient();
        if (!client?.functions?.invoke) throw new Error('connexion cloud requise pour les données boursières');
        const { data, error } = await client.functions.invoke(functionName, { body: { action: operation, ...payload } });
        if (error) {
          let message = error.message || 'service boursier indisponible';
          const status = Number(error.context?.status || error.status || 0);
          try {
            if (error.context && typeof error.context.clone === 'function') {
              const body = await error.context.clone().json();
              if (body?.error) message = body.error;
            } else if (error.context && typeof error.context.json === 'function') {
              const body = await error.context.json();
              if (body?.error) message = body.error;
            }
          } catch (_) {}
          if (status === 429 || /rate limit|too many requests|limite.*atteinte/i.test(message)) {
            cooldownUntil = now() + 60000;
            message = 'Limite du fournisseur de données atteinte (HTTP 429). Les nouvelles requêtes sont suspendues pendant une minute.';
          } else if (status >= 500) message = 'Service de données temporairement indisponible (HTTP ' + status + '). Réessaie plus tard.';
          else if (status === 404) message = 'Historique indisponible pour cet actif (HTTP 404).';
          else if (error instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(message)) message = 'réseau indisponible';
          throw new Error(message);
        }
        if (data?.error) throw new Error(data.error);
        return data;
      })();
      inFlight.set(key, request);
      try {
        return await request;
      } finally {
        inFlight.delete(key);
      }
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
