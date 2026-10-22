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
- Boursobank
- Livret Boursobank Boursoplus
- Livret Boursobank BoursoFirst
- Compte professionnel Tiime

Les noms sont des valeurs initiales du code ; les données personnelles des utilisateurs ne doivent pas être ajoutées au dépôt.

## Fonctionnalités

- Tableau de bord avec soldes cumulés et dernières opérations.
- Ajout, modification, suppression et annulation de certaines opérations.
- Calcul des soldes à partir d’un solde initial et des opérations datées.
- Recherche, filtres et tris dans les écrans concernés.
- Historique mensuel : choix du mois, recherche, filtre par compte/type, tri, total des entrées, sorties et net.
- Pointage des opérations et ordre manuel.
- Page crypto avec positions (investi, quantité, statut), prix réels en euros via CoinGecko, valeur actuelle, gain/perte et performance.
- Export JSON et export CSV des opérations.
- Paramètres de compte et estimation indicative de trésorerie du compte professionnel.
- Modèles de récurrences mensuelles, trimestrielles, annuelles ou ponctuelles.
- Génération des opérations pour un mois, détection des doublons et exclusion des montants non renseignés.
- Synchronisation avec Supabase, connexion utilisateur et interface de gestion de jetons MCP.

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

L’application peut synchroniser comptes, paramètres, opérations et modèles de récurrence avec Supabase après connexion. Les tables métier utilisent RLS et chaque ligne appartient à un utilisateur. Le navigateur conserve également des marqueurs locaux (notamment l’état de génération des mois) et une copie de sécurité peut être créée pendant la migration des données locales.

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

La page « Crypto » affiche les positions de l’utilisateur connecté et calcule leur valeur avec les prix du marché en euros fournis par l’API publique CoinGecko. Les prix sont actualisés au chargement, toutes les 60 secondes lorsque l’onglet est visible, et via le bouton « Actualiser les prix ». Le dernier prix reçu est conservé dans le navigateur pour éviter un écran vide en cas de coupure réseau ; une position sans prix n’est pas inventée et reste exclue des totaux.

Les positions sont des données personnelles : elles ne sont pas codées en dur dans le dépôt. Chaque utilisateur connecté ajoute ses positions depuis la page Crypto : il recherche la crypto par son nom ou son symbole (l’identifiant CoinGecko et le nom sont remplis automatiquement), puis saisit le montant investi et la quantité détenue. Les lignes sont stockées dans la table `public.crypto_holdings` (RLS par utilisateur) et synchronisées automatiquement. Sur une base existante, exécutez [`202610220001_crypto_holdings.sql`](./supabase/migrations/202610220001_crypto_holdings.sql) dans le SQL Editor. Le fichier local ignoré par Git `supabase/seed-crypto.local.sql` ne sert qu’à une reprise ponctuelle de données existantes, pas au parcours utilisateur normal. Un commit ne crée pas la table et n’applique pas la migration : vérifiez toujours le projet Supabase ciblé.



Le serveur MCP personnel et l’ajout rapide sont décrits dans [docs/mcp-transactions.md](./docs/mcp-transactions.md). Le système utilise des jetons Bearer personnels révocables ; il ne s’agit pas encore d’une implémentation OAuth 2.1 universelle. Les secrets privilégiés restent côté serveur.
