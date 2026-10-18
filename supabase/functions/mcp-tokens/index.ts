import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

async function db(path: string, init: RequestInit = {}) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Configuration serveur manquante.");
  const res = await fetch(url + "/rest/v1/" + path, {
    ...init,
    headers: {
      apikey: key, Authorization: "Bearer " + key,
      "Content-Type": "application/json", Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.text();
  if (!res.ok) throw new Error("Erreur base de données (" + res.status + "): " + body.slice(0, 200));
  return body ? JSON.parse(body) : null;
}

async function authenticatedUser(req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return null;
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) throw new Error("Secrets SUPABASE_URL ou SUPABASE_ANON_KEY manquants.");
  const res = await fetch(url + "/auth/v1/user", {
    headers: { apikey: anon, Authorization: authorization },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return typeof user?.id === "string" ? user.id as string : null;
}
async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return "gdc_" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Utilisez POST." }, 405);
  const userId = await authenticatedUser(req);
  if (!userId) return json({ error: "Session absente ou expirée. Connectez-vous à Gestion de comptes." }, 401);
  try {
    const body = await req.json();
    const action = String(body?.action ?? "create");
    if (action === "create") {
      const name = String(body?.name ?? "MCP").trim().slice(0, 80) || "MCP";
      const defaultAccountId = body?.default_account_id == null ? null : String(body.default_account_id).trim();
      if (defaultAccountId) {
        const accounts = await db(`accounts?user_id=eq.${userId}&id=eq.${encodeURIComponent(defaultAccountId)}&select=id`);
        if (!accounts?.length) return json({ error: "Le compte par défaut n'appartient pas à cet utilisateur." }, 400);
      }
      const token = randomToken();
      const tokenHash = await sha256(token);
      const rows = await db("mcp_tokens", {
        method: "POST",
        body: JSON.stringify([{
          user_id: userId, token_hash: tokenHash, name,
          default_account_id: defaultAccountId,
        }]),
      });
      return json({
        ok: true,
        id: rows[0].id,
        token,
        warning: "Copiez ce jeton maintenant : il ne sera plus affiché. Ne le partagez pas.",
      }, 201);
    }
    if (action === "list") {
      const rows = await db(`mcp_tokens?user_id=eq.${userId}&select=id,name,default_account_id,created_at,last_used_at,revoked_at&order=created_at.desc`);
      return json({ ok: true, tokens: rows });
    }
    if (action === "revoke") {
      const id = String(body?.id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Identifiant de jeton invalide." }, 400);
      const rows = await db(`mcp_tokens?id=eq.${id}&user_id=eq.${userId}&revoked_at=is.null`, {
        method: "PATCH", body: JSON.stringify({ revoked_at: new Date().toISOString() }),
      });
      return rows?.length ? json({ ok: true, message: "Jeton révoqué." }) : json({ error: "Jeton introuvable ou déjà révoqué." }, 404);
    }
    return json({ error: "Action inconnue. Utilisez create, list ou revoke." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
