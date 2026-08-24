import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  tooltipSide?: "bottom" | "right";
  showBadge?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ icon: Icon, label, tooltipSide = "bottom", showBadge, className, ...props }, ref) => (
    <div className={cn("group relative inline-flex", tooltipSide === "right" && "justify-center")}>
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-sm text-brand-gray transition-colors hover:bg-brand-off-white hover:text-brand-blue-dark dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white",
          className
        )}
        {...props}
      >
        <Icon size={17} strokeWidth={1.75} />
      </button>
      {showBadge && (
        <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-orange opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-orange" />
        </span>
      )}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute whitespace-nowrap rounded-sm bg-brand-blue-dark px-2 py-1 text-[12px] font-medium text-white opacity-0 shadow-card transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
          tooltipSide === "bottom" && "left-1/2 top-full mt-1.5 -translate-x-1/2",
          tooltipSide === "right" && "bottom-1/2 left-full ml-2 translate-y-1/2"
        )}
      >
        {label}
      </span>
    </div>
  )
);
IconButton.displayName = "IconButton";
