import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const STOCK_SEARCH_URL = "https://stockanalysis.com/api/search";
const COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/";
const STOCK_CHART_URL = "https://stockanalysis.com/api/charts/a/";
const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/";
const COINBASE_PRICE_URL = "https://api.coinbase.com/v2/prices/";
const CRYPTO_HISTORY_TTL = 6 * 60 * 60 * 1000;
const CRYPTO_HISTORY_CACHE: Map<string, { expires: number; points: HistoryPoint[] }> = new Map();
let coinGeckoNotBefore = 0;
const UPSTREAM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; GestionComptes/1.0; +https://github.com/jg23bw/gestion-compte)",
};

type HistoryPoint = { t: number; c: number };

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

async function authenticate(req: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("authorization") ?? "";
  if (!url || !anonKey || !authorization.startsWith("Bearer ")) return false;
  const response = await fetch(url + "/auth/v1/user", {
    headers: { Authorization: authorization, apikey: anonKey },
  });
  return response.ok;
}

async function searchStocks(query: string) {
  const response = await fetch(STOCK_SEARCH_URL + "?q=" + encodeURIComponent(query), {
    headers: UPSTREAM_HEADERS,
    cache: "no-store",
  });
  if (!response.ok) {
    return json(
      { error: response.status === 429 ? "limite de requêtes StockAnalysis atteinte, réessayez dans une minute" : "StockAnalysis a refusé la recherche (HTTP " + response.status + ")" },
      response.status === 429 ? 429 : 502,
    );
  }
  const payload = await response.json().catch(() => null);
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const data = rows
    .filter((item: Record<string, unknown>) => item && item.id && item.n)
    .slice(0, 20)
    .map((item: Record<string, unknown>) => ({
      id: String(item.id),
      s: String(item.s ?? ""),
      n: String(item.n),
      st: String(item.st ?? ""),
    }));
  return json({ data });
}

async function fetchStockHistory(id: string, period: string) {
  const periods: Record<string,string> = { "1m": "1M", "3m": "3M", "1y": "1Y", "5y": "5Y" };
  const selected = periods[period] ?? "1Y";
  const response = await fetch(STOCK_CHART_URL + encodeURIComponent(id) + "/" + selected + "/l", { headers: UPSTREAM_HEADERS, cache: "no-store" });
  if (!response.ok) return json({ error: response.status === 429 ? "limite de requêtes StockAnalysis atteinte, réessayez dans une minute" : "historique indisponible (HTTP " + response.status + ")" }, response.status === 429 ? 429 : 502);
  const payload = await response.json().catch(() => null);
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const points = rows.map((row: Record<string, unknown>) => {
    const rawTime = row?.t ?? row?.time ?? row?.date;
    const numericTime = typeof rawTime === "number" || /^\d+(?:\.\d+)?$/.test(String(rawTime ?? ""))
      ? Number(rawTime)
      : Date.parse(String(rawTime ?? ""));
    const price = Number(row?.c ?? row?.close);
    return { t: numericTime, c: price };
  })
    .filter((point: {t:number,c:number}) => Number.isFinite(point.t) && Number.isFinite(point.c) && point.c > 0)
    .map((point: {t:number,c:number}) => ({ t: point.t < 100000000000 ? point.t * 1000 : point.t, c: point.c }))
    .sort((a: {t:number,c:number}, b: {t:number,c:number}) => a.t - b.t);
  const closes = points.map((point: {t:number,c:number}) => point.c);
  const sma200 = closes.length >= 200 ? closes.map((_: number, i: number) => i >= 199 ? closes.slice(i - 199, i + 1).reduce((sum: number, n: number) => sum + n, 0) / 200 : null) : [];
  return json({ id, period: selected, points, sma200 });
}

function dailyHistoryPoints(entries: Array<[number, number]>): HistoryPoint[] {
  const daily = new Map<string, HistoryPoint>();
  for (const [time, price] of entries) {
    if (!Number.isFinite(time) || !Number.isFinite(price) || price <= 0) continue;
    daily.set(new Date(time).toISOString().slice(0, 10), { t: time, c: price });
  }
  return [...daily.values()].sort((a, b) => a.t - b.t);
}

// Source principale : Yahoo Finance, paires crypto/EUR (pas de clé, quotas bien plus
// larges que l'API publique CoinGecko partagée entre les projets Supabase).
async function fetchCryptoHistoryFromYahoo(symbol: string, days: number): Promise<HistoryPoint[] | null> {
  const range = days === 1825 ? "5y" : "1y";
  const url = YAHOO_CHART_URL + encodeURIComponent(symbol + "-EUR") + "?range=" + range + "&interval=1d";
  const response = await fetch(url, { headers: UPSTREAM_HEADERS, cache: "no-store" });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  const result = payload?.chart?.result?.[0];
  if (!result || String(result?.meta?.currency ?? "").toUpperCase() !== "EUR") return null;
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const closes = Array.isArray(result?.indicators?.quote?.[0]?.close) ? result.indicators.quote[0].close : [];
  const entries: Array<[number, number]> = timestamps.map((timestamp: unknown, index: number) => [Number(timestamp) * 1000, Number(closes[index])]);
  const points = dailyHistoryPoints(entries);
  return points.length ? points : null;
}

// Repli : CoinGecko, qui couvre les cryptos absentes de Yahoo. Une clé de démonstration
// facultative (secret Edge COINGECKO_API_KEY) relève le quota ; elle n'est jamais envoyée
// au navigateur.
function coinGeckoHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...UPSTREAM_HEADERS };
  const apiKey = Deno.env.get("COINGECKO_API_KEY") ?? "";
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey;
  return headers;
}

// Repli de prix : Coinbase (spot EUR, sans clé) quand CoinGecko est limité ou incomplet.
async function fetchCryptoPriceFromCoinbase(symbol: string): Promise<number | null> {
  const response = await fetch(COINBASE_PRICE_URL + encodeURIComponent(symbol + "-EUR") + "/spot", { headers: UPSTREAM_HEADERS, cache: "no-store" });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  const price = Number(payload?.data?.amount);
  const currency = String(payload?.data?.currency ?? "").toUpperCase();
  return Number.isFinite(price) && price > 0 && currency === "EUR" ? price : null;
}

async function fetchCryptoHistoryFromCoinGecko(id: string, days: number): Promise<{ points?: HistoryPoint[]; error?: string; status?: number }> {
  if (Date.now() < coinGeckoNotBefore) {
    return { error: "Limite CoinGecko atteinte ; réessaie dans une minute.", status: 429 };
  }
  const response = await fetch(COINGECKO_URL + encodeURIComponent(id) + "/market_chart?vs_currency=eur&days=" + days, { headers: coinGeckoHeaders(), cache: "no-store" });
  if (!response.ok) {
    if (response.status === 429) coinGeckoNotBefore = Date.now() + 60000;
    return {
      error: response.status === 429 ? "Limite CoinGecko atteinte ; réessaie dans une minute." : "CoinGecko n’a pas fourni l’historique (HTTP " + response.status + ").",
      status: response.status === 429 ? 429 : 502,
    };
  }
  const payload = await response.json().catch(() => null);
  const prices = Array.isArray(payload?.prices) ? payload.prices : [];
  const points = dailyHistoryPoints(prices.map((item: unknown) => [Number((item as number[])?.[0]), Number((item as number[])?.[1])] as [number, number]));
  if (!points.length) return { error: "CoinGecko n’a renvoyé aucun cours historique.", status: 502 };
  return { points };
}

async function fetchStockPrice(id: string) {
  let lastStatus = 0;
  for (const period of ["1D", "1Y"]) {
    const response = await fetch(STOCK_CHART_URL + encodeURIComponent(id) + "/" + period + "/l", {
      headers: UPSTREAM_HEADERS,
      cache: "no-store",
    });
    lastStatus = response.status;
    if (!response.ok) {
      if (response.status === 429) {
        return json({ error: "limite de requêtes StockAnalysis atteinte, réessayez dans une minute" }, 429);
      }
      continue;
    }
    const payload = await response.json().catch(() => null);
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    for (let index = rows.length - 1; index >= 0; index--) {
      const price = Number(rows[index]?.c);
      if (Number.isFinite(price) && price > 0) return json({ price, period, id });
    }
  }
  return json(
    { error: lastStatus ? "aucun cours reçu de StockAnalysis (HTTP " + lastStatus + ")" : "aucun cours reçu de StockAnalysis" },
    lastStatus === 429 ? 429 : 502,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Utilisez POST." }, 405);
  if (!(await authenticate(req).catch(() => false))) return json({ error: "Session Supabase requise." }, 401);

  try {
    const body = await req.json();
    const action = String(body?.action ?? "");
    if (action === "search") {
      const query = String(body?.query ?? "").trim();
      if (query.length < 2 || query.length > 80) return json({ error: "Recherche invalide." }, 400);
      return await searchStocks(query);
    }
    if (action === "crypto-market") {
      const ids = Array.isArray(body?.ids) ? [...new Set(body.ids.map((id: unknown) => String(id).trim()).filter((id: string) => /^[a-z0-9-]{1,80}$/.test(id)))].slice(0, 50) : [];
      if (!ids.length) return json({ error: "Identifiants crypto invalides." }, 400);
      const rawSymbols: Record<string, unknown> = body?.symbols && typeof body.symbols === "object" ? body.symbols : {};
      const symbols: Record<string, string> = {};
      for (const id of ids) {
        const symbol = String(rawSymbols[id] ?? "").trim().toUpperCase();
        if (/^[A-Z0-9.\-]{1,20}$/.test(symbol)) symbols[id] = symbol;
      }
      let rows: Array<Record<string, unknown>> = [];
      let upstreamError = "";
      let upstreamStatus = 0;
      if (Date.now() < coinGeckoNotBefore) {
        upstreamError = "Limite CoinGecko atteinte ; réessaie dans une minute.";
        upstreamStatus = 429;
      } else {
        const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids=" + encodeURIComponent(ids.join(",")) + "&sparkline=false&per_page=250&price_change_percentage=24h%2C7d%2C30d";
        const response = await fetch(url, { headers: coinGeckoHeaders(), cache: "no-store" });
        if (!response.ok) {
          if (response.status === 429) coinGeckoNotBefore = Date.now() + 60000;
          upstreamStatus = response.status === 429 ? 429 : 502;
          upstreamError = response.status === 429 ? "Limite CoinGecko atteinte ; réessaie dans une minute." : "CoinGecko indisponible (HTTP " + response.status + ").";
        } else {
          const data = await response.json().catch(() => null);
          rows = Array.isArray(data) ? data : [];
        }
      }
      const found = new Set(rows.map((row) => String(row?.id ?? "")));
      const missing = ids.filter((id) => !found.has(id) && symbols[id]).slice(0, 20);
      if (missing.length) {
        const prices = await Promise.all(missing.map((id) => fetchCryptoPriceFromCoinbase(symbols[id]).catch(() => null)));
        missing.forEach((id, index) => {
          const price = prices[index];
          if (!price) return;
          // Les variations ne sont pas inventées : elles restent absentes jusqu'au retour de CoinGecko.
          rows.push({ id, current_price: price, image: null, price_change_percentage_24h: null, price_change_percentage_7d_in_currency: null, price_change_percentage_30d_in_currency: null, source: "coinbase" });
        });
      }
      if (!rows.length) return json({ error: upstreamError || "Aucun prix crypto reçu." }, upstreamStatus || 502);
      return json({ data: rows });
    }
    if (action === "crypto-history") {
      const id = String(body?.id ?? "").trim();
      const days = Number(body?.days ?? 365);
      if (!/^[A-Za-z0-9-]{1,80}$/.test(id) || ![365, 1825].includes(days)) return json({ error: "Paramètres d’historique crypto invalides." }, 400);
      const symbol = String(body?.symbol ?? "").trim().toUpperCase();
      const yahooSymbol = /^[A-Z0-9.\-]{1,20}$/.test(symbol) ? symbol : "";
      const cacheKey = id + "|" + yahooSymbol + "|" + days;
      const cached = CRYPTO_HISTORY_CACHE.get(cacheKey);
      if (cached && cached.expires > Date.now()) return json({ id, source: "cache", points: cached.points });
      if (yahooSymbol) {
        const points = await fetchCryptoHistoryFromYahoo(yahooSymbol, days).catch(() => null);
        if (points) {
          CRYPTO_HISTORY_CACHE.set(cacheKey, { expires: Date.now() + CRYPTO_HISTORY_TTL, points });
          return json({ id, source: "yahoo", points });
        }
      }
      const fallback = await fetchCryptoHistoryFromCoinGecko(id, days);
      if (fallback.points?.length) {
        CRYPTO_HISTORY_CACHE.set(cacheKey, { expires: Date.now() + CRYPTO_HISTORY_TTL, points: fallback.points });
        return json({ id, source: "coingecko", points: fallback.points });
      }
      return json({ error: fallback.error ?? "Historique crypto indisponible." }, fallback.status ?? 502);
    }
    if (action === "history") {
      const id = String(body?.id ?? "").trim();
      if (!/^[A-Za-z0-9._-]{1,40}$/.test(id)) return json({ error: "Identifiant de titre invalide." }, 400);
      return await fetchStockHistory(id, String(body?.period ?? "1y"));
    }
    if (action === "price") {
      const id = String(body?.id ?? "").trim();
      if (!/^[A-Za-z0-9._-]{1,40}$/.test(id)) return json({ error: "Identifiant de titre invalide." }, 400);
      return await fetchStockPrice(id);
    }
    return json({ error: "Action inconnue." }, 400);
  } catch (error) {
    console.error("stock-data failed", error);
    return json({ error: "Service boursier indisponible." }, 502);
  }
});
