# Gestion de comptes

Application web personnelle pour suivre les soldes et les opérations de neuf comptes.

## Comptes préconfigurés
- La Banque Postale
- Fortuneo
- Fortuneo livret Plus
- CIC Montpont-Ménestrol
- CIC Montévrayn
- Boursobank
- Livret Boursobank Boursoplus
- Livret Boursobank BoursoFirst
- Compte professionnel Tiime

## Fonctionnalités
- Tableau de bord avec soldes cumulés et dernières transactions.
- Historique filtrable par compte et par type de mouvement.
- Ajout, modification et suppression de transactions.
- Calcul automatique des soldes à partir d'un solde de départ et des opérations datées.
- Export des données au format JSON ou des transactions en CSV.
- Paramètres par compte et calcul indicatif de la trésorerie Tiime après provisions estimées.
- Modèles de récurrences mensuelles, trimestrielles, annuelles ou ponctuelles.
- Génération des opérations d'un mois en un clic, avec détection des doublons et exclusion des montants non renseignés.
- Montants et libellés des modèles modifiables dans l'écran « Récurrences ».

## Démarrer
Aucune installation ni compilation n'est nécessaire. Ouvrez simplement [index.html](./index.html) dans un navigateur, ou activez GitHub Pages dans les paramètres du dépôt pour héberger l'application.

## Stockage et confidentialité
L'application peut synchroniser les comptes, leurs paramètres, les transactions et les modèles de récurrence avec Supabase après connexion. Les tables sont protégées par les règles RLS et chaque ligne est associée à l'identifiant de l'utilisateur. Le navigateur conserve aussi une copie locale ; lors d'une première connexion à un espace Supabase vide, l'application demande explicitement si ces données locales doivent être importées. Quand un espace cloud contient déjà des données, celles-ci sont la source de vérité et ne sont pas fusionnées automatiquement avec le stockage local.

**Ne placez pas de données personnelles dans le code source.** Les modèles de récurrence personnalisés doivent être créés et conservés dans la base de données ou dans le stockage local de l'utilisateur, jamais codés en dur dans le dépôt.

## Calcul Tiime : hypothèses à vérifier
Le compte professionnel affiche le solde bancaire réel et une estimation après provisions. Pour une entrée positive supposée TTC, l'application calcule le HT en divisant par `1 + taux de TVA`, isole la TVA et estime les cotisations sur le HT. Les sorties sont déduites intégralement de l'estimation nette. Le solde net de départ est configurable séparément.

Ces hypothèses sont volontairement simples et **ne remplacent pas un calcul comptable ou fiscal**. Ajustez les taux à votre situation et à votre régime (notamment les règles de TVA et d'assiette des cotisations). Les taux initiaux sont des exemples configurables, pas des conseils fiscaux.

## Limites de cette première version
- Les montants inconnus sont laissés vides et doivent être renseignés dans « Récurrences » avant de pouvoir générer ces opérations.
- Les mois des intérêts Lombard sont préconfigurés en janvier/avril/juillet/octobre et restent à confirmer. Pour les échéances annuelles où seul le mois était fourni, le jour est initialisé au 1er et peut être modifié dans l'écran « Récurrences ».
- Pas de connexion automatique aux banques.
- La synchronisation Supabase nécessite une configuration et une connexion à un compte.
- Les données locales peuvent être perdues si le stockage du navigateur est effacé ; utilisez l'export JSON.
- L'application ne préremplit aucun solde bancaire : renseignez les soldes de départ dans « Mes comptes ».

## Base de données en ligne (Supabase gratuit)

Si la base Supabase existe déjà et que l'application affiche un avertissement indiquant que le pointage ou l'ordre manuel ne sont pas conservés, ouvrez **SQL Editor** dans le projet Supabase et exécutez le fichier [supabase/migrations/202610180002_transaction_pointage_order.sql](./supabase/migrations/202610180002_transaction_pointage_order.sql). Cette migration ajoute les colonnes manquantes sans supprimer les opérations existantes. Attendez ensuite que l'application indique « Synchronisé en ligne », puis rechargez la page.

Le schéma PostgreSQL de la base se trouve dans [supabase/schema.sql](./supabase/schema.sql). Il prévoit les comptes, transactions, modèles de récurrence et un historique des insertions/modifications/suppressions. Les tables sont protégées par la sécurité au niveau des lignes (RLS) : chaque utilisateur authentifié ne peut accéder qu'à ses propres données.

### Mise en place

1. Créez un projet sur [Supabase](https://supabase.com/) en choisissant le forfait Free.
2. Dans le projet, ouvrez **SQL Editor**, collez le contenu de `supabase/schema.sql` et exécutez-le.
3. Dans **Authentication → URL Configuration**, configurez l'URL de votre site GitHub Pages comme URL de redirection. Vous pouvez laisser la confirmation par e-mail activée.
4. Le fichier `supabase-config.js` contient l'URL du projet et la clé publique publishable. Cette clé est faite pour le navigateur ; la sécurité dépend de l'authentification et des politiques RLS. **Ne jamais utiliser ni publier une clé `sb_secret_` ou `service_role`.**
5. Rechargez l'application : « Connexion cloud » permet de créer un compte ou de se connecter. La première connexion importe les données locales si la base est vide. Une copie de sécurité locale est conservée sous `gestion-comptes-cloud-migration-backup-v1` ; exportez aussi régulièrement un JSON depuis l'application.
6. Vérifiez que le statut indique « Synchronisé en ligne » avant de saisir ou modifier des données financières. Si la connexion signale une erreur de table ou de permission, vérifiez que le SQL a été exécuté sans erreur dans le bon projet.

**Important :** l'interface et la synchronisation sont intégrées au dépôt, mais le schéma SQL doit encore être exécuté dans votre projet Supabase. Tant que ce n'est pas fait, le statut cloud indiquera une erreur et les données resteront enregistrées localement. Avant la première connexion, un export JSON reste recommandé ; l'application conserve aussi une copie locale de sécurité.


## Intégration MCP

Le serveur MCP personnel et les instructions de déploiement sont décrits dans [docs/mcp-transactions.md](./docs/mcp-transactions.md). Il permet d'ajouter une dépense en langage naturel via un client MCP après configuration et déploiement de la fonction Supabase.
