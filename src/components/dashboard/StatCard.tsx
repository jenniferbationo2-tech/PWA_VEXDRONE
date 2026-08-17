import { ArrowUp, ArrowDown, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  delta?: { value: number; positiveIsGood?: boolean };
  helper?: string;
  icon?: LucideIcon;
}

export function StatCard({ label, value, delta, helper, icon: Icon }: StatCardProps) {
  const isPositive = delta ? delta.value >= 0 : null;
  const isGood = delta ? (delta.positiveIsGood ?? true) === isPositive : null;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-brand-gray">{label}</span>
        {Icon && <Icon size={16} className="text-brand-blue/30" strokeWidth={1.75} />}
      </div>
      <div className="mt-2 font-display text-[32px] font-bold leading-none text-brand-blue-dark">
        {value}
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-[13px]">
        {delta && (
          <span
            className={cn(
              "flex items-center gap-0.5 font-semibold",
              isGood ? "text-status-success" : "text-brand-orange"
            )}
          >
            {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {Math.abs(delta.value)}
          </span>
        )}
        {helper && <span className="text-brand-gray">{helper}</span>}
      </div>
    </Card>
  );
}
