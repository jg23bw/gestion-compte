# Supabase — configuration, schéma et opérations

## Périmètre

L’application utilise Supabase Auth et PostgreSQL pour synchroniser les comptes, opérations et modèles de récurrence. Les Edge Functions servent la gestion de jetons MCP et la saisie rapide. Le dépôt ne permet pas, à lui seul, de prouver l’état actuel du projet distant.

Référence du projet vue dans la configuration publique : `gpzqvkkysolqksimiqac`. URL de projet/fonctions visible dans le code : `https://gpzqvkkysolqksimiqac.supabase.co`.

## Fichiers

- `supabase-config.js` : URL + clé publishable côté navigateur.
- `supabase/schema.sql` : schéma SQL de référence et RLS.
- `supabase/migrations/202610180001_mcp_tokens.sql` : table des jetons MCP.
- `supabase/migrations/202610180002_transaction_pointage_order.sql` : colonnes de pointage, ordre et clé de récurrence.
- `supabase/migrations/202610220001_crypto_holdings.sql` : table des positions crypto, RLS et index.
- `supabase/config.toml` : paramètres des Edge Functions ; les fonctions actuellement présentes sont `mcp-transactions`, `quick-add` et `mcp-tokens`.
- `supabase/functions/` : implémentations des Edge Functions.

## Tables repérées dans le schéma

### `accounts`
Clé primaire composite `(user_id, id)`. Contient le nom, type, solde initial, taux indicatifs et solde net initial. Types acceptés : `bank`, `savings`, `pro`.

### `transactions`
Contient l’utilisateur, le compte, date, libellé, montant, source, références de récurrence, horodatages. Les colonnes nécessaires au pointage et au tri sont :
- `is_paid boolean not null default false`
- `sort_order integer`
- `recurring_key text`

Le montant positif correspond à une entrée et le montant négatif à une sortie. Un index unique partiel protège l’unicité de `(user_id, recurring_key)` lorsque la clé n’est pas nulle.

### `recurring_templates`
Modèles utilisateur associés à un compte. Fréquences admises dans le schéma : `monthly`, `quarterly`, `annual`, `once`. Le montant peut être nul pour représenter un montant à renseigner.

### `audit_history`
Journal des insertions, mises à jour et suppressions des entités prises en charge. L’accès utilisateur est limité par RLS aux enregistrements du même utilisateur.

### `mcp_tokens`
Définie par la migration MCP. Stocke un hash du jeton, son propriétaire, son nom, un compte par défaut éventuel, la date d’utilisation et la révocation. Le jeton brut n’est renvoyé qu’au moment de sa création.

### `crypto_holdings`
Positions crypto associées à un utilisateur : symbole, nom, identifiant CoinGecko, montant investi, quantité et ordre d’affichage. Clé primaire composite `(user_id, id)`, RLS par `auth.uid()`. Les prix ne sont pas stockés en base : ils sont lus en direct via CoinGecko et seulement mis en cache côté navigateur. La colonne historique `status` reste en base pour compatibilité mais n’est plus utilisée par le client.

## Sécurité

- Les tables de données doivent avoir RLS activée et des politiques qui vérifient `user_id = auth.uid()`.
- Les Edge Functions utilisent des secrets serveur tels que `SUPABASE_SERVICE_ROLE_KEY`. Ils doivent rester dans l’environnement de fonction Supabase et ne jamais apparaître dans le front-end, un raccourci mobile, un commit ou une capture d’écran.
- La clé publishable dans `supabase-config.js` est prévue pour le navigateur, mais l’application dépend toujours de l’authentification et des politiques RLS.
- Les jetons MCP préfixés `gdc_` donnent accès aux outils définis par l’Edge Function et doivent être gardés secrets et révoqués lorsqu’ils ne sont plus nécessaires.
- L’intégration MCP actuelle utilise un Bearer token personnel. La documentation du dépôt précise qu’il ne s’agit pas encore du flux OAuth 2.1 universel.

## Installation d’un nouveau projet

1. Créer le projet Supabase.
2. Examiner puis exécuter `supabase/schema.sql` dans SQL Editor.
3. Configurer Authentication → URL Configuration avec l’URL d’hébergement utilisée.
4. Vérifier `supabase-config.js` pour qu’il pointe vers le bon projet avec une clé publishable, jamais une clé privilégiée.
5. Si l’intégration MCP est utilisée, appliquer les migrations MCP et déployer les Edge Functions selon `docs/mcp-transactions.md`.
6. Connecter un utilisateur test et vérifier les règles RLS avec deux utilisateurs distincts avant d’utiliser des données réelles.

## Base déjà existante : pointage et ordre manuel

Le front-end mappe les propriétés `isPaid` / `sortOrder` vers les colonnes `is_paid` / `sort_order`. La clé anti-doublon des récurrences est `recurring_key`. Une base ancienne peut ne pas avoir ces colonnes.

### Migration à appliquer si nécessaire

Fichier : [`migrations/202610180002_transaction_pointage_order.sql`](../supabase/migrations/202610180002_transaction_pointage_order.sql).

Dans le dashboard du **projet exact utilisé par l’application** :
1. Ouvrir SQL Editor.
2. Copier le fichier de migration complet et l’exécuter.
3. Vérifier que la requête ne retourne pas d’erreur.
4. Vérifier que les colonnes existent dans `public.transactions`.
5. Recharger l’application, se connecter, puis vérifier le statut de synchronisation.
6. Créer une opération de test, pointer/dépointer et changer son ordre, recharger la page et confirmer que les valeurs sont conservées. Supprimer l’opération test ensuite si approprié.

Cette migration ajoute les colonnes avec `ADD COLUMN IF NOT EXISTS`, initialise les valeurs `sort_order` manquantes à partir de la date/heure de création, crée un index unique partiel sur les clés de récurrence non nulles et demande à PostgREST de recharger son schéma. Elle ne doit pas être considérée comme appliquée tant que son exécution sur le serveur n’a pas été confirmée.

Le fichier `supabase/schema.sql` contient déjà ces colonnes et l’index. Le schéma est une référence pour une installation ; la migration est destinée aux bases déjà initialisées. Éviter de lancer des scripts destructifs ou de réinitialiser les tables pour corriger un simple décalage de schéma.

## Base déjà existante : positions crypto

Fichier : [`migrations/202610220001_crypto_holdings.sql`](../supabase/migrations/202610220001_crypto_holdings.sql).

Cette migration crée `public.crypto_holdings`, active RLS, ajoute la politique `crypto holdings own rows`, l’index d’ordre et les droits pour les utilisateurs authentifiés. Elle est idempotente (`if not exists`, `drop policy if exists`) et ne modifie aucune autre table.

Procédure :
1. Ouvrir le SQL Editor du projet utilisé par l’application.
2. Exécuter le fichier complet.
3. Vérifier que la table `public.crypto_holdings` existe et que RLS est activée.
4. Recharger l’application, se connecter et ouvrir « Crypto ».
5. Ajouter une position test, vérifier la valeur calculée avec le prix CoinGecko, recharger la page et confirmer la persistance. Supprimer la position test ensuite.

Sans cette migration, le reste de l’application continue de fonctionner : la page Crypto affiche un bandeau explicite et les positions ne sont pas sauvegardées.

Pour un import initial de positions sans les mettre dans le dépôt, le parcours normal est le formulaire « Ajouter une position » de la page Crypto : il écrit directement dans la table avec le `user_id` de l’utilisateur connecté. Une reprise de données existantes peut aussi être faite par un administrateur avec un script SQL exécuté hors dépôt, sans jamais committer les montants réels.

## Migration des jetons MCP

Fichier : [`migrations/202610180001_mcp_tokens.sql`](../supabase/migrations/202610180001_mcp_tokens.sql). À appliquer si les fonctions MCP sont utilisées et que la table n’existe pas. Lire ensuite [`docs/mcp-transactions.md`](./mcp-transactions.md), qui décrit les secrets requis et les commandes de déploiement. Ne pas mettre les secrets dans Git.

## Diagnostic

### Message relatif à `is_paid`, `sort_order` ou migration requise
- La migration n’a peut-être pas été exécutée sur le bon projet.
- Vérifier la table `public.transactions` et les colonnes requises.
- Vérifier la réponse détaillée de Supabase dans la console navigateur ; ne pas masquer l’erreur.

### Erreur de connexion ou chargement bloqué
- Vérifier la configuration de l’URL et de la clé publishable, la session Auth et la connexion réseau.
- Vérifier les politiques RLS et les noms des colonnes attendus.
- Ne pas désactiver RLS en guise de contournement.

### MCP ne répond pas
- Vérifier que la migration `mcp_tokens` a été appliquée.
- Vérifier que les Edge Functions sont déployées et que leurs secrets serveur sont configurés.
- Vérifier que le jeton `gdc_` n’a pas été révoqué.
- Ne pas tester avec la clé `service_role` depuis le navigateur.

## Sauvegarde et prudence

Avant toute opération SQL sur une base contenant des données réelles :
- exporter les données depuis l’application ou effectuer une sauvegarde Supabase ;
- lire le SQL complet et comprendre son effet ;
- appliquer une migration incrémentale plutôt qu’un reset ;
- confirmer le projet et l’environnement avant exécution.
