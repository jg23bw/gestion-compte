/**
 * Supabase account row mapping. Application-specific account labels and bank identity
 * are injected so the adapter remains independent from the UI.
 */
(function exposeSupabaseAccountMapper(root) {
  'use strict';
  function create({ bankKeyForAccount, accountShort, bankKeyFromId, isBankKey, accountTypeCommands }) {
    return Object.freeze({
      toCloud(account, userId) {
        return {
          id: account.id, user_id: userId, name: account.name,
          short: 'bank:' + bankKeyForAccount(account), kind: account.kind,
          opening: Number(account.opening) || 0, vat_rate: Number(account.vatRate ?? 20),
          social_rate: Number(account.socialRate ?? 45), net_opening: Number(account.netOpening) || 0
        };
      },
      fromCloud(account, accountTypes = {}) {
        const rawShort = String(account.short || '');
        const token = /^bank:([a-z0-9-]+)$/i.exec(rawShort);
        const bank = token && isBankKey(token[1]) ? token[1].toLowerCase() : bankKeyFromId(account.id);
        const kind = account.kind || 'bank';
        const accountType = accountTypeCommands.typeFor(kind, accountTypes?.[account.id]);
        return {
          id: account.id, name: account.name, short: accountShort(account.name),
          bank, kind, accountType, opening: Number(account.opening) || 0,
          vatRate: Number(account.vat_rate ?? 20), socialRate: Number(account.social_rate ?? 45),
          netOpening: Number(account.net_opening) || 0
        };
      }
    });
  }
  const api = Object.freeze({ create });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SupabaseAccountMapper = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
