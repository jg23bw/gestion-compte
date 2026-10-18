import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const VERSION = "2025-06-18";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-protocol-version, mcp-session-id, accept",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Content-Type": "application/json",
};

type Json = Record<string, unknown>;
const json = (body: Json, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });
const rpcError = (id: unknown, code: number, message: string) => ({
  jsonrpc: "2.0", id: id ?? null, error: { code, message },
});

async function authenticate(req: Request) {
  const supplied = req.headers.get("authorization") ?? "";
  if (!supplied.startsWith("Bearer gdc_")) return null;
  const token = supplied.slice("Bearer ".length);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
  const rows = await supabaseRequest(`mcp_tokens?token_hash=eq.${hash}&revoked_at=is.null&select=id,user_id,default_account_id&limit=1`);
  if (!rows?.length) return null;
  await supabaseRequest(`mcp_tokens?id=eq.${rows[0].id}`, {
    method: "PATCH", body: JSON.stringify({ last_used_at: new Date().toISOString() }),
  });
  return rows[0] as { id: string; user_id: string; default_account_id: string | null };
}
function textResult(value: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value };
}
function tool(name: string, description: string, properties: Json, required: string[] = []) {
  return { name, description, inputSchema: { type: "object", properties, required, additionalProperties: false } };
}
function response(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Configuration Supabase manquante dans les secrets de la fonction.");
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
  if (!res.ok) throw new Error("Supabase a refusé l'opération (" + res.status + "): " + body.slice(0, 400));
  return body ? JSON.parse(body) : null;
}
async function listAccounts(credential: { user_id: string }) {
  const uid = credential.user_id;
  return await supabaseRequest(`accounts?user_id=eq.${uid}&select=id,name,kind&order=name.asc`);
}
async function addTransaction(args: Json, credential: { user_id: string; default_account_id: string | null }) {
  const uid = credential.user_id;
  const label = String(args.label ?? "").trim();
  const amount = Number(args.amount);
  const date = String(args.date ?? new Date().toISOString().slice(0, 10));
  let accountId = String(args.account_id ?? credential.default_account_id ?? "").trim();
  if (!label || label.length > 120) throw new Error("Le libellé doit contenir entre 1 et 120 caractères.");
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100000000) throw new Error("Montant invalide. Utilisez un montant non nul en euros, négatif pour une dépense et positif pour une entrée.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + "T12:00:00Z"))) throw new Error("Date invalide : utilisez AAAA-MM-JJ.");
  if (!accountId) {
    const accounts = await listAccounts(credential);
    if (accounts.length === 1) accountId = accounts[0].id;
    else throw new Error("Compte non précisé. Appelez list_accounts puis choisissez un compte, ou configurez MCP_DEFAULT_ACCOUNT_ID.");
  }
  const accounts = await supabaseRequest(`accounts?user_id=eq.${uid}&id=eq.${encodeURIComponent(accountId)}&select=id,name`);
  if (!accounts.length) throw new Error("Compte introuvable dans les comptes de l'utilisateur autorisé.");
  const rows = await supabaseRequest("transactions", {
    method: "POST",
    body: JSON.stringify([{
      user_id: uid,
      account_id: accountId,
      transaction_date: date,
      label,
      amount: Math.round(amount * 100) / 100,
      source: "manual",
      is_paid: false,
    }]),
  });
  return { transaction: rows[0], account: accounts[0], message: "Transaction ajoutée." };
}
async function recentTransactions(args: Json, credential: { user_id: string }) {
  const uid = credential.user_id;
  const limit = Math.max(1, Math.min(20, Number(args.limit ?? 10) || 10));
  return await supabaseRequest(`transactions?user_id=eq.${uid}&select=id,transaction_date,label,amount,account_id,is_paid&order=created_at.desc&limit=${limit}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const credential = await authenticate(req).catch(() => null);
  if (!credential) return json({ error: "Jeton MCP invalide ou révoqué." }, 401);
  if (req.method !== "POST") return json({ error: "MCP endpoint expects POST." }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json(rpcError(null, -32700, "Invalid JSON")); }
  const id = body?.id ?? null;
  const method = body?.method;
  try {
    if (method === "initialize") {
      return json(response(id, {
        protocolVersion: body?.params?.protocolVersion ?? VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "gestion-comptes", title: "Gestion de comptes", version: "1.0.0" },
      }));
    }
    if (method === "notifications/initialized" || method === "notifications/cancelled") {
      return new Response(null, { status: 202, headers: corsHeaders });
    }
    if (method === "ping") return json(response(id, {}));
    if (method === "tools/list") {
      return json(response(id, { tools: [
        tool("list_accounts", "Liste les comptes de l'utilisateur autorisé. À utiliser pour choisir le compte cible si aucun compte par défaut n'est configuré.", {}),
        tool("add_transaction", "Ajoute une transaction dans Gestion de comptes. Montant en euros : négatif pour une dépense (ex. pain 2 € => label='Pain', amount=-2), positif pour une entrée. La date est aujourd'hui si elle est omise. account_id est facultatif si MCP_DEFAULT_ACCOUNT_ID est configuré.", {
          label: { type: "string", minLength: 1, maxLength: 120 },
          amount: { type: "number", description: "Montant en euros, négatif pour une dépense, positif pour une entrée." },
          date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Date au format AAAA-MM-JJ, facultative." },
          account_id: { type: "string", description: "ID du compte; facultatif si un compte par défaut est configuré." },
        }, ["label", "amount"]),
        tool("list_recent_transactions", "Affiche les dernières transactions pour vérifier ce qui a été enregistré.", {
          limit: { type: "integer", minimum: 1, maximum: 20 },
        }),
      ] }));
    }
    if (method === "tools/call") {
      const name = String(body?.params?.name ?? "");
      const args = (body?.params?.arguments ?? {}) as Json;
      let result: unknown;
      if (name === "list_accounts") result = await listAccounts(credential);
      else if (name === "add_transaction") result = await addTransaction(args, credential);
      else if (name === "list_recent_transactions") result = await recentTransactions(args, credential);
      else return json(rpcError(id, -32602, "Unknown tool: " + name));
      return json(response(id, textResult(result)));
    }
    return json(rpcError(id, -32601, "Method not found: " + String(method)));
  } catch (error) {
    return json(response(id, { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }] }));
  }
});
