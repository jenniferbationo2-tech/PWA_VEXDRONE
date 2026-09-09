import type { Transition, Variants } from "framer-motion";

// Recette commune d'entrée/sortie pour toutes les pop-up (voile + carte) —
// une seule source pour garder les transitions cohérentes dans toute l'app.
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const overlayTransition: Transition = { duration: 0.15 };

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

export const modalTransition: Transition = { duration: 0.18, ease: [0.16, 1, 0.3, 1] };
