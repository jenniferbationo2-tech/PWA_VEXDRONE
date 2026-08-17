import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        // Statuts de flux/mission
        success: "bg-status-success/10 text-status-success",
        pending: "bg-status-pending/15 text-[#8A5A00]",
        active: "bg-brand-blue/10 text-brand-blue",
        neutral: "bg-brand-gray/10 text-brand-gray",
        // Sévérité — l'orange signale toujours une donnée/alerte, jamais un fond plein (règle charte)
        high: "bg-brand-orange/10 text-brand-orange",
        medium: "bg-brand-orange/10 text-[#A65A17]",
        low: "bg-brand-gray/10 text-brand-gray",
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
