import type { Config } from "tailwindcss";


export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1B365D", // Bleu profond — institutionnel, fiabilité
          "blue-light": "#274A7A",
          "blue-dark": "#12253F",
          orange: "#E37222", // Alerte / détection / action — jamais en fond
          "orange-light": "#F2955A",
          gray: "#8A8D8F", // Textes secondaires, structures
          "off-white": "#F4F7F9", // Fonds, tableaux de bord
        },
        severity: {
          high: "#E37222",
          medium: "#F2A93B",
          low: "#8A8D8F",
        },
        status: {
          success: "#3E8F5C",
          pending: "#F2A93B",
          neutral: "#8A8D8F",
        },
      },
      fontFamily: {
        display: ["Montserrat", "sans-serif"], // Titres H1-H3
        body: ["Open Sans", "sans-serif"], // Corps de texte, rapports
      },
      fontSize: {
        h1: ["44px", { lineHeight: "1.2", fontWeight: "700" }],
        h2: ["30px", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["22px", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["17px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
      },
      spacing: {
        // Base 8px — tous les espacements sont des multiples de 8 (règle charte)
        18: "72px",
      },
      borderRadius: {
        sm: "8px", // boutons / champs
        md: "14px",
        lg: "16px", // cartes / modales
      },
      boxShadow: {
        card: "0 1px 2px rgba(27, 54, 93, 0.06), 0 1px 3px rgba(27, 54, 93, 0.08)",
        "card-hover": "0 4px 12px rgba(27, 54, 93, 0.10)",
      },
      maxWidth: {
        page: "1440px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
