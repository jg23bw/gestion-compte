# Architecture cible — refonte hexagonale

## Statut

Décision d'architecture pour la refonte progressive du front-end. Le dépôt reste déployable sur GitHub Pages et conserve HTML/CSS/JavaScript natifs dans un premier temps. Aucun framework ni bundler n'est introduit par défaut.

## Diagnostic de départ

- `app.js` concentre actuellement environ 232 Ko et 3 000 lignes.
- Il contient près de 190 fonctions nommées couvrant les règles métier, les cas d'usage, le DOM, le stockage local, Supabase, les API de marché, les exports et l'authentification.
- La suite automatisée identifiée couvre principalement les indicateurs techniques MM200 ; elle ne constitue pas une couverture fonctionnelle de l'application.
- Le projet n'a pas de `package.json` ni de pipeline de build front-end identifié.
- Les données et contrats existants (modèle JS, schéma Supabase, clés de stockage, dates calendaires, synchronisation et règles RLS) doivent rester compatibles pendant la migration.

Ce diagnostic décrit le dépôt inspecté au démarrage de la refonte ; il ne prétend pas démontrer l'absence de défauts.

## Principes non négociables

1. Les règles métier ne dépendent ni du DOM, ni de Supabase, ni de `localStorage`, ni du réseau.
2. Les cas d'usage orchestrent le domaine au travers de ports explicites.
3. Les adaptateurs implémentent les ports ; les dépendances pointent vers le domaine et les contrats, jamais l'inverse.
4. Le bootstrap est le seul endroit qui assemble les adaptateurs et les cas d'usage.
5. Les modules sont petits, nommés par responsabilité et documentés par des contrats/types JSDoc.
6. Les dates métier restent des dates calendaires `YYYY-MM-DD` ; elles ne sont pas converties en instants UTC pour les calculs de date.
7. Les montants sont validés et normalisés à la frontière ; les règles métier travaillent sur des nombres décimaux maîtrisés. Une décision dédiée devra être prise sur l'usage des centimes entiers pour les montants monétaires avant migration des calculs.
8. Toute modification de contrat de persistance doit préserver les correspondances Supabase et faire l'objet de tests de contrat.
9. Pas de réécriture globale : extraction par domaine, avec comportement observable couvert avant chaque déplacement.
10. Pas de faux tests : un test unitaire ne remplace pas un test d'intégration ou navigateur.

## Architecture cible

```text
src/
  domain/
    accounts/
    transactions/
    recurring/
    professional/
    portfolio/
    lombard/
    fire/
    shared/
  application/
    use-cases/
    services/
  ports/
    repositories/
    market-data/
    authentication/
    clock/
    storage/
  adapters/
    persistence/
      local/
      supabase/
    market-data/
      coingecko/
      stockanalysis/
      exchange-rates/
    authentication/
    ui/
      dom/
  bootstrap/
    create-application.js
    main.js
tests/
  unit/
  application/
  integration/
  contract/
  browser/
```

### Domaine

Contient les entités, invariants et fonctions pures : calcul de soldes, classification des opérations, règles de récurrence, valorisation des positions, calculs professionnels, crédit lombard et projections FIRE. Aucun import d'adaptateur.

### Application

Contient les cas d'usage et la coordination : créer/modifier/supprimer une opération, pointer, réordonner, générer les récurrences, enregistrer une position, actualiser des prix, synchroniser et exporter. Dépend du domaine et des ports.

### Ports

Contrats définis côté application : dépôts de comptes/opérations/récurrences/positions, fournisseur de prix, taux de change, authentification, stockage local, horloge et génération d'identifiants. Les contrats décrivent les besoins de l'application, pas les détails d'un fournisseur.

### Adaptateurs

Implémentations concrètes : Supabase, stockage local, CoinGecko, StockAnalysis, taux de change et interface DOM. Les erreurs réseau et les formats externes sont traduits en erreurs et modèles applicatifs stables.

### Bootstrap et interface

Le bootstrap instancie les adaptateurs, injecte les dépendances et expose les cas d'usage. Les modules UI lisent les événements DOM, appellent les cas d'usage et affichent les résultats ; ils ne réimplémentent pas les règles métier.

## Stratégie de migration

Chaque étape doit rester déployable et réversible.

1. **Geler le comportement de référence** : inventorier les fonctions, événements, états, formats persistés, appels réseau et contrats Supabase. Ajouter des tests de caractérisation autour des règles existantes avant extraction.
2. **Installer la base de test** : utiliser le runner natif `node:test` tant que le projet reste sans build. Ajouter scripts reproductibles, CI et conventions de fixtures sans données personnelles.
3. **Extraire les fonctions pures** : commencer par dates/montants, comptes et opérations, puis récurrences et calculs professionnels. Ajouter des tests unitaires déterministes pour chaque règle.
4. **Introduire les ports** : définir les interfaces JSDoc et les tests de contrat pour les dépôts, le stockage, l'horloge et les fournisseurs de prix.
5. **Extraire les adaptateurs** : isoler Supabase et stockage local sans changer les schémas, clés ni stratégie de synchronisation. Tester les mappers aller/retour et les erreurs.
6. **Extraire les cas d'usage** : déplacer progressivement les actions et leur orchestration hors des listeners DOM.
7. **Réduire app.js** : conserver temporairement un point de compatibilité/bootstrap, puis le réduire à l'initialisation et à l'assemblage.
8. **Valider les parcours navigateur** : authentification, données locales/cloud, comptes, opérations, récurrences, portefeuilles, cours, FIRE, exports, responsive et erreurs réseau.

Une étape n'est considérée terminée que lorsque ses tests passent, que les contrats sont documentés et que les parcours concernés sont vérifiés. La couverture globale sera mesurée par domaine ; aucun pourcentage arbitraire ne sera utilisé comme preuve de qualité.

## Matrice minimale de tests attendue

| Domaine | Tests unitaires | Intégration / contrat | Parcours navigateur |
|---|---|---|---|
| Dates et montants | formats français, décimales, signes, dates invalides, années bissextiles | mapping ISO et validation des entrées | calendrier, saisie, édition |
| Comptes | types, soldes initiaux, soldes à date, nantissement | dépôt local/cloud et mapping | création, édition, suppression |
| Opérations | entrées/sorties, dates, pointage, ordre, filtres | persistance, erreurs et reprise | CRUD, undo, tri, pointage |
| Récurrences | fréquences, échéances, mois limites, montants absents, idempotence | lecture/écriture et clés anti-doublon | génération répétée, annulation |
| Compte professionnel | TVA, cotisations, provisions, marge, solde ajusté | cohérence des opérations récurrentes | vue pro et modification |
| Crypto et actions | quantité, coût, valeur manuelle, P&L, devise, cours absent | contrats fournisseurs, cache, FX, erreurs API | recherche, édition, refresh |
| MM200/opportunités | normalisation, trous, SMA, signaux et formats | parsing des réponses historiques | chargement, période, tooltip |
| Lombard | dette, taux, remboursement, couverture et calculs | sauvegarde des paramètres | création, modification, suppression |
| FIRE | accumulation, retrait, pension, loyers non indexés, inflation, bornes d'âge | scénarios de référence reproductibles | sliders, valeurs par défaut, graphiques |
| Auth/Supabase | mappers et transitions d'état | RLS, session expirée, conflit, erreurs réseau | inscription, connexion, déconnexion, multi-session |
| Exports | JSON/CSV, accents, séparateurs, données vides | schéma d'export/import | téléchargement et réouverture |

Les tests utilisant des données financières utilisent uniquement des fixtures synthétiques.

## Règles de qualité et CI

- `node --check` sur chaque module JavaScript.
- Tous les tests unitaires, application, intégration et contrat dans GitHub Actions.
- Contrôle des imports : domaine sans dépendance vers application/adaptateurs/UI ; application sans dépendance vers adaptateurs.
- Contrôle des IDs DOM et des points d'entrée HTML.
- Tests déterministes : horloge, identifiants et réseau simulés.
- Pas de requête réseau réelle dans les tests unitaires.
- Les tests navigateur doivent utiliser un environnement isolé et des comptes/données de test ; aucune opération sur les données personnelles de production.
- Les secrets de test sont fournis par les secrets CI et jamais commités.
- Le rapport final distingue tests exécutés, tests non exécutés et comportements restant à valider manuellement.

## Compatibilité et sécurité

- Pas de changement destructif de schéma Supabase dans cette refonte.
- Les mappers `toCloud*` / `fromCloud*` restent couverts par des tests de contrat.
- RLS reste la frontière de sécurité ; les métadonnées utilisateur ne deviennent jamais un mécanisme d'autorisation.
- La synchronisation locale/cloud, les suppressions en attente, les marqueurs de génération et l'annulation doivent être préservés.
- Les données privées et secrets ne sont jamais ajoutés aux fixtures, logs ou docs.

## Critères d'acceptation finaux

- Les règles métier essentielles sont testées sans DOM ni réseau.
- Les cas d'usage critiques sont testés avec des ports simulés.
- Les adaptateurs de persistance et fournisseurs de prix ont des tests de contrat.
- Les parcours critiques ont des tests navigateur automatisés et reproductibles.
- L'application conserve ses données et contrats existants.
- `app.js` ne contient plus de règles métier ni d'implémentations d'adaptateurs.
- Les dépendances respectent les frontières hexagonales.
- La documentation explique comment ajouter un nouveau cas d'usage, adaptateur et test.


## Avancement réel de la migration

### Étape 1 — socle de tests et premier domaine extrait

**Terminée sur la branche `refactor/hexagonal-architecture`.**

- Ajout de `package.json` avec les commandes `npm run check` et `npm test`, sans dépendance externe.
- CI exécutée sur `main` et les branches `refactor/**`.
- Extraction des règles de transactions et de compte professionnel dans `src/domain/transactions/transaction-rules.js`.
- Le module est pur : pas d'accès au DOM, au réseau, à Supabase, au stockage ou à l'horloge.
- `app.js` délègue désormais le tri des opérations, le calcul des soldes, la classification des provisions, les soldes ajustés et le calcul TVA/cotisations à ce module.
- Ajout de tests unitaires sur ces règles, en complément des tests MM200 existants.

**Dernière vérification CI :** `npm run check` réussi ; `npm test` réussi ; 26 tests passés, 0 échec.

### Périmètre restant

Cette première étape n'est pas la refonte hexagonale complète. Les ports, adaptateurs de persistance, cas d'usage, tests de contrat Supabase/localStorage et tests navigateur restent à implémenter. Les autres domaines (récurrences complètes, portefeuille, Lombard, FIRE, authentification et synchronisation) ne sont pas encore extraits ni intégralement couverts.

La suite doit poursuivre domaine par domaine, sans déclarer la migration terminée tant que les critères d'acceptation de ce document ne sont pas atteints.


### Étape 2 — premier flux applicatif hexagonal

**Implémentée et validée par CI.**

- Définition du port `TransactionRepository`.
- Adaptateur `StateTransactionRepository` qui encapsule l'état historique sans modifier le format des données.
- Cas d'usage de lecture `TransactionQueries` pour lister les opérations, calculer un solde à date et calculer le solde professionnel ajusté.
- Injection du dépôt et du domaine dans le cas d'usage ; l'interface historique passe désormais par ce service pour ces lectures.
- L'adaptateur reçoit un fournisseur d'état, afin de rester correct lorsque l'application remplace son objet d'état après chargement/synchronisation.
- Ajout de tests du cas d'usage et vérification de syntaxe de chaque module de cette tranche.

**CI vérifiée sur le commit `6b9c3e4` :** contrôle syntaxique réussi, 30 tests passés, 0 échec.

Cette tranche est une première vertical slice hexagonale, pas une migration complète : les écritures d'opérations, la persistance Supabase/localStorage et les autres domaines restent à isoler.


#### Complément — solde après opération

Le calcul du solde courant après une opération a également été déplacé dans `TransactionQueries`. L'interface historique conserve sa signature, mais délègue désormais au cas d'usage. Les tests couvrent l'ordre d'affichage (du plus récent au plus ancien), l'arrêt sur l'opération demandée et le cas d'un compte supprimé.

**Dernière CI vérifiée :** commit `ba79a22`, 32 tests passés, 0 échec ; `npm run check` réussi.


#### Complément — création et modification d'opération

La construction du modèle d'opération est maintenant une règle métier pure (`createTransactionRecord`) :
- conservation de l'ordre manuel lors d'une modification dans le même compte ;
- attribution du prochain ordre lorsqu'une opération est créée ou déplacée ;
- conservation de l'état de pointage et de la date de création lors d'une modification.

L'interface garde la validation des champs et les effets UI/undo, mais délègue la construction du modèle au domaine.

**CI vérifiée :** commit `04a4e49`, 35 tests passés, 0 échec ; contrôle syntaxique réussi.

- [x] Opérations : cas d’usage d’écriture pour création, modification, suppression, pointage et réordonnancement ; orchestration undo/rendu/synchronisation conservée dans l’interface legacy.
- [x] Tests unitaires des cas d’usage de mutation des opérations (5 scénarios).


### Étape 3 — écritures des opérations et mapping Supabase

**Implémentée et validée par CI.**

- Les cas d'usage applicatifs couvrent désormais la création, la modification, la suppression, le pointage/dépointage et le réordonnancement des opérations.
- Le dépôt de transactions expose les méthodes de lecture et d'écriture ; l'adaptateur d'état conserve le modèle mémoire historique.
- L'orchestration de l'annulation, du rendu et des indicateurs de synchronisation reste volontairement dans la couche UI legacy à ce stade.
- Les conversions des opérations vers/depuis les lignes Supabase sont isolées dans `src/adapters/persistence/supabase/transaction-mapper.js`.
- L'horloge est injectable dans le mapper pour des tests déterministes ; les noms de colonnes et règles de compatibilité existants sont conservés.
- Tests dédiés des cas d'usage d'écriture, de l'adaptateur d'état et du mapping Supabase.

**CI vérifiée sur le commit `d0f1a4d` :** `npm run check` réussi ; 49 tests passés, 0 échec.

**Limites restantes :** le mapper n'est pas encore utilisé par un dépôt Supabase complet ; les appels réseau, la synchronisation, les suppressions en attente, le chargement initial et les autres mappers restent dans `app.js`. Aucun test de contrat contre Supabase réel ni test navigateur n'a encore été exécuté.


### Étape 4 — première règle métier des récurrences

**Implémentée et validée par CI.**

- Extraction de `dueDateForTemplate` dans `src/domain/recurring/recurring-rules.js`.
- La règle reste pure et couvre les fréquences mensuelle, trimestrielle, annuelle et ponctuelle.
- Les bornes de mois des récurrences mensuelles sont inclusives ; les jours impossibles sont ramenés au dernier jour du mois.
- L'interface délègue désormais le calcul de l'échéance au domaine.
- Tests sur février bissextile/non bissextile, fins de mois, bornes de période, mois configurés et fréquence invalide.

**CI vérifiée sur le commit `a5d9521` :** `npm run check` réussi ; 54 tests passés, 0 échec.

**Limites restantes :** la génération des opérations, l'idempotence, le stockage des marqueurs de mois, l'annulation et les mutations des modèles restent dans `app.js`. Cette extraction ne constitue pas encore le cas d'usage complet de génération des récurrences.


### Étape 4 — génération des opérations récurrentes

La construction des opérations récurrentes d'un mois est isolée des événements DOM :
- filtrage des modèles désactivés, montants absents ou non numériques ;
- calcul de l'échéance via les règles de domaine ;
- construction du modèle d'opération et de sa clé `recurringKey` ;
- déduplication contre les opérations existantes et au sein du lot généré ;
- injection possible de l'identifiant et de l'horloge pour des tests déterministes.

Le cas d'usage `RecurringCommands` délègue au domaine et l'interface l'utilise pour construire les ajouts. L'interface conserve volontairement l'annulation, la mutation de l'état, les marqueurs localStorage, le rendu et la synchronisation cloud : ces effets ne sont pas encore déplacés vers des ports/adaptateurs. Le verrouillage mensuel et la détection de génération déjà effectuée restent donc orchestrés dans `app.js`.


### Étape 5 — marqueurs de génération

Le stockage des mois générés est maintenant derrière le port `GeneratedMonthsRepositoryPort` et son adaptateur `LocalStorageGeneratedMonthsRepository`. La lecture tolère les données absentes, mal formées et les erreurs de lecture/écriture, comme auparavant. L'adaptateur expose aussi une sauvegarde brute/restauration exacte pour préserver le comportement d'annulation, y compris lorsque la clé n'existait pas avant l'action.

La règle métier reste inchangée : les opérations récurrentes présentes dans l'état sont la source de vérité ; le marqueur local est un verrou secondaire et est retiré lorsqu'aucune opération récurrente du mois n'existe. L'interface garde l'orchestration de l'annulation, du rendu et de la synchronisation.


### Crédit lombard

- Les règles pures de normalisation du crédit lombard sont isolées dans `LombardCreditRules` ; le format historique (`label`, `amount`, `rate`, `notes`) reste inchangé.
- `LombardCreditCommands` centralise la lecture depuis les métadonnées Auth et l'enregistrement via le port de métadonnées injecté. La vérification de l'utilisateur connecté et la normalisation sont couvertes par des tests unitaires.
- `app.js` conserve la composition du repository Supabase Auth et l'interface ; aucune migration SQL ni transformation des données existantes n'est requise.


### Positions actions et ETF

- `StockHoldingRules` porte la normalisation pure des positions et des devises, avec les catalogues de devises/marchés et la date courante injectés par la composition.
- `StockHoldingMetadataCommands` centralise la lecture de `user_metadata.stockHoldings` et la sauvegarde via le repository de métadonnées Auth.
- Le format JSON existant, y compris les positions manuelles Suravenir, reste inchangé ; les cours, conversions FX et interactions d'écran restent dans leurs composants respectifs.


### Mappers Supabase

- Les conversions des lignes comptes, modèles récurrents et positions crypto sont isolées dans `SupabaseAccountMapper`, `SupabaseRecurringTemplateMapper` et `SupabaseCryptoHoldingMapper`.
- Le mapper de comptes reçoit les règles d'identification de banque et de type de compte depuis la composition applicative ; les noms de colonnes et conversions restent compatibles avec le schéma existant.


### Compléments — opérations et classification des comptes

- La normalisation de l'ordre initial des opérations est désormais un cas d'usage de `TransactionCommands`, exécuté via le repository ; l'interface conserve uniquement le déclenchement au chargement.
- La classification et le type effectif d'un compte sont centralisés dans `AccountTypeRules`, sans dépendance UI.


### Fournisseur crypto secondaire

- Le repli CoinCap est maintenant un adaptateur `CoinCapFallbackProvider` derrière le port `CryptoFallbackProviderPort`.
- L'adaptateur reçoit le mapping des identifiants et le taux USD/EUR ; il ne connaît ni l'état de l'écran ni le cache applicatif.


### Indice Fear & Greed

- La récupération de l'indice Alternative.me est isolée dans `AlternativeMeFearGreedProvider`, derrière `FearGreedProviderPort`.
- Le rendu et le positionnement du marqueur restent dans l'interface ; l'adaptateur retourne uniquement le score et sa classification.


### Catalogue crypto

- La recherche de cryptomonnaies est isolée dans `CoinGeckoCatalogProvider`, derrière `CryptoCatalogProviderPort`.
- L'adaptateur gère la requête HTTP, le signal d'annulation, les erreurs HTTP et la limite de résultats ; l'interface garde le rendu et la gestion de la recherche en cours.


### Intégration MCP

- Les requêtes de gestion des jetons MCP sont centralisées dans `McpTokenService`, qui reçoit le service d'authentification, l'endpoint et la clé publique.
- L'interface conserve la liste, les confirmations de révocation et les messages ; le service applicatif gère la session, les en-têtes et les erreurs HTTP.


### Interface Opportunités

- Le rendu du tableau de bord Opportunités, les graphiques MM200, l'historique, le Fear & Greed et les préférences de colonnes sont regroupés dans `src/adapters/ui/dom/opportunities-screen.js`.
- Le module est chargé après les indicateurs techniques et avant le bootstrap historique. Cette première extraction conserve les points de compatibilité globaux ; l'injection explicite des dépendances UI reste une étape à terminer.


### Interface Actions / ETF

- Les fonctions de recherche, de chargement des cours et du FX, de valorisation affichée, de rendu et d'édition des positions actions/ETF sont regroupées dans `src/adapters/ui/dom/stocks-screen.js`.
- Les règles de normalisation et les cas d'usage de mutation restent dans leurs modules domaine/application dédiés. Le module d'écran utilise encore les bindings historiques du bootstrap.


### Synthèse patrimoniale

- `WealthSnapshotQueries` calcule les agrégats patrimoine brut/net, dette Lombard, investissements et liquidités à partir de dépendances applicatives injectées.
- Le rendu des comparaisons et des vues patrimoniales reste dans l'adaptateur DOM.


### Interface Crypto

- Les fonctions de recherche CoinGecko, d'édition, de suppression, de cache, de chargement des prix et de rendu du portefeuille crypto sont regroupées dans `src/adapters/ui/dom/crypto-screen.js`.
- Les ports et adaptateurs de fournisseurs ainsi que les dépôts restent séparés ; le module d'écran garde encore des dépendances de composition historiques.


### Interfaces Comptes, Opérations et Récurrences

- Les fonctions de rendu et d'interaction des comptes, opérations, historique mensuel et récurrences sont regroupées dans `src/adapters/ui/dom/accounts-operations-screen.js`.
- Les règles et cas d'usage restent dans `src/domain` et `src/application`; ce module est un adaptateur DOM encore connecté aux bindings du bootstrap legacy.


### Interface Patrimoine

- Les graphiques et composants de synthèse patrimoniale (répartition, valeur nette, cartes et interactions associées) sont regroupés dans `src/adapters/ui/dom/wealth-screen.js`.
- Les calculs de snapshot sont délégués à `wealthSnapshotQueries` ; le rendu reste dans l'adaptateur DOM.


### Dialogues de gestion

- Les dialogues de création/modification des opérations et comptes, les paramètres de nantissement et le formulaire Lombard sont regroupés dans `src/adapters/ui/dom/account-editors.js`.
- Les cas d'usage de persistance restent dans les services applicatifs ; l'adaptateur DOM conserve les confirmations et les effets visuels.
