import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Le port doit rester 5173 : c'est la seule origine autorisée en CORS
    // par le backend distant (Render). Un port different casse le login.
    port: 5173,
    strictPort: true,
    // Ecoute sur le reseau local, pas juste 127.0.0.1 : permet a un autre
    // appareil du meme WiFi d'atteindre http://<IP-LAN>:5173.
    host: true,
  },
});
