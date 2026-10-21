# Contexte projet — Gestion de comptes

**Dernière mise à jour documentaire : 2026-10-18.** À relire et actualiser lors de chaque changement important. Cette documentation décrit le dépôt tel qu’inspecté ; elle ne prouve pas que les fonctions distantes Supabase ou le site hébergé ont été testés de bout en bout.

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

Les sections HTML inspectées incluent `accounts-view`, `transactions-view`, `history-view` et `recurring-view`. La navigation change la vue active sans routeur externe. Les fonctions de rendu principales présentes dans `app.js` incluent `renderDashboard`, `renderAccounts`, `renderTransactions`, `renderMonthlyHistory`, `renderRecurring` et `renderAll`.

## 4. Modèle de données métier

### Comptes
État JavaScript : `state.accounts`. Les propriétés côté client comprennent `id`, `name`, `short`, `kind`, `opening`, `vatRate`, `socialRate`, `netOpening`. Les types de compte connus sont `bank`, `savings`, `pro`.

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
