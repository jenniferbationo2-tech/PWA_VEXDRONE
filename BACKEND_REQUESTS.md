# Besoins backend — remontées frontend

Document de travail, alimenté au fil de la construction du frontend (en commençant par la page Admin). Chaque entrée note un écart entre ce que l'UI a besoin d'exposer et ce que `https://vexdrone-osc.onrender.com/openapi.json` supporte réellement à la date indiquée. Objectif : transmettre une liste consolidée à l'équipe backend une fois la page Admin terminée.

Pour chaque besoin : endpoint(s) concerné(s), ce qui manque, pourquoi le frontend en a besoin, et une proposition de champ/endpoint côté backend.

---

## 1. Flotte de drones non cloisonnée par entreprise

**Endpoints concernés** : `POST/GET/PATCH/DELETE /api/v1/drones/`
**Constaté (2026-08-31)** : `DroneCreate`/`DroneRead` n'ont aucun champ `entreprise_id`. Le `GET` est documenté "accessible to any authenticated user" — c'est un pool unique, partagé par toute la plateforme.
**Impact frontend** : la page Admin propose une gestion de "la flotte" de l'entreprise. En l'état, un Admin d'une entreprise A verrait et pourrait modifier/supprimer les drones enregistrés par une entreprise B.
**Proposition** : ajouter un champ `entreprise_id` sur `Drone` (rempli automatiquement à la création à partir du compte Admin appelant, comme c'est déjà fait pour `POST /users/team`), et filtrer `GET /drones/` par l'entreprise de l'appelant pour un rôle ADMIN (SUPERADMIN garde une vue globale, éventuellement avec un paramètre `entreprise_id` optionnel comme sur `GET /missions/entreprise`).

## 2. Aucune persistance pour les préférences/réglages d'entreprise

**Endpoints concernés** : aucun — reconfirmé le 2026-09-08 sur `EntrepriseCreate`, `EntrepriseUpdate`, `EntrepriseRead`, `UserUpdate` : aucun champ de préférence n'existe nulle part dans le schéma, ni endpoint générique de settings.
**Constaté (2026-08-31, champs étendus le 2026-09-08)** : besoins identifiés côté UI Admin/SuperAdmin — unité de mesure (altitude m/ft, vitesse km/h/kt), fuseau horaire d'affichage, format d'export par défaut des rapports (PDF/CSV/KML), altitude de vol max par défaut, seuil de batterie faible (%).
**Impact frontend** : en l'absence de tout champ backend, ces réglages sont implémentés en local uniquement (`localStorage`, par navigateur/appareil) pour cette itération — non synchronisés entre appareils, non partagés entre les comptes Admin d'une même entreprise. Depuis le 2026-09-08, l'altitude max et le seuil de batterie faible ne sont plus de simples badges d'affichage : ils sont vérifiés en direct contre la télémétrie du vol actif (`Vols.tsx`) et déclenchent une alerte visuelle si dépassés — ce qui rend d'autant plus nécessaire une vraie synchronisation par entreprise (un Admin doit voir/gérer le même seuil que ses techniciens sur le terrain, pas un seuil différent par appareil).
**Proposition** : une ressource `EntrepriseSettings` (ou des champs additionnels sur `Entreprise`) exposant `unite_altitude` (`m`/`ft`), `unite_vitesse` (`kmh`/`kt`), `fuseau_horaire`, `format_export_defaut` (`pdf`/`csv`/`kml`), `altitude_vol_max_defaut`, `seuil_batterie_faible` (`int`, %), avec `GET`/`PATCH` réservés à ADMIN de l'entreprise concernée (lecture seule pour ses techniciens, écriture pour SuperAdmin possible aussi selon le workflow actuel côté UI).

## 3. Pas de géofencing / zones no-fly

**Constaté (2026-08-31)** : aucun schéma ni endpoint pour des zones géographiques (aucune trace de "geofence"/"no-fly" dans `openapi.json`).
**Impact frontend** : fonctionnalité mise de côté pour cette itération (sortie du périmètre de la page Admin V1) — nécessiterait de toute façon un vrai sous-projet (dessin de zones sur carte, format de stockage géospatial, vérification côté vol) plutôt qu'un simple champ de formulaire.
**Proposition** : à chiffrer séparément avec le backend si la fonctionnalité est retenue pour une itération future (probablement PostGIS côté stockage, vu l'architecture déjà mentionnée pour le reste du projet).

## 4. Pas de blocage/déblocage pour un technicien (UTILISATEUR)

**Endpoints concernés** : `/api/v1/users/team/{username}`, `/api/v1/users/{username}`
**Constaté (2026-09-09)** : contrairement aux entreprises (`POST /entreprises/{id}/bloquer` et `/debloquer`), aucun endpoint équivalent n'existe pour un utilisateur individuel. Seule une désactivation (soft-delete via `DELETE`) est disponible — même mécanisme que "retirer/supprimer".
**Impact frontend** : la pop-up de détail d'un technicien (Admin > Techniciens) prévoit une icône Bloquer/Débloquer à côté du badge de statut ; elle est affichée mais désactivée ("Bientôt disponible") tant que ce endpoint n'existe pas, faute de pouvoir la distinguer proprement de l'action Supprimer.
**Proposition** : `POST /users/team/{username}/bloquer` et `/debloquer` (même forme que pour les entreprises), avec un champ de statut sur `PlatformUser`/`UserRead` distinct de la suppression (ex. `is_blocked`), pour permettre une réactivation ultérieure — contrairement au soft-delete qui retire le compte de la liste.

## 5. Aucune notion de "type de mission"

**Endpoints concernés** : aucun — confirmé le 2026-09-11 sur `MissionCreate`, `MissionRead`, `MissionUpdate` (`GET /openapi.json`) : aucun champ de type/catégorie, et aucune ressource de ce nom n'existe dans le schéma.
**Constaté (2026-09-11)** : besoin identifié côté UI — un Admin doit pouvoir définir des types de mission (ex. "Inspection préventive", "Urgence") pour son entreprise, et ses techniciens doivent pouvoir en choisir un (optionnel) à la création d'une mission, en ne voyant que les types de leur propre entreprise.
**Impact frontend** : contrairement aux réglages d'entreprise (§2), une simple persistance locale (`localStorage`) est ici insuffisante : l'Admin et ses techniciens sont deux comptes différents, sur des appareils différents — un stockage côté navigateur de l'un n'est jamais visible par l'autre. Cette fonctionnalité nécessite une vraie ressource persistée côté API pour être utilisable. En attendant, le frontend est câblé contre le contrat proposé ci-dessous (voir `src/lib/api/backendTypes.ts`, `BackendMissionType` et `BackendMission.type_mission_uuid`) — les appels réels échoueront (404) tant que l'endpoint n'existe pas côté serveur ; le mode `VITE_USE_MOCKS=true` simule la fonctionnalité en attendant.
**Proposition** :
- Nouvelle ressource `TypeMission`, volontairement minimale : `uuid`, `nom` (string, requis), `entreprise_id` (déduit du compte Admin appelant à la création, jamais dans le payload — même principe que `POST /users/team`), `created_at`.
- `POST /api/v1/types-mission/` — réservé ADMIN, `entreprise_id` forcé côté serveur. Corps : `{ "nom": string }`.
- `GET /api/v1/types-mission/` — accessible ADMIN et UTILISATEUR (technicien), chacun scoped automatiquement à sa propre entreprise (jamais de paramètre `entreprise_id` côté appelant). Pagination standard (`PaginatedListResponse`), comme les autres listes.
- `DELETE /api/v1/types-mission/{uuid}` — réservé ADMIN (à l'entreprise du type). Suppression logique ou physique au choix du backend ; le frontend ne dépend pas d'une réactivation ultérieure pour ce besoin.
- Sur `Mission` : ajouter `type_mission_uuid` (`uuid | null`, optionnel — une mission peut ne pas avoir de type) à `MissionCreate` et `MissionRead`. Idéalement aussi modifiable via `MissionUpdate` (contrairement à `appareil`, changer le type après création n'a pas d'impact fonctionnel côté vol/capture).
- Pas de `PATCH` de renommage prévu pour cette itération frontend (un type se supprime/recrée) — à ajouter plus tard si besoin.

---

*(entrées suivantes ajoutées au fil de la construction des écrans Techniciens / Missions entreprise)*
