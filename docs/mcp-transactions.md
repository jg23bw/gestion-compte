# MCP Gestion de comptes

Cette fonction expose un serveur MCP personnel pour ajouter et consulter des opérations. Elle ne remplace pas l'authentification de l'application web : elle utilise un jeton dédié, gardé côté serveur, et un UUID Supabase fixe pour limiter les opérations à un seul utilisateur.

## Outils MCP

- `list_accounts` : liste les comptes disponibles.
- `add_transaction` : ajoute une opération. Une dépense doit avoir un montant négatif (`Pain`, `-2`), une entrée un montant positif. La date est aujourd'hui si elle n'est pas fournie.
- `list_recent_transactions` : vérifie les dernières opérations créées.

Pour saisir simplement « pain 2 € » sans préciser le compte, configure `MCP_DEFAULT_ACCOUNT_ID` sur le compte utilisé le plus souvent. Les identifiants préconfigurés sont par exemple `lbp`, `fortuneo`, `cic-montpont`, `bourso` et `tiime`.

## Déploiement Supabase

Prérequis : Supabase CLI installée et connectée au bon compte.

1. Récupère l'UUID de l'utilisateur dans Supabase Dashboard → Authentication → Users. Ne le confonds pas avec l'identifiant du projet.
2. Récupère la clé **service_role** dans Project Settings → API/Keys. Elle ne doit jamais être publiée dans le dépôt ni dans le navigateur.
3. Génère un jeton personnel long et aléatoire, par exemple avec `openssl rand -hex 32`.
4. À la racine du dépôt, lie le projet et définis les secrets (remplace les valeurs entre chevrons) :

```bash
supabase login
supabase link --project-ref gpzqvkkysolqksimiqac
supabase secrets set \
  MCP_ACCESS_TOKEN="<jeton-aleatoire-de-64-caracteres-ou-plus>" \
  MCP_USER_ID="<uuid-utilisateur-supabase>" \
  MCP_DEFAULT_ACCOUNT_ID="lbp" \
  SUPABASE_URL="https://gpzqvkkysolqksimiqac.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="<cle-service-role>"
supabase functions deploy mcp-transactions
```

Le jeton doit rester secret. Ne l'ajoute ni à GitHub, ni à `supabase-config.js`, ni au code client. Si le jeton est exposé, génère-en un nouveau et remplace le secret.

## Connexion d'un client MCP

URL du serveur après déploiement :

`https://gpzqvkkysolqksimiqac.supabase.co/functions/v1/mcp-transactions`

Le client doit utiliser le transport HTTP MCP et envoyer l'en-tête :

`Authorization: Bearer <MCP_ACCESS_TOKEN>`

Certains clients demandent le jeton dans leur formulaire d'authentification; d'autres ne prennent en charge que OAuth. Si ton client ne permet pas d'envoyer un Bearer token personnalisé, cette version ne pourra pas s'y connecter directement : il faudra ajouter OAuth compatible avec ce client plutôt que de rendre le serveur public.

## Sécurité et limites

- L'endpoint vérifie un jeton dédié et impose le `MCP_USER_ID` configuré côté serveur.
- Les requêtes de base utilisent la clé service_role, donc la fonction vérifie explicitement le propriétaire et l'appartenance du compte avant insertion. Ne réutilise pas cette clé ailleurs.
- L'endpoint ne peut agir que pour un utilisateur. Pour plusieurs utilisateurs, il faudra remplacer ce modèle par OAuth/Supabase Auth par utilisateur.
- La fonction a été ajoutée au dépôt mais doit encore être déployée et testée dans ton projet Supabase. Aucun secret ni déploiement distant n'a été effectué depuis ce dépôt.
