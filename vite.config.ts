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
    // par le backend (VITE_API_BASE_URL). Un port different casse le login.
    port: 5173,
    strictPort: true,
  },
});
