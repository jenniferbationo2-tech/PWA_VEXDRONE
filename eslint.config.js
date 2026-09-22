import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Seulement les 2 regles historiques (rules-of-hooks + exhaustive-deps) :
      // le preset "recommended" de eslint-plugin-react-hooks v7 embarque les
      // regles d'analyse statique orientees React Compiler (set-state-in-effect,
      // refs, purity...), bien plus strictes et pensees pour un code
      // "compiler-ready" — hors perimetre d'un simple passage lint avant
      // deploiement, et en conflit avec des patterns volontaires existants
      // (ex. src/pages/user/Vols.tsx, hasLoadedOnce.current).
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
);
