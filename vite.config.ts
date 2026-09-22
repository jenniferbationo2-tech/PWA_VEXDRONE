import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    // Genere dist/stats.html (treemap de la taille des chunks) uniquement si
    // ANALYZE=true — n'affecte jamais un build normal (Netlify, dev, CI).
    process.env.ANALYZE === "true" &&
      visualizer({ filename: "dist/stats.html", gzipSize: true, brotliSize: true, template: "treemap" }),
    VitePWA({
      // registerType: "autoUpdate" — une nouvelle version deployee (Netlify)
      // remplace le service worker en cache au prochain chargement, plutot
      // que de laisser un technicien coince sur une UI perimee sans le savoir.
      registerType: "autoUpdate",
      // Desactive en dev : evite toute interference du service worker avec
      // le hot-reload du serveur Vite local (voir aussi le proxy /api).
      devOptions: { enabled: false },
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "VEXDRONE",
        short_name: "VEXDRONE",
        description: "Inspection d'infrastructures par drone et camera embarquee",
        lang: "fr",
        start_url: "/",
        display: "standalone",
        theme_color: "#1B365D",
        background_color: "#1B365D",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache uniquement le shell de l'app (JS/CSS/HTML/icones) genere
        // par le build. Aucune regle runtimeCaching n'est ajoutee : les
        // appels vers l'API (cross-origin, VITE_API_BASE_URL) ne sont donc
        // jamais interceptes ni mis en cache par le service worker — les
        // donnees temps reel (missions, telemetrie, flux camera) restent
        // toujours en direct, seul le shell app tolere une connectivite
        // instable sur le terrain.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        navigateFallback: "/index.html",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // HTTPS local est active par le plugin basicSsl() ci-dessus, pas ici :
    // server.https attend un objet de certificats (HttpsServerOptions), pas
    // un booleen - `https: true` etait une erreur de type, en plus d'etre
    // redondant avec ce que le plugin fait deja.
    port: 5173,
    strictPort: true,
    // Necessaire pour tester la camera distante (PhoneSender) : par defaut
    // Vite ne bind que sur localhost, donc un telephone sur le meme Wi-Fi ne
    // peut pas du tout atteindre le serveur de dev sans ca.
    host: true,
    proxy: {
      "/api": {
        target: "https://vexdrone-osc.onrender.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});