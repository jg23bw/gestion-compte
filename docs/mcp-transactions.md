# Connexion MCP — Gestion de comptes

## Architecture multi-utilisateur (première étape)

Chaque utilisateur dispose de son propre jeton MCP révocable. Le jeton est généré depuis une session déjà authentifiée dans Gestion de comptes, sa valeur brute n'est renvoyée qu'une seule fois et seule son empreinte SHA-256 est conservée en base. Le serveur déduit le propriétaire du jeton côté serveur : aucun `user_id` envoyé par le client n'est utilisé pour déterminer l'accès aux données.

Chaque jeton peut avoir un compte par défaut propre à son utilisateur. Le propriétaire du compte est vérifié avant toute insertion. Les clés Supabase privilégiées restent exclusivement côté serveur.

**Limite importante :** cette première étape utilise un jeton Bearer personnel, pas encore le flux OAuth 2.1 de bout en bout. Elle convient aux clients MCP qui acceptent un Bearer token personnalisé. Les clients qui imposent OAuth ne pourront pas se connecter tant que le serveur OAuth et son parcours d'autorisation ne seront pas implémentés. Ne présente pas encore cette intégration comme une connexion universelle « un clic ».

## Outils MCP

- `list_accounts` : liste les comptes du propriétaire du jeton.
- `add_transaction` : ajoute une opération après contrôle de l'appartenance du compte. Montant négatif pour une dépense, positif pour une entrée.
- `list_recent_transactions` : affiche les dernières opérations de ce même utilisateur.

## Étapes de mise en place

### 1. Appliquer la migration SQL

Dans Supabase Dashboard → SQL Editor, ouvre et exécute le contenu du fichier :

`supabase/migrations/202610180001_mcp_tokens.sql`

Il crée la table des jetons personnels, dont la lecture est interdite aux rôles navigateur `anon` et `authenticated`.

### 2. Vérifier les secrets serveur existants

Dans le Terminal, à la racine du dépôt :

```bash
supabase login
supabase link --project-ref gpzqvkkysolqksimiqac
supabase secrets list
```

Les fonctions utilisent les secrets serveur `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`. Supabase fournit généralement ces variables d'environnement aux Edge Functions. Si elles sont absentes, configure-les côté Supabase, jamais dans le code client. Ne crée plus de secrets globaux `MCP_USER_ID`, `MCP_ACCESS_TOKEN` ou `MCP_DEFAULT_ACCOUNT_ID` : le modèle multi-utilisateur ne les utilise plus.

### 3. Déployer les trois fonctions

```bash
supabase functions deploy mcp-tokens
supabase functions deploy mcp-transactions
supabase functions deploy quick-add
```

### 4. Créer un jeton pour un utilisateur connecté

URL du gestionnaire de jetons :

`https://gpzqvkkysolqksimiqac.supabase.co/functions/v1/mcp-tokens`

L'appel doit venir de l'application alors que l'utilisateur est connecté et doit porter son jeton de session Supabase :

- `Authorization: Bearer <JWT_DE_SESSION_SUPABASE>`
- `Content-Type: application/json`

Pour créer un jeton MCP avec un compte par défaut :

```json
{
  "action": "create",
  "name": "Mon assistant",
  "default_account_id": "cic-montpont"
}
```

L'endpoint renvoie une propriété `token` une seule fois. Copie-la dans le gestionnaire de secrets du client MCP et ne la publie jamais. Le point d'entrée de gestion est protégé par la session de l'utilisateur; il ne faut jamais appeler cette route avec la clé `service_role` depuis le navigateur.

Autres actions, toujours avec le JWT de session de l'utilisateur :
- lister ses jetons : `{"action":"list"}`
- révoquer un jeton : `{"action":"revoke","id":"<id-du-jeton>"}`

L'interface est accessible depuis Gestion de comptes : ouvre **Connexion cloud** dans la barre latérale, puis la section **Connexions d’assistants IA (MCP)**. Tu peux créer un jeton, choisir le compte par défaut, le copier une seule fois, actualiser la liste ou le révoquer. Il n'est pas nécessaire de manipuler le JWT de session manuellement.

### 5. Connexion MCP

URL du serveur MCP :

`https://gpzqvkkysolqksimiqac.supabase.co/functions/v1/mcp-transactions`

Le client MCP doit envoyer le jeton personnel créé pour cet utilisateur :

`Authorization: Bearer <JETON_PERSONNEL_gdc_...>`

Le jeton est indépendant de l'UUID utilisateur et peut être révoqué. Les outils MCP sont limités aux données du propriétaire du jeton.

## Saisie rapide sur iPhone avec confirmation

URL :

`https://gpzqvkkysolqksimiqac.supabase.co/functions/v1/quick-add`

Le raccourci doit envoyer `Authorization: Bearer <JETON_PERSONNEL>` et `Content-Type: application/json`.

Flux recommandé :
1. **Dicter du texte** : par exemple « pain deux euros ».
2. Envoyer un POST JSON avec `{"action":"preview","text":"<texte dicté>"}`. Cette étape renvoie le libellé, le montant, la date et le compte sans insérer de transaction.
3. Afficher ces détails, puis proposer **Confirmer** ou **Annuler**.
4. Si l'utilisateur confirme, envoyer un second POST avec `{"action":"confirm","confirmed":true,"text":"<même texte dicté>"}`.
5. Afficher le message de succès ou l'erreur.

Pour un raccourci qui utilise un compte par défaut, crée un jeton avec `default_account_id: "cic-montpont"`. Ne mets jamais le JWT de session Supabase ou une clé `service_role` dans le raccourci : seul le jeton MCP personnel prévu pour cette intégration doit y être utilisé. Ce jeton donne accès aux outils de lecture et d'ajout autorisés; révoque-le si l'iPhone ou le raccourci est partagé/perdu.

## Sécurité et prochaine étape commerciale

- La clé `service_role` reste serveur uniquement.
- Les jetons personnels sont stockés sous forme d'empreinte et peuvent être révoqués.
- Chaque requête vérifie le jeton et utilise le `user_id` associé en base, jamais une identité fournie par le client.
- Les comptes demandés sont vérifiés pour appartenir à ce même utilisateur.
- L'écran de gestion des connexions est ajouté à l'application. Il reste à effectuer des tests réels sur Supabase, des tests multi-utilisateur et une revue de sécurité.
- Pour une compatibilité universelle avec les clients MCP OAuth-only, il reste à implémenter le flux OAuth 2.1 complet (inscription client, autorisation, consentement, échange/renouvellement/révocation des jetons et métadonnées d'autorisation). Le Bearer token personnel est une étape intermédiaire, pas un remplacement d'OAuth.
