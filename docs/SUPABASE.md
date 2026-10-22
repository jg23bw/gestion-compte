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
Clé primaire composite `(user_id, id)`. Contient le nom, type, solde initial, taux indicatifs et solde net initial. Types acceptés en base : `bank`, `savings`, `pro`. Les sous-types d’affichage PEA, assurance vie et CTO sont stockés séparément dans les métadonnées Auth et utilisent `kind='savings'` (voir « Types de comptes et logos sans migration »). Le champ texte `short` contient un jeton `bank:<identifiant>` qui référence la banque choisie dans le catalogue client (par exemple `bank:bnp`). Le client le convertit en propriété `bank` et affiche le logo correspondant ; aucune URL d’image n’est stockée dans cette colonne.

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
Positions crypto associées à un utilisateur : symbole, nom, identifiant CoinGecko, montant investi, quantité et ordre d’affichage. Clé primaire composite `(user_id, id)`, RLS par `auth.uid()`. Les prix et les logos CoinGecko sont lus en direct via l’API publique et seulement mis en cache côté navigateur. Aucun logo personnalisé n’est enregistré : le client écrit `Détenu` dans la colonne texte historique `status` pour respecter la contrainte existante. Aucune colonne supplémentaire n’est nécessaire.

### Crédit lombard — métadonnées Auth
Le crédit lombard n’utilise pas de table PostgreSQL dédiée. Le client l’enregistre dans les métadonnées privées de l’utilisateur Auth (`user_metadata.lombardCredit`) avec `supabase.auth.updateUser`. Le montant est déduit des avoirs bruts dans la vue d’ensemble ; le crédit n’est pas une opération et ne modifie pas les soldes des comptes.

Cette approche ne nécessite **aucune migration SQL** et aucune politique RLS supplémentaire. Les métadonnées sont rattachées au compte Auth et ne sont pas exposées aux autres utilisateurs par l’application. Elles ne doivent pas servir à des décisions d’autorisation : les permissions restent portées par les tables et les politiques RLS.

Les comptes financiers personnalisés utilisent la table `accounts` existante : aucun changement de schéma n’est nécessaire pour en ajouter. Le client génère un identifiant et synchronise la ligne avec le `user_id` connecté.

## Types de comptes et logos sans migration

- Les types PEA, assurance vie et CTO ne modifient pas la contrainte `accounts.kind`. En base, ils restent `kind='savings'`. Le client conserve le sous-type dans `state.accounts[].accountType` et l’enregistre dans `user_metadata.accountTypes` via `auth.updateUser`, sous la forme `{ "identifiant-du-compte": "pea" | "av" | "cto" }`.
- La synchronisation envoie la table complète des surcharges après les upserts/suppressions de comptes. Quand un compte redevient un livret standard, change de type de base ou est supprimé, son identifiant disparaît de la table. Le drapeau `cloud.accountTypesDirty` permet de retenter l’écriture si elle échoue.
- Le logo d’un compte n’est plus une image envoyée par l’utilisateur. Le formulaire propose un catalogue de banques et le logo est choisi automatiquement. La banque est stockée dans `accounts.short` sous la forme `bank:<identifiant>` (`bank:lbp`, `bank:bnp`, etc.) ; le client la convertit en propriété `bank`. Les logos connus sont des fichiers locaux du dépôt et les autres établissements utilisent un monogramme. Aucune data URL n’est écrite dans `accounts.short`.
- Le logo d’une crypto vient uniquement de CoinGecko. Le client écrit `Détenu` dans `crypto_holdings.status` pour respecter la contrainte ; cette colonne n’est plus utilisée pour un logo personnalisé.
- Aucune migration SQL, colonne ou politique RLS supplémentaire n’est nécessaire. Les métadonnées Auth restent privées et ne doivent pas être utilisées pour des décisions d’autorisation.
- Un sous-type ou une banque choisie n’est visible sur un autre appareil qu’après la synchronisation réussie. Si `auth.updateUser` échoue, le compte peut être sauvegardé avec son type de base mais le sous-type précis peut être perdu au rechargement. L’application signale l’échec et retente lors d’une synchronisation ultérieure.

## Suppression d’un compte

La fenêtre de configuration permet de supprimer un compte après confirmation. Le client retire le compte, ses opérations et ses récurrences de l’état local, puis supprime la ligne `accounts` dans Supabase. Les clés étrangères `on delete cascade` de `transactions` et `recurring_templates` suppriment les lignes liées côté serveur.

Le dernier compte ne peut pas être supprimé : l’application affiche un message demandant d’en créer un autre d’abord. Cette garde évite de retomber sur le réensemencement des comptes par défaut au prochain chargement. Un jeton MCP existant dont le compte par défaut est supprimé n’est pas mis à jour automatiquement ; il faut le recréer ou le modifier côté serveur si nécessaire.

## Sécurité

- Les tables de données doivent avoir RLS activée et des politiques qui vérifient `user_id = auth.uid()`.
- Les Edge Functions utilisent des secrets serveur tels que `SUPABASE_SERVICE_ROLE_KEY`. Ils doivent rester dans l’environnement de fonction Supabase et ne jamais apparaître dans le front-end, un raccourci mobile, un commit ou une capture d’écran.
- La clé publishable dans `supabase-config.js` est prévue pour le navigateur, mais l’application dépend toujours de l’authentification et des politiques RLS.
- Les jetons MCP préfixés `gdc_` donnent accès aux outils définis par l’Edge Function et doivent être gardés secrets et révoqués lorsqu’ils ne sont plus nécessaires.
- L’intégration MCP actuelle utilise un Bearer token personnel. La documentation du dépôt précise qu’il ne s’agit pas encore du flux OAuth 2.1 universel.

## Installation d’un nouveau projet

1. Créer le projet Supabase.
2. Examiner puis exécuter `supabase/schema.sql` dans SQL Editor. Sur une base déjà initialisée, appliquer plutôt les migrations incrémentales nécessaires.
3. Configurer Authentication → URL Configuration avec l’URL d’hébergement utilisée. Vérifier si la confirmation d’e-mail est activée : elle conditionne le message affiché après « Créer un compte ».
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

## Vérification du crédit lombard

Aucune migration SQL n’est nécessaire. Pour vérifier le parcours :
1. Se connecter avec un utilisateur test.
2. Ouvrir la vue d’ensemble, puis « Ajouter » sur la carte « Crédit lombard ».
3. Saisir un montant et enregistrer.
4. Vérifier que le patrimoine net diminue du montant saisi.
5. Recharger la page et confirmer que le crédit est toujours présent.
6. Tester la suppression depuis la même fenêtre.

La persistance dépend de Supabase Auth (`auth.updateUser`) et de la session active.

## Vérification des types de comptes, logos et suppressions

Aucune migration SQL n’est requise. Pour vérifier avec un utilisateur test :
1. Se connecter et créer un compte de type PEA, assurance vie ou CTO en choisissant une banque dans la liste.
2. Vérifier que le type et le logo automatique apparaissent dans la liste et après un rechargement de la page.
3. Dans Supabase, vérifier que `public.accounts.short` contient `bank:<identifiant>` (par exemple `bank:bnp`) et que `kind` vaut `savings`.
4. Vérifier dans le compte Auth que `user_metadata.accountTypes` contient l’identifiant du compte avec la valeur `pea`, `av` ou `cto`.
5. Ajouter une position crypto et vérifier que son logo CoinGecko s’affiche sans sélection de fichier ; `public.crypto_holdings.status` doit contenir `Détenu`.
6. Créer un compte de test avec une opération et une récurrence, puis le supprimer depuis le site. Vérifier la disparition du compte et des lignes liées dans Supabase.
7. Tenter de supprimer le dernier compte : l’opération doit être bloquée avec un message explicite.

Ne pas exécuter ces vérifications avec des données financières réelles.

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
