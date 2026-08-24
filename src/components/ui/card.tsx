import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-brand-blue/[0.06] bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover dark:border-white/10 dark:bg-brand-blue-dark dark:shadow-none",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex items-center justify-between", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-display text-[15px] font-semibold text-brand-blue-dark/70 dark:text-white/70", className)} {...props} />
  );
}
