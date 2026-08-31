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

**Endpoints concernés** : aucun — vérifié sur `EntrepriseCreate`, `EntrepriseUpdate`, `EntrepriseRead`, `UserUpdate` : aucun champ de préférence n'existe nulle part dans le schéma, ni endpoint générique de settings.
**Constaté (2026-08-31)** : besoins identifiés côté UI Admin — unité de mesure (altitude m/ft, vitesse km/h/kt), fuseau horaire d'affichage, format d'export par défaut des rapports (PDF/CSV/KML), altitude de vol max par défaut.
**Impact frontend** : en l'absence de tout champ backend, ces réglages sont implémentés en local uniquement (`localStorage`, par navigateur/appareil) pour cette itération — non synchronisés entre appareils, non partagés entre les comptes Admin d'une même entreprise.
**Proposition** : une ressource `EntrepriseSettings` (ou des champs additionnels sur `Entreprise`) exposant `unite_altitude` (`m`/`ft`), `unite_vitesse` (`kmh`/`kt`), `fuseau_horaire`, `format_export_defaut` (`pdf`/`csv`/`kml`), `altitude_vol_max_defaut`, avec `GET`/`PATCH` réservés à ADMIN de l'entreprise concernée.

## 3. Pas de géofencing / zones no-fly

**Constaté (2026-08-31)** : aucun schéma ni endpoint pour des zones géographiques (aucune trace de "geofence"/"no-fly" dans `openapi.json`).
**Impact frontend** : fonctionnalité mise de côté pour cette itération (sortie du périmètre de la page Admin V1) — nécessiterait de toute façon un vrai sous-projet (dessin de zones sur carte, format de stockage géospatial, vérification côté vol) plutôt qu'un simple champ de formulaire.
**Proposition** : à chiffrer séparément avec le backend si la fonctionnalité est retenue pour une itération future (probablement PostGIS côté stockage, vu l'architecture déjà mentionnée pour le reste du projet).

---

*(entrées suivantes ajoutées au fil de la construction des écrans Techniciens / Missions entreprise)*
