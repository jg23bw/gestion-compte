# Instructions pour les agents IA

## Avant de commencer
- Lire `README.md`, `docs/PROJECT_CONTEXT.md`, `docs/SUPABASE.md` et, si la tâche touche MCP, `docs/mcp-transactions.md`.
- Inspecter les fichiers actuels et l’historique Git pertinent. Les résumés de conversation peuvent être incomplets.
- Déterminer si la tâche est seulement documentaire, front-end, base SQL ou Edge Function avant de modifier quoi que ce soit.

## Contraintes techniques
- Le front-end est une application statique : HTML/CSS/JavaScript natifs, pas de build ou gestionnaire de paquets identifié. Ne pas introduire de framework/build sans demande claire et justification.
- Les points d’entrée sont `index.html`, `styles.css`, `app.js` et `supabase-config.js`.
- Garder l’interface et les messages en français.
- Garder les IDs DOM et les listeners cohérents. Après changement de markup, vérifier tous les appels `$('id')` dans `app.js`.
- Après changement de JavaScript, exécuter `node --check app.js` si Node est disponible. Un contrôle syntaxique ne prouve pas que l’interface fonctionne.
- Vérifier le cache-busting CSS/JS dans `index.html` après un changement front-end.
- Ne jamais dire que le navigateur, la synchronisation cloud ou un déploiement ont été testés sans les avoir réellement testés.

## Données et sécurité
- Ne pas coder en dur des données financières personnelles, soldes réels, opérations ou modèles de récurrence personnalisés.
- Ne jamais écrire dans le dépôt, les logs ou la documentation des mots de passe, JWT, jetons MCP, clé `service_role` ou secrets serveur.
- `supabase-config.js` contient une configuration publique côté navigateur. Une clé publishable ne remplace pas les règles Auth/RLS.
- Ne jamais placer `SUPABASE_SERVICE_ROLE_KEY` côté client.
- Préserver les politiques RLS. Toute nouvelle table contenant des données privées doit avoir une stratégie RLS explicitement conçue et vérifiée.
- Ne pas importer/écraser des données locales ou distantes sans comprendre le flux de migration et l’effet pour les données existantes.

## Base Supabase
- Lire `docs/SUPABASE.md` avant toute modification SQL.
- Ne pas confondre un fichier de migration commité avec une migration appliquée sur le projet distant.
- Pour un schéma existant, préférer une migration incrémentale, idempotente et non destructive. Documenter l’ordre d’application et les vérifications post-migration.
- Ne jamais supprimer des colonnes/tables ni modifier des clés sans examiner le code client, les Edge Functions, les contraintes, index, triggers et données déjà présentes.
- Les noms de colonnes cloud sont mappés dans `app.js` via les fonctions `toCloud*` et `fromCloud*`. Maintenir ces correspondances.

## Modèle métier à préserver
- Montant positif = entrée ; montant négatif = sortie.
- Les dates d’opération sont des dates calendaires `YYYY-MM-DD`.
- `isPaid` / `is_paid` représente le pointage.
- `sortOrder` / `sort_order` sert à préserver l’ordre manuel ; un tri d’affichage ne doit pas écraser cet ordre.
- Les récurrences doivent être idempotentes : pas de doublons en relançant la génération. Un montant inconnu ne doit pas être inventé.
- L’annulation doit restaurer l’état local et les informations nécessaires à la synchronisation cloud.
- Ne pas fusionner automatiquement les données locales et cloud quand le compte cloud a déjà des données.

## Procédure recommandée
1. Résumer le comportement actuel et les fichiers concernés avant une modification risquée.
2. Effectuer la plus petite modification cohérente.
3. Vérifier syntaxe, IDs DOM, références de migration et diffs.
4. Tester le parcours utilisateur concerné dans un navigateur si disponible.
5. Documenter les tests réellement exécutés, les résultats, et ce qui reste non vérifié.
6. Mettre à jour `docs/PROJECT_CONTEXT.md` et les autres documents concernés.

## Ne pas faire
- Ne pas modifier le comportement applicatif pendant une tâche de documentation pure.
- Ne pas exposer des secrets ni demander à l’utilisateur de les coller dans la conversation.
- Ne pas prétendre qu’un déploiement GitHub Pages est immédiat après un commit.
- Ne pas remplacer une fonction qui échoue par un faux succès ou masquer les erreurs Supabase.
- Ne pas ajouter de données métier privées au README, aux tests versionnés ou aux exemples qui seront exécutés contre la vraie base.
