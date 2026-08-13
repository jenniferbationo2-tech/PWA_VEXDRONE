
## Brancher l'API réelle

Dès que le contrat avec le backend est aligné :

1. Crée un fichier `.env` avec `VITE_API_BASE_URL=http://localhost:8000`
2. Dans `src/lib/api/client.ts`, remplace le corps de chaque fonction par un vrai
   appel `apiFetch(...)` (le helper existe déjà, voir `getDashboardSummary` en
   commentaire pour le patron)
3. Aligne `src/lib/api/types.ts` sur le schéma OpenAPI réel du backend

Aucune page ni composant n'a besoin de changer — tout consomme `api.xxx()`, jamais `fetch()`
directement.

## Construire un nouvel écran (ex: Missions)

1. Ajoute le type dans `types.ts` si besoin (déjà fait pour `Mission`)
2. Ajoute la fonction dans `client.ts` (déjà fait : `api.getMissions()`)
3. Crée `src/pages/Missions.tsx` en suivant le patron de `Dashboard.tsx`
   (useQuery + états loading/error/empty + composants dans `components/missions/`)
4. Remplace le `<ComingSoon />` correspondant dans `App.tsx`

## Prochaines briques (ordre suggéré)

1. Missions — table filtrable, proche de RecentAlertsTable en structure
2. IA & Anomalies — table + panneau de détail (layout 2 colonnes comme la maquette)
3. Carte — react-leaflet, calque markers depuis `Anomaly.gps`
4. Vol en cours — polling ou WebSocket pour la télémétrie live
5. Rapports — table + lien téléchargement PDF

## Design tokens

Tous dans `tailwind.config.ts`, sourcés directement de `VEXDRON_Charte_Graphique v1.0` :
couleurs (`brand-blue #1B365D`, `brand-orange #E37222`...), typographie
(Montserrat/Open Sans), rayons (8-16px), ombres de carte. Ne pas coder de couleur en dur
dans un composant — toujours passer par ces tokens.
