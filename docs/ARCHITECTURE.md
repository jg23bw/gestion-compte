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
