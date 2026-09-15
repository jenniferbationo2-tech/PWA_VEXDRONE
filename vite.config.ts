import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import path from "path";

export default defineConfig({
  plugins: [react(), basicSsl()],
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
        // Necessaire pour la WS de live-analyse (voir PhoneCaptureContext.tsx) :
        // sans ca, le proxy ne relaie pas les upgrades WebSocket et le cookie de
        // session (scope a cette origine par le proxy) n'atteint jamais le
        // backend si on le contourne.
        ws: true,
      },
    },
  },
});