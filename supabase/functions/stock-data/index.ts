import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const STOCK_SEARCH_URL = "https://stockanalysis.com/api/search";
const STOCK_CHART_URL = "https://stockanalysis.com/api/charts/a/";
const UPSTREAM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; GestionComptes/1.0; +https://github.com/jg23bw/gestion-compte)",
};

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
