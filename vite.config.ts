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
    proxy: {
      "/api": {
        target: "https://vexdrone-osc.onrender.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});