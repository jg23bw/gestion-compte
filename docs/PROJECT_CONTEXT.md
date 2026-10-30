# Contexte projet — Gestion de comptes

**Dernière mise à jour documentaire : 2026-10-24.** À relire et actualiser lors de chaque changement important. Cette documentation décrit le dépôt tel qu’inspecté ; elle ne prouve pas que les fonctions distantes Supabase ou le site hébergé ont été testés de bout en bout.


> La vue d’ensemble affiche explicitement une carte « Cryptomonnaies » avec la valorisation totale en euros. Cette valeur est distincte des comptes personnels/professionnels, mais elle est incluse dans les avoirs bruts et le patrimoine net.


> Dans « Opérations », les comptes de type assurance vie, PEA et CTO sont masqués des sélecteurs d’opérations, d’historique et de récurrences ; ils restent disponibles dans le filtre des positions titres. Le catalogue de titres contient aussi SUR000001737, libellé « EUR SURAVENIR RENDEMENT 2 », référencé comme support en euros de Fortuneo Vie. Son cours de marché n’étant pas fourni par la source boursière habituelle, la valorisation retombe sur le montant investi si aucun cours n’est disponible.


> Dans l’écran Actions, seuls les comptes de type PEA, CTO et assurance vie sont proposés et leurs positions sont affichées. Le support Suravenir `SUR000001737` est géré à valeur manuelle : seul le montant détenu est demandé, sans quantité ni cours boursier ; sa valeur est incluse dans les totaux des positions et du patrimoine.


> Dans l’écran Actions, la quantité est facultative. Si elle est laissée vide, la position est enregistrée en valeur manuelle à partir du montant saisi ; le support `SUR000001737` est automatiquement traité ainsi. La valeur manuelle est incluse dans les totaux, sans cours boursier ni calcul de plus-value automatique.

## Valorisation indicative du fonds euros Suravenir

La position `SUR000001737` est valorisée à partir du montant saisi et progresse automatiquement selon une hypothèse annuelle de 2,10 %, taux publié pour Suravenir Rendement 2 en 2025. La projection est indicative, pas une garantie de rendement futur ; la date de référence est conservée pour éviter de réinitialiser la progression à chaque affichage.

## 1. Résumé rapide

- Dépôt : [jg23bw/gestion-compte](https://github.com/jg23bw/gestion-compte).
- Application hébergée : [https://jg23bw.github.io/gestion-compte/](https://jg23bw.github.io/gestion-compte/).
- Interface française pour la gestion de comptes, opérations, pointage, modèles récurrents et exports.
- Front-end statique en HTML/CSS/JavaScript, sans framework ni build front-end identifié.
- Données distantes via Supabase Auth + PostgreSQL/RLS. Des Edge Functions Supabase servent l’intégration MCP.
- Référence du projet Supabase visible dans l’URL de configuration publique : `gpzqvkkysolqksimiqac`. Ne recopiez aucune valeur de jeton ou clé dans la documentation ou dans les réponses.
- Le dépôt est la source pour le code ; les migrations de base doivent être exécutées séparément dans Supabase.

## 2. Règles impératives pour l’agent qui reprend

1. **Lire `AGENTS.md` avant de coder**, puis cette page et `docs/SUPABASE.md`.
2. Inspecter le code actuel avant toute modification. Ne pas se fier uniquement à un résumé ancien ou à un nom de commit.
3. Garder les données utilisateur privées. Ne jamais ajouter dans le dépôt des soldes réels, opérations, modèles récurrents personnalisés, JWT, jetons MCP, mot de passe, clé `service_role` ou autres secrets.
4. Ne pas supprimer, réinitialiser ou fusionner aveuglément les données Supabase. La base cloud connectée est traitée comme source de vérité après connexion ; l’import initial du cache local est une étape sensible.
5. Ne pas prétendre qu’une migration a été appliquée à Supabase parce que son fichier est commité. C’est une action distincte dans le SQL Editor ou via CLI correctement liée au projet.
6. Garder les changements de comportement séparés des changements de documentation lorsque possible.
7. Après chaque modification de `app.js`, faire au minimum une validation de syntaxe JavaScript et vérifier que tous les IDs DOM référencés existent dans `index.html`. Puis tester les parcours dans un vrai navigateur si l’outil le permet. Rapporter honnêtement ce qui a été testé.
8. Éviter de changer les noms de colonnes SQL, les noms de propriétés de l’état ou les clés de stockage sans suivre toutes leurs utilisations et prévoir une migration compatible.
9. Les pages GitHub Pages et les assets peuvent être mis en cache. Lors d’une modification front-end, vérifier la référence de cache-busting dans `index.html` si nécessaire.
10. Mettre à jour cette documentation si les décisions, les migrations, les fonctions ou les procédures changent.

## 3. Architecture et points d’entrée

| Fichier | Rôle |
|---|---|
| `index.html` | Structure HTML, barre latérale, écrans et identifiants des contrôles ; charge Supabase JS, `supabase-config.js`, puis `app.js` avec `defer`. |
| `styles.css` | Style visuel et responsive ; des règles de filtres/historique sont ajoutées en fin de fichier. |
| `app.js` | État métier, calculs, rendu, formulaires, opérations, récurrences, annulation, export, auth/synchronisation cloud et interface MCP. |
| `supabase-config.js` | Configuration navigateur avec URL et clé publishable Supabase. N’y mettre aucune clé privilégiée. |
| `supabase/schema.sql` | Schéma SQL de référence et politiques RLS ; inclut déjà certaines colonnes ajoutées historiquement par migration. |
| `supabase/migrations/202610180001_mcp_tokens.sql` | Table des jetons MCP par utilisateur et politiques associées. |
| `supabase/migrations/202610180002_transaction_pointage_order.sql` | Ajoute de façon idempotente les colonnes nécessaires au pointage/tri manuel et la clé de récurrence, initialise l’ordre, ajoute un index unique. |
| `supabase/functions/mcp-tokens/index.ts` | Création/liste/révocation des jetons MCP à partir d’une session authentifiée. Le jeton brut n’est retourné qu’à la création. |
| `supabase/functions/mcp-transactions/index.ts` | Endpoint MCP JSON-RPC, outils de lecture des comptes, ajout et lecture d’opérations. Authentifie par jeton personnel `gdc_`. |
| `supabase/functions/quick-add/index.ts` | Ajout rapide via aperçu puis confirmation explicite, protégé par jeton personnel. |
| `docs/mcp-transactions.md` | Procédure d’installation et de configuration de l’intégration MCP. |
| `docs/SUPABASE.md` | Procédure base de données, migrations, sécurité et diagnostic. |

### Vues de l’application

Les sections HTML inspectées incluent `accounts-view`, `transactions-view`, `history-view`, `crypto-view`, `stocks-view` et `recurring-view`. La navigation change la vue active sans routeur externe. Les fonctions de rendu principales présentes dans `app.js` incluent `renderDashboard`, `renderAccounts`, `renderTransactions`, `renderMonthlyHistory`, `renderCrypto`, `renderStocks`, `renderRecurring` et `renderAll`.

## 4. Modèle de données métier

### Comptes
État JavaScript : `state.accounts`. Les propriétés côté client comprennent `id`, `name`, `short`, `bank`, `kind`, `accountType`, `opening`, `vatRate`, `socialRate`, `netOpening`. Les valeurs de `kind` stockées dans la table `accounts` restent `bank`, `savings`, `pro`. Les sous-types d’affichage `pea`, `av` et `cto` sont conservés dans `accountType` et stockés dans les métadonnées Auth (`user_metadata.accountTypes`), avec `kind='savings'` en base. Les comptes prédéfinis sont des valeurs initiales ; l’utilisateur peut en ajouter, modifier leur nom, type, banque et solde de départ, ou les supprimer avec confirmation. La banque est choisie dans un catalogue (`BANK_CATALOG`) et son logo est affiché automatiquement. `accounts.short` contient un jeton `bank:<identifiant>` ; `fromCloudAccount` le convertit en propriété `bank` et `toCloudAccount` le réécrit. Les anciennes initiales ou data URLs restent lisibles et sont remplacées lors de la prochaine synchronisation. Aucun changement de schéma n’est nécessaire : la table `accounts` accepte déjà un identifiant texte et les valeurs `kind` autorisées restent inchangées.

### Actions, ETF et nantissement
État JavaScript : `state.stockHoldings` (tableau) et `state.accountPledges` (objet indexé par identifiant de compte). Une position contient `id`, `accountId`, `priceId`, `symbol`, `name`, `market`, `currency`, `invested`, `quantity` et `sortOrder`. Un nantissement contient `{note}` ; la présence de la clé signifie que le compte est nanti. Les deux structures sont enregistrées dans les métadonnées privées du compte Supabase Auth (`user_metadata.stockHoldings` et `user_metadata.accountPledges`) via `auth.updateUser`, sans table ni migration SQL. Les positions actions ne modifient pas les soldes des comptes ; elles sont valorisées séparément à partir des cours du marché. Supprimer un compte retire ses positions et son nantissement. Les métadonnées Auth ne doivent pas servir de contrôle d’autorisation.

### Crédit lombard
État JavaScript : `state.lombardCredit`, soit `null`, soit `{label, amount, rate, notes}`. Il est enregistré dans les métadonnées privées du compte Supabase Auth (`user_metadata.lombardCredit`) via `auth.updateUser`, sans table ni migration SQL. Le montant est une dette positive déduite des avoirs bruts ; il ne crée pas d’opération et ne modifie pas le solde d’un compte. Le taux et les notes sont informatifs.

### Opérations
État : `state.transactions`. Champs côté client importants : `id`, `accountId`, `date`, `label`, `amount`, `isPaid`, `sortOrder`, `createdAt`, `recurringKey`, `recurringTemplateId`. Le stockage Supabase les mappe notamment sur `account_id`, `transaction_date`, `is_paid`, `sort_order`, `recurring_key`, `recurring_template_id`.

- Montant positif : entrée ; montant négatif : sortie.
- Les dates des opérations sont des dates calendaires `YYYY-MM-DD`.
- Le pointage (`isPaid`) et l’ordre manuel (`sortOrder`) doivent être persistés côté cloud.
- Les opérations générées depuis un modèle ont une clé de récurrence pour éviter les doublons.
- Ne pas remplacer l’ordre manuel par un tri chronologique implicite dans le stockage. Un tri choisi dans l’interface peut ne servir qu’à la présentation.

### Modèles de récurrence
État : `state.recurringTemplates`. Les fréquences SQL prises en charge sont `monthly`, `quarterly`, `annual`, `once`. Les montants peuvent être absents ; les modèles sans montant renseigné ne doivent pas générer une opération arbitraire. Les modèles personnalisés sont des données privées et ne doivent jamais être codés en dur.

### Sécurité
Les tables principales sont liées à `auth.users` et les politiques RLS doivent limiter l’accès à `auth.uid()`. Les Edge Functions MCP utilisent un secret privilégié côté serveur : il ne doit jamais être placé dans le JavaScript du navigateur ou dans un raccourci utilisateur.

## 5. Comportement et décisions produit à préserver

- Interface en français.
- Application personnelle, avec simplicité prioritaire et sans dépendance à une chaîne de build.
- Les soldes sont calculés depuis le solde initial et les opérations, pas depuis un flux bancaire.
- Le patrimoine net affiché dans la vue d’ensemble correspond aux avoirs bruts de tous les comptes moins le crédit lombard.
- Pas de connexion bancaire automatique.
- Export JSON disponible pour sauvegarde ; CSV pour les opérations.
- La génération des récurrences concerne le mois sélectionné par la logique de génération (le comportement UI courant vise le mois suivant), doit éviter les doublons et doit afficher une erreur explicite si on essaie de générer un mois déjà traité. Ne pas recréer les mêmes opérations en répétant l’action.
- L’annulation doit restaurer l’état en mémoire et les marqueurs liés à la génération ainsi que les files de suppressions cloud. Vérifier soigneusement les créations/modifications/suppressions et la synchronisation avant de modifier le mécanisme Undo.
- Lorsqu’un utilisateur est connecté, ne pas fusionner automatiquement des données locales avec un compte cloud déjà peuplé.
- Les taux de TVA/cotisations du calcul professionnel sont des estimations configurables, pas une comptabilité certifiée.

## 6. État récent du travail (18 octobre 2026)

Les changements récemment intégrés au dépôt comprennent :

1. Un avertissement de sauvegarde indique désormais le chemin de la migration `supabase/migrations/202610180002_transaction_pointage_order.sql` si les colonnes de pointage/ordre manuel ne sont pas disponibles.
2. L’écran « Historique mensuel » a été ajouté avec sélecteur de mois, filtre de compte, filtre entrées/sorties, recherche, tri, totaux des entrées/sorties et net.
3. Des contrôles de filtre/tri ont été ajoutés aux écrans comptes, opérations et récurrences.
4. Les liens CSS et JS dans `index.html` utilisent un paramètre de version pour forcer le rechargement des assets.

**Niveau de vérification réel :** la syntaxe de `app.js` et la présence des identifiants HTML utilisés par le code ont été contrôlées par script au moment des modifications. Aucun test interactif complet dans un navigateur n’a été effectué dans ce contexte. La disponibilité de ces fonctions sur le site déployé et le comportement de la base distante restent à valider.

### Prochaines vérifications recommandées

- [ ] Appliquer ou confirmer la migration `202610180002_transaction_pointage_order.sql` dans le bon projet Supabase.
- [ ] Vérifier que le statut de l’application indique « Synchronisé en ligne » et qu’une opération test est sauvegardée puis rechargée.
- [ ] Tester création, édition, suppression et annulation d’une opération, notamment après synchronisation.
- [ ] Tester le pointage et l’ordre manuel après actualisation de la page et depuis une seconde session du même utilisateur si possible.
- [ ] Tester les filtres et tris de chaque vue avec plusieurs comptes, dates, montants, libellés et états de pointage.
- [ ] Tester l’historique mensuel sur mois vide, mois avec données, entrées et sorties, et changement de mois.
- [ ] Tester la génération des récurrences une seule fois, la répétition de la génération, les montants vides et l’annulation.
- [ ] Vérifier la console du navigateur et les erreurs de requête Supabase.
- [ ] Vérifier les migrations MCP et les fonctions Edge uniquement si l’intégration MCP est utilisée.

## 7. Validation minimale et dépannage

Le projet n’a pas de `package.json` ni de suite de tests automatisés front-end identifiée dans le dépôt inspecté. Validation minimale possible avec Node installé :

```bash
node --check app.js
```

Pour vérifier les IDs DOM référencés, faire un contrôle scripté des appels `$('...')` de `app.js` par rapport aux attributs `id` dans `index.html`. Attention : cela ne remplace pas les tests navigateur.

Si l’interface semble ne pas avoir changé :
1. Vérifier le commit sur la branche par défaut.
2. Attendre le déploiement GitHub Pages.
3. Vérifier le paramètre de version des scripts/styles dans `index.html`.
4. Faire un rechargement forcé ou ouvrir une fenêtre privée.
5. Inspecter la console du navigateur.

Si le cloud échoue :
1. Vérifier la session de l’utilisateur.
2. Vérifier l’URL/clé publishable dans `supabase-config.js`, sans la copier dans un rapport public.
3. Vérifier que le schéma/migration a été exécuté sur le bon projet.
4. Vérifier les erreurs de colonnes, de politique RLS et les requêtes réseau.
5. Ne pas contourner RLS ni exposer une clé `service_role` pour résoudre un problème d’accès.

## 8. Historique et maintenance de cette documentation

Ce document est un contexte vivant, pas un substitut au code actuel. À chaque tâche importante, ajouter une courte entrée datée décrivant les fichiers touchés, les migrations éventuelles et les tests réellement exécutés. Ne jamais consigner des données personnelles de l’utilisateur ni des secrets.


## 9. Mise à jour — solde à date dans « Opérations » (21 octobre 2026)

- L’écran « Opérations » affiche désormais une ligne récapitulative « Solde à date » en tête du tableau du compte sélectionné.
- Le solde à date additionne le solde d’ouverture et les mouvements datés jusqu’à aujourd’hui ; les opérations futures n’y sont pas incluses.
- Pour le compte professionnel Tiime, la ligne affiche également le solde net estimé à date, calculé avec les mêmes limites de date.
- La ligne récapitulative est indépendante des filtres de recherche et de type appliqués à la liste des opérations.
- Vérifications à réaliser après déploiement : `node --check app.js`, contrôle des IDs DOM et test navigateur. Aucun test navigateur n’est revendiqué dans cette modification.


## 10. Harmonisation des soldes du compte professionnel (21 octobre 2026)

- Le solde principal Tiime du tableau de bord utilise maintenant le même calcul que les autres comptes : solde de départ (`opening`) + opérations enregistrées (`balanceAt`).
- Le libellé indique que ce solde est affiché avant provisions.
- Les estimations TVA/cotisations et le solde net de départ estimé restent des indicateurs complémentaires ; ils ne remplacent plus le solde principal du compte.
- Vérifications effectuées : comparaison des fonctions de calcul et confirmation des modifications par relecture des fichiers GitHub. Le test navigateur n’a pas été exécuté.


## 11. Simplification de la fenêtre de paramétrage des comptes (21 octobre 2026)

- La fenêtre « Configurer le compte » est désormais identique pour tous les comptes : nom du compte, solde de départ et actions Annuler/Enregistrer.
- Les champs Tiime spécifiques (TVA, taux de cotisations et solde net de départ estimé) ont été retirés de cette fenêtre.
- Les valeurs Tiime déjà présentes dans les données sont conservées afin de ne pas modifier silencieusement les calculs indicatifs existants ; elles ne sont plus éditables depuis cette fenêtre.
- Vérifications effectuées : lecture du code et des champs concernés sur GitHub. Aucun test navigateur n’a été exécuté.


## 12. Tri par défaut des opérations (21 octobre 2026)

- L’écran « Opérations » affiche par défaut les mouvements par date croissante : la plus ancienne opération apparaît en premier.
- Les autres tris restent disponibles dans le sélecteur.
- Le paramètre de version de `app.js` est actualisé pour éviter de conserver l’ancien script en cache.
- Vérification effectuée : contrôle des valeurs par défaut et du tri appliqué dans le code GitHub. Aucun test navigateur n’a été exécuté.

## 13. Page Crypto et prix en direct (22 octobre 2026)

- Nouvelle vue « Crypto » avec positions (symbole, nom, montant investi, quantité), prix actuel en euros, valeur actuelle, gain/perte et performance.
- Le statut « Détenu / Vendu » a été retiré de l’interface et des calculs : toutes les positions enregistrées sont valorisées. La colonne historique `status` n’est plus utilisée pour un logo : le client y écrit `Détenu` pour respecter la contrainte existante. Les anciennes data URLs sont ignorées puis remplacées à la prochaine synchronisation.
- La page propose une recherche par nom ou symbole, un filtre (toutes, en gain, en perte) et des tris (ordre manuel, nom, investi, quantité, valeur actuelle, gain/perte, performance). Les totaux et le pied de tableau reflètent les positions affichées.
- Parcours utilisateur : « Ajouter une position » ouvre une recherche CoinGecko par nom ou symbole ; la sélection remplit automatiquement le nom et l’identifiant de prix. L’utilisateur saisit ensuite le montant investi et la quantité. Chaque position est enregistrée dans Supabase avec son `user_id` et isolée par RLS.
- Les prix et les logos proviennent de l’API publique CoinGecko (`coins/markets`, devise EUR) : chargement à l’ouverture, actualisation toutes les 60 secondes lorsque l’onglet est visible, bouton manuel et cache local des dernières données. Les logos sont affichés dans le tableau, la recherche et la sélection, avec repli sur les initiales du symbole. Aucun logo personnalisé n’est demandé ni stocké. Une position sans prix n’est pas valorisée et est exclue des totaux ; aucun montant n’est inventé.
- Les positions sont stockées dans Supabase (`public.crypto_holdings`, RLS par `auth.uid()`) via la migration `202610220001_crypto_holdings.sql`, avec repli non bloquant si la table n’existe pas encore : le reste de l’application continue de fonctionner et un bandeau indique la migration à exécuter.
- Les montants personnels ne sont pas codés en dur dans le dépôt. `supabase/seed-crypto.local.sql` est ignoré par Git et sert uniquement à un import local ponctuel après remplacement de `<USER_ID>` ; le parcours normal passe par le formulaire de la page Crypto.
- Le dépôt a été repassé en public pour rétablir GitHub Pages, qui ne publie pas depuis un dépôt privé sur une offre gratuite. Le code reste sans secret ; les données restent protégées par Auth et RLS.
- Vérifications effectuées : `node --check app.js`, contrôle scripté de tous les appels `$('...')` par rapport aux `id` de `index.html`, vérification CORS et réponse EUR de CoinGecko. Aucun test navigateur complet avec session Supabase n’a été exécuté dans ce contexte.
- Reste à faire : appliquer la migration crypto dans le bon projet Supabase, importer les positions (SQL local ou formulaire), vérifier l’affichage des prix et la persistance après rechargement.

## 14. Comptes personnalisés et crédit lombard (22 octobre 2026)

- Il est désormais possible d’ajouter un compte financier depuis le bouton « Ajouter » du tableau de bord ou depuis « Mes comptes » : nom, type (courant, épargne ou professionnel, puis PEA/assurance vie/CTO depuis la section 15), banque et solde de départ. Le compte est créé dans l’état local puis synchronisé dans `public.accounts` avec le `user_id` connecté. Le logo est choisi automatiquement selon la banque, avec un monogramme pour les établissements sans logo local.
- La fenêtre de configuration existante sert aussi à modifier le nom, le type, la banque et le solde de départ d’un compte. La suppression avec confirmation a été ajoutée dans la section 15 ; le dernier compte reste protégé.
- La vue d’ensemble affiche désormais cinq indicateurs : patrimoine net, avoirs bruts, crédit lombard, comptes personnels et comptes professionnels. Le patrimoine net vaut `avoirs bruts − dette lombard` et devient négatif si la dette dépasse les avoirs.
- Le crédit lombard se gère depuis la carte dédiée : libellé, dette actuelle, taux annuel facultatif et notes. Il est enregistré dans les métadonnées privées du compte Supabase Auth (`user_metadata.lombardCredit`) via `auth.updateUser`.
- Aucune table ni migration SQL n’est nécessaire pour le crédit lombard. La sauvegarde et la suppression passent par le site et sont disponibles après reconnexion sur un autre appareil.
- L’écran de connexion propose maintenant des boutons directs « Se connecter » et « Créer un compte ». L’inscription utilisait déjà `auth.signUp` ; selon les paramètres Supabase, une confirmation par e-mail reste nécessaire.
- Vérifications effectuées : `node --check app.js`, contrôle des IDs DOM, test navigateur local avec des comptes et un crédit synthétiques, vérification du calcul `1900 − 300 = 1600`, ouverture des dialogues d’ajout de compte depuis le tableau de bord et « Mes comptes », ouverture du dialogue Lombard depuis la carte, sauvegarde et suppression avec un client Auth simulé, aucune erreur console. La persistance réelle via `auth.updateUser` n’a pas été testée avec un utilisateur connecté dans ce contexte.
- Reste à faire : vérifier avec un utilisateur connecté l’ajout d’un compte, l’enregistrement du crédit par le site et sa persistance après rechargement et reconnexion.

## 15. Types de comptes, logos et suppression (22 octobre 2026)

- Les types de compte proposés dans le formulaire et le filtre sont désormais : compte courant, livret/épargne, PEA, assurance vie, CTO et professionnel. Les comptes PEA/AV/CTO restent des comptes personnels inclus dans les avoirs bruts ; ils sont exclus du total professionnel.
- Aucune migration SQL n’a été ajoutée. En base, un compte PEA/AV/CTO garde `kind='savings'`. Le sous-type est conservé dans `state.accounts[].accountType` et synchronisé dans les métadonnées Auth `user_metadata.accountTypes` (`{ [id]: 'pea' | 'av' | 'cto' }`). Le client envoie la table complète des surcharges via `auth.updateUser` après les upserts de comptes ; le drapeau `cloud.accountTypesDirty` permet de retenter si l’écriture échoue. Les surcharges sont supprimées quand un compte repasse à un type standard, change de type de base ou est supprimé.
- Le logo d’un compte n’est plus ajouté manuellement. Le formulaire propose une liste de banques issue de `BANK_CATALOG` (banques françaises, néobanques et courtiers) et affiche un aperçu du logo automatique. Les logos connus sont des fichiers locaux dans `assets/banks/` ; les autres établissements utilisent un monogramme coloré. Le choix est stocké dans `accounts.short` sous la forme `bank:<identifiant>` (par exemple `bank:bnp`), sans migration SQL. `fromCloudAccount` reconstruit `bank` et les initiales ; `toCloudAccount` réécrit le jeton. Les anciennes data URLs sont ignorées et remplacées à la prochaine synchronisation réussie.
- Le logo d’une crypto est uniquement celui fourni par CoinGecko. Aucun fichier n’est demandé. Le client écrit `Détenu` dans `crypto_holdings.status` pour respecter la contrainte ; une ancienne data URL est ignorée puis remplacée à la prochaine synchronisation.
- La suppression d’un compte est disponible dans la fenêtre de configuration. Une confirmation explicite indique le nombre d’opérations et de récurrences liées, qui sont supprimées localement puis côté Supabase via les clés étrangères `on delete cascade`. Le dernier compte ne peut pas être supprimé ; un message invite à en créer un autre d’abord. Les jetons MCP existants ne sont pas modifiés automatiquement si leur compte par défaut est supprimé.
- Les liens CSS/JS de `index.html` utilisent le cache-busting `accounts-bank-logos-2`. Le build GitHub Pages du commit `e42d21b` a été construit le 22 octobre 2026 et vérifié : `index.html`, `app.js`, `styles.css` et les assets `assets/banks/` répondent en HTTP 200, les six nouveaux logos de courtiers sont servis, et `BANK_CATALOG` charge les 27 établissements dans le navigateur.
- Vérifications réellement effectuées : `node --check app.js` ; contrôle scripté des appels `$('...')` contre les `id` de `index.html` ; test navigateur local avec des données synthétiques (catalogue de 27 établissements, sélection BNP/Revolut/Interactive Brokers/Swissquote, aperçu automatique, option « Autre / initiales », enregistrement d’un PEA avec `bank='bnp'`, affichage des logos locaux, suppression d’un compte avec opérations/récurrences liées, garde du dernier compte, ouverture du dialogue crypto sans champ de fichier). Les 23 logos locaux ont été chargés et décodés dans le navigateur. La synchronisation a été testée avec un client Supabase simulé : `accounts.short` vaut `bank:bnp`, `kind='savings'`, la position crypto est envoyée avec `status='Détenu'` et sans logo, et les upserts d’opération/récurrence fonctionnent. Aucun test avec une session Supabase réelle ni persistance réelle après rechargement n’a été exécuté ici.
- Reste à faire : avec un utilisateur réel, créer un PEA/AV/CTO avec une banque, recharger la page et vérifier le type et le logo ; vérifier que `accounts.short` contient bien `bank:<identifiant>` ; supprimer un compte de test et vérifier la cascade dans Supabase ; vérifier que les métadonnées `accountTypes` sont bien présentes sur le compte Auth.

## 16. Actions, ETF et nantissement (22-23 octobre 2026)

- Nouvelle vue « Actions » avec les mêmes indicateurs que la vue Crypto : investi, valeur actuelle, gain/perte et performance. Le tableau affiche le titre, le compte, la quantité, le prix actuel en euros (avec le prix natif en devise étrangère), la valeur actuelle, le gain/perte et la performance. Les filtres par compte et gain/perte, la recherche et les tris sont disponibles ; les totaux correspondent aux positions affichées.
- La recherche et les cours passent par la fonction Edge Supabase `stock-data`, qui relaie l’API publique StockAnalysis (`/api/search` et `/api/charts/a/{id}/1D/l`, avec repli sur `1Y`) et vérifie la session Supabase. Les taux de change viennent directement de `https://open.er-api.com/v6/latest/EUR`. Les cours LSE sont exprimés en pence et traités avec la devise `GBX` (conversion GBP/100) ; le prix natif est affiché en GBP. Les prix sont actualisés au chargement, toutes les cinq minutes lorsque l’onglet est visible et via le bouton « Actualiser les cours ». Les valeurs sont mises en cache dans le navigateur ; une position sans cours n’est pas valorisée et est exclue des totaux.
- Plusieurs places peuvent renvoyer le même nom pour une recherche. L’ordre de pertinence de StockAnalysis est conservé, mais la place, la devise et le type sont affichés. La touche Entrée ne sélectionne plus automatiquement le premier résultat quand plusieurs places sont proposées ; l’utilisateur doit cliquer sur la bonne ligne.
- `state.stockHoldings` et `state.accountPledges` sont stockés dans les métadonnées Auth (`user_metadata.stockHoldings`, `user_metadata.accountPledges`) via `auth.updateUser`. Aucune migration SQL n’est nécessaire. `saveAccountMetadataToAuth` écrit ensemble `accountTypes` et `accountPledges` ; `saveStockHoldingsToAuth` écrit les positions. Les drapeaux `cloud.accountPledgesDirty` et `cloud.stockHoldingsDirty` permettent de retenter une sauvegarde échouée. Les liens CSS/JS de `index.html` utilisent le cache-busting `stocks-pledges-3`.
- La fonction Edge `stock-data` est déployée sur le projet Supabase lié. Elle est déclarée `verify_jwt=false` afin de laisser passer le pré-vol CORS, puis valide elle-même le jeton Bearer via `auth/v1/user`. Elle ne lit ni n’écrit aucune table. Tests effectués : pré-vol `OPTIONS` en 200, `POST` sans jeton en 401, recherche LVMH, cours AAPL/EPA-MC/LON-SHEL depuis la session GitHub Pages.
- Le formulaire de compte propose une case « Ce compte est nanti » et une note facultative. Le statut est visible par un badge « Nanti » sur les cartes de compte, la vue d’ensemble et les positions actions ; la note apparaît sur la carte. La suppression d’un compte retire ses positions actions et son nantissement, en plus des opérations et récurrences.
- Les données personnelles et les montants réels ne sont pas codés en dur dans le dépôt. Les tests navigateur ont utilisé un état synthétique, local puis sur GitHub Pages, sans écrire dans le compte réel.
- Vérifications réellement effectuées : `node --check app.js` ; contrôle scripté des appels `$('...')` contre les `id` de `index.html` (aucun manquant ni doublon) ; test navigateur local avec quatre positions synthétiques (AAPL, Shell, Air Liquide, CW8), récupération des cours StockAnalysis, conversion USD/EUR et GBX/EUR, résumé investi/valeur/gain/performance, filtres par compte et gain, recherche « Air Liquide » et « LVMH », ajout d’une position via le formulaire, activation/désactivation du nantissement, badge sur les cartes et le tableau de bord, modification d’une position, suppression avec annulation, suppression d’un compte et de ses positions/nantissement liés. Test LSE : `LON-SHEL` reçoit un cours en pence, s’affiche en GBP et se convertit correctement en euros. Test d’affichage étroit avec Chrome headless à 500 px de large (largeur minimale de la fenêtre headless) : navigation inférieure complète, cartes de compte sur une colonne et badge Nanti lisibles, vue Actions empilée sans débordement horizontal de la page. Les dialogues longs (compte et action) sont limités à `90dvh` avec défilement interne ; à 800 × 655, le champ Nantissement et les boutons Enregistrer/Annuler restent accessibles après défilement, sans erreur console. Test GitHub Pages du 23 octobre 2026, version `stocks-pledges-3`, avec une session réelle et un état synthétique : recherche LVMH (10 résultats), cours AAPL/EPA-MC/LON-SHEL via `stock-data`, ajout synthétique d’une position LVMH/EPA-MC, lignes, valeurs et badge Nanti corrects, aucun timer de synchronisation. Après rechargement, l’état réel est restauré (0 position, 0 nantissement) et aucune erreur console n’est signalée. La persistance réelle de `user_metadata.stockHoldings` et `user_metadata.accountPledges` n’a pas été testée, car aucune donnée de test n’a été écrite dans le compte réel. Les cours peuvent être différés et le comportement en cas de limite de requêtes StockAnalysis n’a pas été testé durablement.
- Reste à faire : avec un utilisateur connecté, ajouter des positions actions sur IBKR et un PEA, recharger et vérifier `user_metadata.stockHoldings`, activer un nantissement et vérifier `user_metadata.accountPledges` après reconnexion, puis vérifier l’affichage sur un vrai téléphone (390 px ou moins, la fenêtre Chrome headless ne descendant pas sous 500 px).


## 13. Ajout d’actions/ETF par ISIN et valorisation du portefeuille (23 octobre 2026)

- La recherche d’instruments propose un catalogue local de plusieurs ETF internationaux et actions populaires, avec correspondance par ISIN, symbole ou nom. L’ISIN est conservé dans chaque position. La recherche distante existante reste disponible pour les titres hors catalogue.
- L’exemple BoursoBank `IE00B5BMR087` est inclus comme iShares Core S&P 500 UCITS ETF USD (Acc), symbole SXR8 sur Xetra. Le catalogue propose aussi des variantes de cotation du même fonds quand elles sont référencées.
- La vue d’ensemble et les soldes affichés dans « Mes comptes » incluent désormais la valeur de marché des positions rattachées à chaque compte. Si le cours d’une position est indisponible, la valorisation utilise temporairement le montant investi comme estimation et non un cours actuel.
- Les prix restent dépendants du service StockAnalysis existant et peuvent être indisponibles ou différés ; le catalogue ISIN ne garantit pas que chaque identifiant de cotation soit pris en charge par ce fournisseur.
- Vérification effectuée : relecture des blocs modifiés sur GitHub. Aucun test navigateur ni validation des cours pour chaque ligne de catalogue n’a été effectué.


## 14. Crypto intégrées à la vue d’ensemble (23 octobre 2026)

- Le total des avoirs et le patrimoine net de la vue d’ensemble incluent désormais la valorisation des positions crypto, en plus des soldes de comptes et des actions/ETF.
- Quand un cours CoinGecko est disponible, la valeur retenue est quantité × prix en euros. Si le cours est indisponible, le montant investi sert d’estimation provisoire afin que la position ne disparaisse pas du total.
- Les totaux « Banque » et « Professionnel » restent limités aux comptes correspondants : les cryptos ne sont pas attribuées artificiellement à un compte bancaire.
- Le tableau de bord se rafraîchit lorsque la récupération des prix crypto se termine. Aucun test navigateur n’a été exécuté.


## Écrans patrimoine ajoutés

- Vues `FIRE`, `Comparaisons` et `Lombard` ajoutées à la navigation sans retirer les écrans existants.
- Vue FIRE : hypothèses modifiables de rente, taux de retrait, épargne et rendement ; projection illustrative basée sur le patrimoine net suivi dans l’application.
- Comparaisons : seuils financiers statiques et explicitement indicatifs, non présentés comme un percentile officiel calculé.
- Lombard : simulation BTC sur les achats communiqués (60 000 € à 70 100 $/BTC financés par le crédit ; 69 800 € à 85 100 $/BTC en personnel), prix BTC et EUR/USD modifiables, dette restante estimée à partir de 101 000 € empruntés moins 39 000 € remboursés. Les calculs excluent intérêts, frais et fiscalité.


## 17. Consolidation du calcul FIRE (24 octobre 2026)

- Le calcul FIRE reste un modèle indicatif côté navigateur, sans modification de base ni migration Supabase.
- Le capital suivi correspond aux comptes, positions actions/ETF et cryptomonnaies valorisés par l'application, diminués du crédit lombard. Il ne représente pas automatiquement la valeur nette immobilière si celle-ci n'est pas saisie dans les avoirs suivis.
- Le seuil FIRE est revalorisé chaque mois avec l'inflation pour maintenir le pouvoir d'achat cible à l'âge de départ.
- Les retraits et les loyers affichés sont indexés sur l'inflation. Cette hypothèse sur les loyers peut différer de la réalité.
- Un retrait ne peut plus dépasser le capital disponible. Une fois le portefeuille épuisé, le revenu réellement versé par le capital tombe à zéro.
- Les scénarios affichés sont prudent, central, favorable et choc ponctuel de -20 % au premier mois de retraite. Ils sont déterministes et ne constituent ni une simulation Monte-Carlo ni une garantie.
- Le taux de retrait par défaut est passé à 4 % ; il reste modifiable. La fiscalité reste une approximation basée sur la part estimée de gains et doit être vérifiée selon l'enveloppe et la réglementation applicable.
- Les calculs mensuels utilisent un rendement mensuel équivalent au rendement annuel nominal, avec versements d'épargne en fin de mois. Le patrimoine réel est exprimé en euros constants.
- Référence méthodologique : docs/FIRE-METHODOLOGY.md.
- Contrôles effectués : relecture statique du code et des sources. Le navigateur, les données Supabase réelles et le déploiement GitHub Pages ne sont pas déclarés testés.


## Simulateur FIRE — pension et graphique (2026-10-24)
- Le montant de pension nette mensuelle estimée est saisissable dans `#fire-pension`, initialisé à 0 € et activé à partir de 64 ans.
- La pension saisie est interprétée en euros d’aujourd’hui puis projetée avec l’inflation paramétrée ; les loyers restent constants en euros nominaux et ne sont pas indexés.
- À la retraite, les retraits du capital couvrent le complément nécessaire après loyers et pension ; les tableaux et infobulles détaillent ces trois sources de revenus.
- Le graphique couvre l’âge actuel jusqu’à l’âge de fin et utilise une échelle verticale logarithmique adoucie pour rendre lisibles les valeurs à court terme malgré la croissance à long terme.
- Le modèle reste déterministe et indicatif ; aucun test navigateur de bout en bout n’a été effectué pour ce changement.


## 18. Historique crypto de l’écran Opportunités — fin des erreurs de limite (28 octobre 2026)

- Symptôme : sur l’écran Opportunités, l’historique 1 an échouait pour plusieurs positions à la suite avec « Fournisseur temporairement limité : réessaie dans une minute » (RSR, BTC, PUST, ESE). Cause : l’historique crypto passait uniquement par l’API publique CoinGecko appelée depuis l’Edge Function, dont le quota par IP est très bas et partagé ; le premier HTTP 429 posait un gel global côté navigateur, qui bloquait ensuite toutes les autres requêtes, y compris les historiques d’actions/ETF.
- La fonction Edge `stock-data` essaie désormais Yahoo Finance (`SYMBOLE-EUR`, 1 an ou 5 ans, clôtures journalières) avant CoinGecko. CoinGecko reste le repli pour les cryptos absentes de Yahoo ou non libellées en euros. L’historique réussi est mis en cache 6 heures dans l’instance Edge ; un 429 CoinGecko suspend ce repli pendant 60 secondes. Clé de démonstration facultative via le secret `COINGECKO_API_KEY`.
- Le client envoie le symbole de la position avec `crypto-history`. Les gels de 60 secondes après un 429 sont maintenant suivis **par action** (`crypto-market`, `crypto-history`, `price`, `history`) au lieu d’un gel global.
- Les échecs d’historique sont mémorisés par actif : le préchargement de l’écran Opportunités ne relance plus une rafale à chaque rendu, affiche un message explicite, et une nouvelle tentative automatique est planifiée après une minute. Le bouton « Actualiser l’analyse » force une nouvelle tentative immédiate.
- Cache-busting `app.js` : `crypto-history-yahoo-v1`. `styles.css` inchangé.
- Vérifications réellement effectuées : `node --check app.js` ; appels directs Yahoo Finance pour BTC, ETH et RSR en EUR (366 points sur 1 an, 1 827 points sur 5 ans) et contrôle du repli pour des symboles absents (PUST, ESE → HTTP 404 Yahoo, donc CoinGecko). La fonction Edge n’a pas pu être déployée ni testée ici : elle doit être redéployée (`supabase functions deploy stock-data`) pour que le correctif soit actif. Aucun test navigateur avec session Supabase réelle n’a été exécuté.


## 19. Graphique technique TradingView et fiabilisation MM200 (30 octobre 2026)

- L’écran « Opportunités » utilise désormais TradingView Lightweight Charts 4.2.2 pour afficher le cours historique et la MM200 sur une échelle temporelle commune, avec crosshair, zoom, déplacement et adaptation à la largeur du conteneur.
- La bibliothèque est chargée depuis un CDN dans `index.html`; aucun framework ni étape de build n’est ajouté. Les versions CSS/JS ont été actualisées pour invalider le cache du navigateur.
- Les historiques sont normalisés en clôtures journalières datées en UTC ; les doublons d’une même journée sont dédupliqués et les valeurs non finies ou non positives sont exclues.
- La MM200 est une SMA arithmétique des 200 derniers points journaliers : 200 séances pour les actions/ETF et 200 jours calendaires pour les cryptomonnaies. Pour les cryptos, Yahoo fournit des clôtures journalières ; le repli CoinGecko fournit des observations journalières, qui ne constituent pas nécessairement une clôture de marché officielle. Une lacune supérieure à 10 jours pour les actions, ou toute journée manquante pour les cryptos, invalide la fenêtre concernée ; aucune interpolation ni valeur de remplacement n’est appliquée.
- La dernière clôture, la MM200 et l’écart en pourcentage sont calculés sur la même date. Le résumé indique la date de la dernière clôture et le nombre de clôtures valides. Si la fenêtre récente est insuffisante ou discontinue, la MM200 reste indisponible plutôt que d’afficher un signal trompeur.
- Les périodes 1 mois et 3 mois modifient le zoom du graphique sans raccourcir l’historique utilisé pour calculer la MM200. Les actions sont affichées sur environ 21/63 séances et les cryptos sur 30/90 jours.
- Les sources de marché ne sont pas remplacées par cette migration : actions/ETF via StockAnalysis ; cryptos via Yahoo Finance en EUR, avec repli CoinGecko. La qualité de la moyenne dépend donc toujours de la disponibilité et de l’exactitude de ces fournisseurs. La MM200 est calculée sur les cours de clôture fournis, sans ajustement spécifique des dividendes ou opérations sur titres au-delà de ce que la source transmet.
- Modifications : `app.js`, `index.html`, `styles.css`. Aucune migration Supabase et aucun changement de données personnelles.
- Branche de travail : `feat/tradingview-mm200`. Les changements ne sont pas fusionnés dans `main` et GitHub Pages n’a pas été déployé depuis cette branche.
- Vérifications effectuées dans cette session : relecture des sections modifiées et contrôle des références de scripts, styles et fonctions. **Non effectués** : `node --check`, tests automatisés, test navigateur réel, contrôle de la précision des historiques auprès des fournisseurs et validation sur téléphone. Ces validations restent nécessaires avant fusion.
