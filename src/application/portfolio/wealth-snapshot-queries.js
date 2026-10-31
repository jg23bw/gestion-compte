(function exposeWealthSnapshotQueries(root) {
  'use strict';
  function create({ totalAccountsBalance, totalStockValue, totalCryptoValue, lombardAmount, stockHoldings, isManualValueHolding, manualHoldingValue, stockPriceDetails, accounts, effectiveAccountType, accountOverviewBalance }) {
    const required = { totalAccountsBalance, totalStockValue, totalCryptoValue, lombardAmount, stockHoldings, isManualValueHolding, manualHoldingValue, stockPriceDetails, accounts, effectiveAccountType, accountOverviewBalance };
    for (const [name, fn] of Object.entries(required)) if (typeof fn !== 'function') throw new TypeError(name + ' dependency is required');
    return Object.freeze({
      snapshot() {
        const accountTotal = totalAccountsBalance(), stocks = totalStockValue(), crypto = totalCryptoValue();
        const gross = accountTotal + stocks + crypto, debt = lombardAmount();
        const investments = stockHoldings().reduce((sum, holding) => {
          if (isManualValueHolding(holding)) return sum + manualHoldingValue(holding);
          const details = stockPriceDetails(holding);
          return sum + (details.price !== null ? Number(holding.quantity || 0) * details.price : Number(holding.invested || 0));
        }, 0);
        const liquid = accounts().filter(account => effectiveAccountType(account) !== 'pro')
          .reduce((sum, account) => sum + accountOverviewBalance(account.id), 0);
        return { accounts: accountTotal, stocks, crypto, gross, debt, net: gross - debt, investments, liquid };
      }
    });
  }
  const api = Object.freeze({ create });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.WealthSnapshotQueries = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
