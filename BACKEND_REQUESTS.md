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

**✅ Livré le 2026-09-11** — doc d'intégration backend reçu et vérifié conforme au schéma live (`TypeMissionCreate`/`TypeMissionRead`, `type_mission_uuid` sur `MissionCreate`/`MissionRead`/`MissionUpdate`). Le frontend n'était câblé que contre la proposition ci-dessous ; voir `src/lib/api/backendTypes.ts` pour les types à jour.

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

## 6. WebSocket `/api/v1/vols/{id}/live-analyse` bloquée en 403 au niveau infra (pas l'app)

**✅ Résolu le 2026-09-15 — par contournement, pas par un correctif infra.** L'équipe backend a remplacé l'endpoint par du polling HTTP classique (`POST /api/v1/vols/{vol_uuid}/live-analyse`, un appel indépendant par frame, ~400ms) plutôt que de dépendre d'un déblocage Cloudflare/Render pour la WS — voir leur doc d'intégration §3. Frontend migré en conséquence (`PhoneCaptureContext.tsx` : `startLiveAnalyse`/`sendLiveFrame` n'ouvrent plus de WebSocket, ils postent chaque frame via `api.analyzeLiveFrame` et retentent simplement à la frame suivante en cas d'échec ponctuel — plus de logique de reconnexion). Le proxy dev (`vite.config.ts`, `server.proxy["/api"].ws`) n'est plus nécessaire, retiré. Le point ci-dessous reste comme trace du diagnostic qui a mené à ce choix.

**🟡 Signal encourageant le 2026-09-15** — retesté via `curl` avec les mêmes en-têtes d'upgrade WebSocket que le test initial : la requête renvoie maintenant `404` avec les en-têtes de la vraie app (`x-render-origin-server: uvicorn`, `cf-ray`, corps `{"detail":"Not Found"}`), là où elle renvoyait un `403` vide sans en-tête d'app. La requête atteint donc bien uvicorn maintenant — le blocage à la périphérie Cloudflare semble levé. Pas encore confirmé en conditions réelles dans le navigateur (poignée de main WebSocket complète, pas juste les en-têtes HTTP) : à retester pendant un vrai vol streaming avant de clore ce point.

**Endpoints concernés** : `wss://vexdrone-osc.onrender.com/api/v1/vols/{flightId}/live-analyse` (analyse IA en direct pendant une mission téléphone en streaming).
**Constaté (2026-09-13)** : testé en conditions réelles (mission téléphone, mode "Capture et analyse en continu") — le navigateur échoue systématiquement le handshake WebSocket avec `403` ("Unexpected response code: 403"), aussi bien en visant directement `vexdrone-osc.onrender.com` qu'en repassant par le proxy de dev (donc pas un problème de cookie/origine côté frontend, déjà vérifié et corrigé séparément). Isolé via `curl` en dehors du navigateur :
- Un `GET` normal (sans en-têtes d'upgrade) sur une route de vol existante renvoie `404` avec les en-têtes de la vraie app (`x-render-origin-server: uvicorn`, corps JSON `{"detail":"Not Found"}`) — l'app FastAPI répond normalement.
- La même requête mais avec les en-têtes d'upgrade WebSocket (`Connection: Upgrade`, `Upgrade: websocket`, ...) renvoie `403` avec un corps **vide** et **aucun** en-tête d'app (pas de `x-render-origin-server`, pas de `rndr-id`...) — y compris sur une route totalement bidon qui n'existe pas.
- Une route inexistante ne peut renvoyer 403 que si la requête n'atteint jamais l'app (sinon ce serait un 404, comme le premier test) : la requête est donc rejetée à la périphérie (Cloudflare devant Render), avant même d'arriver à uvicorn/FastAPI — uniquement à cause des en-têtes d'upgrade WebSocket, indépendamment du chemin ou de l'authentification.
**Impact frontend** : la fonctionnalité de superposition des boîtes de détection en direct sur la vue caméra (`Vols.tsx`, overlay canvas) ne peut jamais fonctionner tant que ce blocage est en place — la capture/upload photo classique (`captureOnce`, toutes les 3s) n'est pas affectée, seul l'aperçu temps réel l'est.
**Proposition** : vérifier côté infra Render/Cloudflare pourquoi les upgrades WebSocket sont rejetés en 403 à la périphérie pour ce service (règle WAF, "Bot Fight Mode", ou support WebSocket non activé pour ce plan/domaine) — ce n'est pas un correctif de code applicatif FastAPI, la route elle-même n'est jamais atteinte.

---

## 7. Caméra distante (WebRTC) — endpoints livrés, un écart de schéma géré côté frontend

**✅ Livré le 2026-09-15** — vérifié sur le schéma live : `POST /vols/{vol_uuid}/camera-distante/token` (`HTTPBearer` requis, réponse `TokenCameraDistanteRead` = `{ token, expires_at }`), et `/webrtc/{token}/offer` + `/webrtc/{token}/answer` (POST+GET), tous les deux bien **sans authentification** (même traitement que `/auth/login` sur le schéma — confirmé volontaire, cohérent avec le fait que le téléphone qui scanne le QR n'a jamais de session).

**Écart constaté, géré côté frontend, aucune action backend nécessaire** : `SdpPayload`/`SdpRead` ne portent qu'un champ `sdp` (pas de `type` "offer"/"answer"). Le frontend envoyait initialement l'objet `RTCSessionDescriptionInit` complet (`{ type, sdp }`) et attendait la même forme en retour — `setRemoteDescription()` a besoin de `type` pour fonctionner. Corrigé côté client (`client.ts`) : on n'envoie que `sdp`, et on reconstruit `type` à la lecture (`"offer"` ou `"answer"` selon l'endpoint appelé, cette info est déjà portée par le chemin). Aucun changement de schéma demandé au backend pour ça.

---

## 8. Pas d'identifiant de structure/pylône sur une mission ou une image

**Endpoints concernés** : `MissionCreate`/`MissionRead`/`MissionUpdate`, `ImageRead` (potentiellement — voir "Impact frontend").
**Constaté (2026-09-16)** : le rapport de mission imprimable (nouveau, voir `src/pages/reports/MissionReportPrint.tsx`) reprend la charte graphique VEXDRONE et affiche, pour chaque anomalie, la structure/le pylône inspecté(e) (ex. "P-114 / Tronçon B") — un champ demandé explicitement pour ce gabarit. Aucun champ de ce type n'existe côté `Mission` ni côté `Image`/`Anomaly` dans le schéma live.
**Impact frontend** : en attendant, ce champ est saisi manuellement par le technicien sur la page de garde du rapport et conservé en `localStorage` (`src/lib/missionStructure.ts`), un seul identifiant appliqué à toutes les pages/anomalies du rapport — même limite que les réglages d'entreprise (§2) : propre à cet appareil, non partagé entre technicien et admin, perdu si le technicien change de navigateur/téléphone.
**Proposition** : à trancher avec l'équipe produit/backend selon le grain réel souhaité —
- Option simple (mission-level) : un champ `structure` ou `troncon` (string, optionnel) sur `MissionCreate`/`MissionRead`/`MissionUpdate`, une valeur pour toute la mission. Suffisant si une mission couvre en pratique une seule structure.
- Option fine (par photo) : un champ équivalent sur `ImageRead`/à la capture, si une mission peut couvrir plusieurs pylônes le long d'une ligne (cas réaliste pour une inspection de type "Ligne 225 kV" sur tout un tronçon) — implique aussi une UI de saisie par photo côté frontend, pas encore prévue.
- Dans les deux cas, un champ texte libre suffit pour cette itération (pas besoin d'un référentiel de structures dédié).

*(entrées suivantes ajoutées au fil de la construction des écrans Techniciens / Missions entreprise)*
