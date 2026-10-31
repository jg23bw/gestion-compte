/**
 * Loads the authenticated user's cloud state through persistence ports.
 * Keeps Supabase reads and cloud-to-domain mapping outside UI orchestration.
 */
(function exposeCloudStateLoader(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CloudStateLoader = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function create({
    accountRepository,
    transactionRepository,
    recurringTemplateRepository,
    cryptoHoldingRepository,
    mapAccount,
    mapTransaction,
    mapRecurringTemplate,
    mapCryptoHolding,
    normalizeLombardCredit,
    normalizeAccountTypes,
    normalizeAccountPledges,
    normalizeStockHoldings,
    isMissingCryptoTable
  }) {
    const dependencies = {
      accountRepository, transactionRepository, recurringTemplateRepository,
      cryptoHoldingRepository, mapAccount, mapTransaction, mapRecurringTemplate,
      mapCryptoHolding, normalizeLombardCredit, normalizeAccountTypes,
      normalizeAccountPledges, normalizeStockHoldings, isMissingCryptoTable
    };
    for (const [name, dependency] of Object.entries(dependencies)) {
      if (typeof dependency !== 'function') throw new TypeError(name + ' must be a function');
    }

    return Object.freeze({
      async load({ client, user }) {
        if (!client || !user || !user.id) throw new TypeError('client and authenticated user are required');

        const repositoryOptions = { client, userId: user.id };
        const accounts = accountRepository(repositoryOptions);
        const transactions = transactionRepository(repositoryOptions);
        const templates = recurringTemplateRepository(repositoryOptions);
        const crypto = cryptoHoldingRepository(repositoryOptions);

        const [accountRows, transactionRows, templateRows] = await Promise.all([
          accounts.listAll(),
          transactions.listAll(),
          templates.listAll()
        ]);

        let cryptoTableReady = true;
        let cryptoRows = [];
        try {
          cryptoRows = await crypto.listAll();
        } catch (error) {
          if (!isMissingCryptoTable(error)) throw error;
          cryptoTableReady = false;
        }

        const metadata = user.user_metadata || {};
        const accountTypes = normalizeAccountTypes(metadata.accountTypes);
        const accountPledges = normalizeAccountPledges(metadata.accountPledges);

        return {
          accounts: (accountRows || []).map(row => mapAccount(row, accountTypes)),
          transactions: (transactionRows || [])
            .slice()
            .sort((a, b) => String(a.transaction_date || '').localeCompare(String(b.transaction_date || '')))
            .map(mapTransaction),
          recurringTemplates: (templateRows || []).map(mapRecurringTemplate),
          cryptoHoldings: cryptoTableReady ? (cryptoRows || []).map(mapCryptoHolding) : [],
          cryptoTableReady,
          lombardCredit: normalizeLombardCredit(metadata.lombardCredit),
          accountTypes,
          accountPledges,
          stockHoldings: normalizeStockHoldings(metadata.stockHoldings)
        };
      }
    });
  }

  return Object.freeze({ create });
});
