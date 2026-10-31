/**
 * Portfolio valuation and net-worth read use cases.
 * State and market data are injected; no browser, storage or network access here.
 */
(function exposeWealthSnapshotQueries(root) {
  'use strict';
  function create({
    accounts, balanceAt, stockHoldings, cryptoHoldings, stockPriceDetails, cryptoPrice,
    isManualValueHolding, manualHoldingValue, lombardCredit, effectiveAccountType
  }) {
    const required = {
      accounts, balanceAt, stockHoldings, cryptoHoldings, stockPriceDetails, cryptoPrice,
      isManualValueHolding, manualHoldingValue, lombardCredit, effectiveAccountType
    };
    for (const [name, dependency] of Object.entries(required)) {
      if (typeof dependency !== 'function') throw new TypeError(name + ' dependency is required');
    }
    function stockValue(holding) {
      if (isManualValueHolding(holding)) return manualHoldingValue(holding);
      const details = stockPriceDetails(holding);
      return details.price !== null
        ? Number(holding.quantity || 0) * details.price
        : Number(holding.invested || 0);
    }
    function stockValueForAccount(accountId) {
      return stockHoldings().filter(holding => holding.accountId === accountId).reduce((sum, holding) => sum + stockValue(holding), 0);
    }
    function totalAccountsBalance() {
      return accounts().reduce((sum, account) => sum + balanceAt(account.id), 0);
    }
    function totalStockValue() {
      return accounts().reduce((sum, account) => sum + stockValueForAccount(account.id), 0);
    }
    function totalCryptoValue() {
      return cryptoHoldings().reduce((sum, holding) => {
        const price = cryptoPrice(holding);
        return sum + (price !== null ? Number(holding.quantity || 0) * price : Number(holding.invested || 0));
      }, 0);
    }
    function accountOverviewBalance(accountId) {
      return balanceAt(accountId) + stockValueForAccount(accountId);
    }
    function lombardAmount() {
      return Math.max(0, Number(lombardCredit()?.amount) || 0);
    }
    return Object.freeze({
      balanceAt,
      stockValueForAccount,
      totalAccountsBalance,
      totalStockValue,
      totalCryptoValue,
      accountOverviewBalance,
      lombardAmount,
      snapshot() {
        const accountTotal = totalAccountsBalance(), stocks = totalStockValue(), crypto = totalCryptoValue();
        const gross = accountTotal + stocks + crypto, debt = lombardAmount();
        const investments = stockHoldings().reduce((sum, holding) => sum + stockValue(holding), 0);
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
