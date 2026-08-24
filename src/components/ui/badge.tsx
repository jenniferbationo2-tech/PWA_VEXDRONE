import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        // Statuts de flux/mission
        success: "bg-status-success/10 text-status-success dark:bg-status-success/20",
        pending: "bg-status-pending/15 text-[#8A5A00] dark:bg-status-pending/20 dark:text-status-pending",
        active: "bg-brand-blue/10 text-brand-blue dark:bg-white/10 dark:text-white",
        neutral: "bg-brand-gray/10 text-brand-gray dark:bg-white/10 dark:text-white/70",
        // Sévérité — l'orange signale toujours une donnée/alerte, jamais un fond plein (règle charte)
        high: "bg-brand-orange/10 text-brand-orange",
        medium: "bg-brand-orange/10 text-[#A65A17] dark:text-brand-orange-light",
        low: "bg-brand-gray/10 text-brand-gray dark:bg-white/10 dark:text-white/70",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
