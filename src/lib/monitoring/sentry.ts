import * as Sentry from "@sentry/react";

// Suivi d'erreurs minimal : uniquement en prod (build Netlify), et seulement
// si un DSN est configure — no-op silencieux sinon (dev local, CI, ou avant
// que le compte Sentry soit cree). Pas de tracing de performance ni de
// session replay : juste la capture d'exceptions/rejets non geres, qui est
// tout ce que Sentry.init installe par defaut sans integrations explicites.
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || !import.meta.env.PROD) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Coupe l'envoi de cookies/headers/IP par defaut — l'app est authentifiee
    // par cookie de session, pas de raison de le faire remonter a Sentry.
    sendDefaultPii: false,
  });
}
