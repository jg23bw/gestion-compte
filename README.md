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
Les comptes et transactions sont enregistrés dans le `localStorage` du navigateur utilisé. Il n'y a actuellement ni serveur ni synchronisation entre appareils. Les données ne sont pas automatiquement partagées entre navigateurs ; exportez régulièrement un fichier JSON de sauvegarde.

## Calcul Tiime : hypothèses à vérifier
Le compte professionnel affiche le solde bancaire réel et une estimation après provisions. Pour une entrée positive supposée TTC, l'application calcule le HT en divisant par `1 + taux de TVA`, isole la TVA et estime les cotisations sur le HT. Les sorties sont déduites intégralement de l'estimation nette. Le solde net de départ est configurable séparément.

Ces hypothèses sont volontairement simples et **ne remplacent pas un calcul comptable ou fiscal**. Ajustez les taux à votre situation et à votre régime (notamment les règles de TVA et d'assiette des cotisations). Les taux initiaux sont des exemples configurables, pas des conseils fiscaux.

## Limites de cette première version
- Les montants inconnus sont laissés vides et doivent être renseignés dans « Récurrences » avant de pouvoir générer ces opérations.
- Les mois des intérêts Lombard sont préconfigurés en janvier/avril/juillet/octobre et restent à confirmer.
- Pas de connexion automatique aux banques.
- Pas d'authentification, de base de données distante ni de synchronisation multi-appareils.
- Les données locales peuvent être perdues si le stockage du navigateur est effacé ; utilisez l'export JSON.
- L'application ne préremplit aucun solde bancaire : renseignez les soldes de départ dans « Mes comptes ».
