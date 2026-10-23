# Gestion de comptes

Application web personnelle en français pour suivre des comptes, opérations et récurrences. Application statique : HTML, CSS et JavaScript sans étape de compilation, avec synchronisation Supabase optionnelle/attendue pour les données personnelles.

> **Pour un agent IA qui reprend le projet : commencez par [AGENTS.md](./AGENTS.md), puis lisez [docs/PROJECT_CONTEXT.md](./docs/PROJECT_CONTEXT.md) et [docs/SUPABASE.md](./docs/SUPABASE.md).** Ces fichiers décrivent l’architecture, les contraintes, les migrations et les vérifications encore nécessaires.

## Liens utiles

- [Instructions pour les agents IA](./AGENTS.md)
- [Contexte détaillé et état du projet](./docs/PROJECT_CONTEXT.md)
- [Configuration, schéma et migrations Supabase](./docs/SUPABASE.md)
- [Intégration MCP](./docs/mcp-transactions.md)
- [Schéma SQL initial](./supabase/schema.sql)
- [Migration MCP multi-utilisateur](./supabase/migrations/202610180001_mcp_tokens.sql)
- [Migration pointage et ordre manuel](./supabase/migrations/202610180002_transaction_pointage_order.sql)
- [Migration positions crypto](./supabase/migrations/202610220001_crypto_holdings.sql)
- [Application hébergée sur GitHub Pages](https://jg23bw.github.io/gestion-compte/)

## Comptes préconfigurés

- La Banque Postale
- Fortuneo
- Fortuneo livret Plus
- CIC Montpont-Ménestrol
- CIC Montévrain
- BoursoBank
- Livret BoursoBank Boursoplus
- Livret BoursoBank BoursoFirst
- Compte professionnel Tiime

Les noms sont des valeurs initiales du code ; les données personnelles des utilisateurs ne doivent pas être ajoutées au dépôt. Chaque utilisateur peut ensuite ajouter ses propres comptes depuis le bouton « Ajouter » du tableau de bord ou depuis « Mes comptes », puis modifier leur nom, leur type, leur banque et leur solde de départ. Le logo est choisi automatiquement à partir de la banque sélectionnée. Un compte peut aussi être supprimé après confirmation ; le dernier compte ne peut pas être supprimé afin d’éviter le réensemencement des comptes par défaut.

## Fonctionnalités

- Tableau de bord avec soldes cumulés, patrimoine net et dernières opérations.
- Création de comptes financiers personnalisés (courant, épargne, PEA, assurance vie, CTO ou professionnel), avec sélection de la banque et logo automatique.
- Modification et suppression d’un compte, avec confirmation et avertissement sur les opérations/récurrences liées.
- Gestion d’un crédit lombard déduit des avoirs bruts pour calculer le patrimoine net.
- Ajout, modification, suppression et annulation de certaines opérations.
- Calcul des soldes à partir d’un solde initial et des opérations datées.
- Recherche, filtres et tris dans les écrans concernés.
- Historique mensuel : choix du mois, recherche, filtre par compte/type, tri, total des entrées, sorties et net.
- Pointage des opérations et ordre manuel.
- Page crypto avec positions (investi, quantité), logos CoinGecko automatiques, recherche, filtre gain/perte, tris, prix réels en euros via CoinGecko, valeur actuelle, gain/perte et performance.
- Page actions et ETF avec positions par compte (IBKR, PEA, CTO…), recherche StockAnalysis, cours convertis en euros, valeur actuelle, gain/perte et performance.
- Nantissement d’un compte avec note facultative, badge visible sur les cartes, la vue d’ensemble et les positions actions.
- Export JSON et export CSV des opérations.
- Paramètres de compte et estimation indicative de trésorerie du compte professionnel.
- Modèles de récurrences mensuelles, trimestrielles, annuelles ou ponctuelles.
- Génération des opérations pour un mois, détection des doublons et exclusion des montants non renseignés.
- Synchronisation avec Supabase, connexion utilisateur, création de compte utilisateur et interface de gestion de jetons MCP.

## Démarrer et modifier

Aucune installation ni compilation n’est nécessaire pour l’application front-end. Ouvrir `index.html` directement est utile pour l’inspection statique, mais les fonctionnalités d’authentification et de données cloud nécessitent la configuration Supabase, le réseau et une session valide.

Fichiers principaux :
- `index.html` : structure des écrans, navigation et contrôles.
- `styles.css` : styles et responsive.
- `app.js` : logique métier, état, rendu, stockage local, synchronisation Supabase, récurrences et exports.
- `supabase-config.js` : URL Supabase et clé publique publishable pour le navigateur.
- `supabase/schema.sql` : schéma SQL idempotent de référence, politiques RLS et journalisation.
- `supabase/migrations/` : migrations à appliquer sur une base existante.
- `supabase/functions/` : Edge Functions liées à MCP et à l’ajout rapide.
- `docs/` : documentation fonctionnelle et technique.

Il n’y a pas de `package.json` ni de pipeline de build front-end au moment de la rédaction. Ne prétendez pas avoir exécuté des tests navigateur si aucun navigateur n’a été utilisé.

## Stockage et confidentialité

L’application peut synchroniser comptes, paramètres, opérations, modèles de récurrence, positions crypto, positions actions, nantissements et crédit lombard avec Supabase après connexion. Les tables métier utilisent RLS et chaque ligne appartient à un utilisateur. Les positions actions et les nantissements sont conservés dans les métadonnées privées du compte Auth, sans table dédiée. Le navigateur conserve également des marqueurs locaux (notamment l’état de génération des mois) et une copie de sécurité peut être créée pendant la migration des données locales.

Ne placez pas de données financières réelles, de jetons MCP, de JWT, de clé `service_role`, de mot de passe ou d’autres secrets dans le dépôt. La clé publishable de Supabase destinée au navigateur n’est pas une clé privilégiée ; les permissions doivent être protégées par Auth et RLS. Voir [docs/SUPABASE.md](./docs/SUPABASE.md).

## Calcul du compte professionnel : hypothèses

Pour une entrée supposée TTC, l’application estime le HT en divisant par `1 + taux de TVA`, isole la TVA et estime les cotisations à partir du HT. Les sorties sont déduites de l’estimation nette. Les taux et le solde net initial sont configurables.

Ces hypothèses sont indicatives et ne remplacent pas un calcul comptable ou fiscal. Les taux initiaux sont des valeurs d’exemple, pas des conseils fiscaux.

## Récurrences

Les modèles personnalisés sont des données utilisateur. Ils doivent rester dans Supabase ou le stockage de l’utilisateur et ne doivent pas être codés en dur dans `app.js`. Les montants inconnus doivent rester vides et être renseignés avant génération. Les dates de récurrences doivent être vérifiées par l’utilisateur.

## Base de données Supabase : action à vérifier

Le code utilise les colonnes `transactions.is_paid`, `transactions.sort_order` et `transactions.recurring_key`. Le schéma de référence les crée déjà, mais une base déjà créée auparavant peut ne pas les avoir. Si l’application affiche un avertissement sur le pointage ou l’ordre manuel, ouvrez le SQL Editor du **bon projet Supabase** et exécutez [`202610180002_transaction_pointage_order.sql`](./supabase/migrations/202610180002_transaction_pointage_order.sql). Cette migration utilise `ADD COLUMN IF NOT EXISTS` et peut être rejouée.

Avant de modifier une base réelle, lisez [docs/SUPABASE.md](./docs/SUPABASE.md), exportez les données et vérifiez les résultats. Ne prétendez pas que la migration distante a été exécutée : un commit GitHub ne l’applique pas à Supabase.

## Crypto : données et prix en direct

La page « Crypto » affiche les positions de l’utilisateur connecté et calcule leur valeur avec les prix du marché en euros fournis par l’API publique CoinGecko. Les prix et les logos sont actualisés au chargement, toutes les 60 secondes lorsque l’onglet est visible, et via le bouton « Actualiser les prix ». Le dernier prix et les derniers logos reçus sont conservés dans le navigateur pour éviter un écran vide en cas de coupure réseau ; une position sans prix n’est pas inventée et reste exclue des totaux. La liste peut être filtrée par recherche et par situation (en gain ou en perte), et triée par ordre manuel, nom, investi, quantité, valeur actuelle, gain/perte ou performance. Les totaux affichés correspondent aux positions filtrées.

Les positions sont des données personnelles : elles ne sont pas codées en dur dans le dépôt. Chaque utilisateur connecté ajoute ses positions depuis la page Crypto : il recherche la crypto par son nom ou son symbole (l’identifiant CoinGecko et le nom sont remplis automatiquement), puis saisit le montant investi et la quantité détenue. Le logo est récupéré automatiquement avec les données CoinGecko ; aucun fichier image n’est demandé. Les lignes sont stockées dans la table `public.crypto_holdings` (RLS par utilisateur) et synchronisées automatiquement. Sur une base existante, exécutez [`202610220001_crypto_holdings.sql`](./supabase/migrations/202610220001_crypto_holdings.sql) dans le SQL Editor. Un commit ne crée pas la table et n’applique pas la migration : vérifiez toujours le projet Supabase ciblé.

La colonne texte historique `crypto_holdings.status` n’est plus utilisée pour un logo. Le client y écrit `Détenu` pour respecter la contrainte existante ; les éventuelles anciennes data URLs sont ignorées puis remplacées à la prochaine synchronisation de la position.

## Actions, ETF et nantissement

La page « Actions » suit les actions et ETF détenus sur les comptes de l’utilisateur, notamment Interactive Brokers, un PEA ou un CTO. Chaque position associe un compte, un titre, un montant investi et une quantité. Les colonnes affichent le prix actuel en euros, la valeur actuelle, le gain/perte et la performance. La recherche, le filtre par compte, le filtre gain/perte et les tris fonctionnent comme sur la page Crypto ; les totaux correspondent aux positions affichées.

Le titre est recherché via l’API publique StockAnalysis. Plusieurs places de cotation peuvent proposer le même nom : l’interface affiche la place, la devise et le type, et demande un choix explicite lorsque plusieurs places sont proposées. Les cours proviennent de StockAnalysis (graphique 1 jour, puis 1 an en secours) et sont convertis en euros avec les taux de référence d’ExchangeRate-API. Les cours du London Stock Exchange sont reçus en pence (`GBX`) et convertis via GBP/100. Les prix sont actualisés au chargement, toutes les cinq minutes lorsque l’onglet est visible et via le bouton « Actualiser les cours » ; les dernières valeurs sont mises en cache dans le navigateur. Une position sans cours n’est pas inventée et reste exclue des totaux. Les cours peuvent être différés et ne constituent pas un conseil financier.

Les positions sont stockées dans les métadonnées privées du compte Supabase Auth (`user_metadata.stockHoldings`), sous forme de tableau d’objets `{ id, accountId, priceId, symbol, name, market, currency, invested, quantity, sortOrder }`. Le nantissement est stocké dans `user_metadata.accountPledges`, sous la forme `{ "identifiant-du-compte": { "note": "..." } }`. Aucune migration SQL n’est nécessaire. Le champ « Nanti » et sa note se gèrent depuis la fenêtre de configuration du compte ; le badge apparaît sur les cartes, la vue d’ensemble et les positions actions. Supprimer un compte supprime aussi ses positions actions et son nantissement. Les métadonnées Auth sont privées, mais elles ne remplacent pas les politiques RLS des tables métier.

## Crédit lombard et patrimoine net

La vue d’ensemble affiche le patrimoine net calculé comme la somme des avoirs de tous les comptes, moins la dette du crédit lombard. Le crédit se gère depuis la carte « Crédit lombard » : libellé, dette actuelle, taux annuel facultatif et notes. Une seule valeur est conservée par utilisateur.

Le crédit est enregistré dans les métadonnées privées du compte Supabase Auth (`user_metadata.lombardCredit`) via `auth.updateUser`. Il est ainsi disponible sur les appareils où l’utilisateur se connecte, sans créer de table et **sans exécuter de migration SQL**. Aucun autre utilisateur ne peut lire ces métadonnées depuis l’application.

Un utilisateur peut créer son espace depuis « Créer un compte » sur l’écran de connexion. Selon les paramètres Auth du projet Supabase, un e-mail de confirmation peut être nécessaire avant la première connexion.

## Types de comptes, logos et suppression

Les types proposés sont : compte courant, livret/épargne, PEA, assurance vie, CTO et compte professionnel. Les comptes PEA, assurance vie et CTO sont traités comme des comptes d’épargne/investissement personnels dans les totaux.

La table `accounts` conserve ses valeurs de `kind` `bank`, `savings` et `pro`. Les sous-types PEA, assurance vie et CTO sont enregistrés dans les métadonnées privées du compte Auth (`user_metadata.accountTypes`, sous la forme `{ "identifiant-du-compte": "pea" | "av" | "cto" }`) via `auth.updateUser`. Cette approche évite une migration SQL et conserve la synchronisation entre appareils. Si l’écriture des métadonnées échoue, l’application le signale et retente lors d’une synchronisation ultérieure ; le type précis peut alors être perdu après rechargement tant que la synchronisation n’a pas abouti.

Le logo n’est plus ajouté manuellement : le formulaire de compte propose une liste de banques et de courtiers (La Banque Postale, BNP Paribas, Crédit Agricole, Société Générale, Crédit Mutuel, CIC, Banque Populaire, Caisse d’Épargne, LCL, BoursoBank, Fortuneo, Hello bank!, Monabanq, BforBank, Revolut, N26, Wise, Trade Republic, Bourse Direct, Tiime, Interactive Brokers, Swissquote, DEGIRO, Saxo Banque, eToro, XTB, etc.). Le logo correspondant s’affiche automatiquement dans l’aperçu et dans l’application ; les établissements sans logo local utilisent un monogramme coloré.

La banque choisie est enregistrée dans la colonne texte existante `accounts.short` sous la forme `bank:<identifiant>` (par exemple `bank:bnp`). Le client reconstruit la banque et les initiales à la lecture. Les anciennes valeurs de `short` contenant des initiales ou une data URL restent lisibles : la banque est déduite de l’identifiant du compte lorsqu’il est connu, sinon le compte utilise le monogramme « Autre / initiales » jusqu’à la prochaine modification. Aucune migration SQL n’est nécessaire. Les logos sont des fichiers locaux dans `assets/banks/`.

La suppression d’un compte demande une confirmation explicite et indique le nombre d’opérations, de récurrences, de positions actions et de nantissements liés. Les opérations et récurrences sont supprimées localement puis le compte est supprimé dans Supabase ; les clés étrangères `on delete cascade` suppriment les lignes liées côté serveur. Les positions actions et le nantissement sont retirés des métadonnées Auth à la synchronisation suivante. Le dernier compte ne peut pas être supprimé. Un jeton MCP qui utiliserait ce compte comme compte par défaut n’est pas modifié automatiquement : vérifiez ou recréez ce jeton si nécessaire.

Le serveur MCP personnel et l’ajout rapide sont décrits dans [docs/mcp-transactions.md](./docs/mcp-transactions.md). Le système utilise des jetons Bearer personnels révocables ; il ne s’agit pas encore d’une implémentation OAuth 2.1 universelle. Les secrets privilégiés restent côté serveur.
