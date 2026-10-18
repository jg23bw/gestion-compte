import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

function isAuthorized(req: Request) {
  const expected = Deno.env.get("MCP_ACCESS_TOKEN") ?? "";
  return expected.length >= 32 && req.headers.get("authorization") === `Bearer ${expected}`;
}
function configuredUserId() {
  const id = Deno.env.get("MCP_USER_ID") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Le secret MCP_USER_ID doit être l'UUID de l'utilisateur Supabase.");
  }
  return id;
}
async function db(path: string, init: RequestInit = {}) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Secrets Supabase manquants.");
  const res = await fetch(url + "/rest/v1/" + path, {
    ...init,
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.text();
  if (!res.ok) throw new Error("Échec Supabase (" + res.status + "): " + body.slice(0, 250));
  return body ? JSON.parse(body) : null;
}
function parisToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function parseEntry(input: string) {
  const raw = input.trim();
  if (!raw || raw.length > 200) throw new Error("Saisis un libellé et un montant, par exemple « pain 2 € ».");
  // Le montant doit être le dernier nombre de la saisie, éventuellement suivi de €.
  const match = raw.match(/(?:^|\s)([+-]?\s*\d+(?:[\s.,]\d{1,2})?)\s*(?:€|euros?|eur)?\s*$/i);
  if (!match) throw new Error("Montant introuvable. Exemple accepté : « pain 2 € » ou « salaire +2500 € ».");
  const token = match[1].replace(/\s/g, "").replace(",", ".");
  const parsed = Number(token);
  if (!Number.isFinite(parsed) || parsed === 0 || Math.abs(parsed) > 100000000) throw new Error("Montant invalide.");
  const before = raw.slice(0, match.index! + match[0].length - match[0].trimStart().length).trim();
  const explicitIncome = /^\s*\+/.test(match[1]) || /\b(reçu|recu|remboursement reçu|salaire|loyer reçu|virement reçu|entrée|entree|revenu)\b/i.test(before);
  const amount = Math.round(Math.abs(parsed) * (explicitIncome ? 100 : 100)) / 100 * (parsed < 0 ? -1 : explicitIncome ? 1 : -1);
  const label = raw.slice(0, match.index! + match[0].length - match[0].trimStart().length).replace(/[,:;\s]+$/, "").replace(/\s*[+-]?\s*\d+(?:[\s.,]\d{1,2})?\s*(?:€|euros?|eur)?\s*$/i, "").trim();
  const cleanLabel = label.replace(/^(ajoute|ajouter|dépense|depense|achat|note)\s+/i, "").trim();
  if (!cleanLabel) throw new Error("Libellé manquant. Exemple : « pain 2 € ».");
  return { label: cleanLabel.slice(0, 120), amount };
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!isAuthorized(req)) return json({ error: "Non autorisé." }, 401);
  if (req.method !== "POST") return json({ error: "Utilisez POST." }, 405);
  try {
    const body = await req.json();
    const text = String(body?.text ?? "").trim();
    const parsed = parseEntry(text);
    const uid = configuredUserId();
    const accountId = String(body?.account_id ?? Deno.env.get("MCP_DEFAULT_ACCOUNT_ID") ?? "").trim();
    if (!accountId) throw new Error("Configure MCP_DEFAULT_ACCOUNT_ID ou choisis un compte dans le raccourci.");
    const accounts = await db(`accounts?user_id=eq.${uid}&id=eq.${encodeURIComponent(accountId)}&select=id,name`);
    if (!accounts?.length) throw new Error("Compte par défaut introuvable. Vérifie MCP_DEFAULT_ACCOUNT_ID.");
    const prior = await db(`transactions?user_id=eq.${uid}&account_id=eq.${encodeURIComponent(accountId)}&select=sort_order&order=sort_order.desc.nullslast&limit=1`);
    const nextOrder = (Number(prior?.[0]?.sort_order) || 0) + 1;
    const date = typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : parisToday();
    const rows = await db("transactions", {
      method: "POST",
      body: JSON.stringify([{
        user_id: uid,
        account_id: accountId,
        transaction_date: date,
        label: parsed.label,
        amount: parsed.amount,
        source: "manual",
        is_paid: false,
        sort_order: nextOrder,
      }]),
    });
    return json({
      ok: true,
      message: "Transaction ajoutée.",
      transaction: { id: rows[0].id, date, label: parsed.label, amount: parsed.amount, account: accounts[0].name },
    });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
