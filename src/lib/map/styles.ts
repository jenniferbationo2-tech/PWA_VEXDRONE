import type { StyleSpecification } from "maplibre-gl";

export type BaseMap = "plan" | "satellite";

// Fonds vectoriels CARTO (sans clé d'API) — leurs style.json portent déjà
// l'attribution © OpenStreetMap / © CARTO. Domaines à garder en phase avec
// connect-src dans netlify.toml (basemaps.cartocdn.com + *.basemaps.cartocdn.com).
const PLAN_LIGHT = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const PLAN_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

// Imagerie Esri + surcouche des noms de lieux/frontières (vue "hybride") —
// identique en thème clair et sombre, une photo satellite n'a pas de variante.
const SATELLITE: StyleSpecification = {
  version: 8,
  sources: {
    imagery: {
      type: "raster",
      tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagerie © Esri, Maxar, Earthstar Geographics",
    },
    labels: {
      type: "raster",
      tiles: [`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: "imagery", type: "raster", source: "imagery" },
    { id: "labels", type: "raster", source: "labels" },
  ],
};

export function mapStyleFor(baseMap: BaseMap, dark: boolean): string | StyleSpecification {
  if (baseMap === "satellite") return SATELLITE;
  return dark ? PLAN_DARK : PLAN_LIGHT;
}
