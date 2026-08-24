import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-sm border border-brand-gray/25 bg-white px-3 text-[14px] text-brand-blue-dark placeholder:text-brand-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";