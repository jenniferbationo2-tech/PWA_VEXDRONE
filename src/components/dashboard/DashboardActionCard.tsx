import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, type ButtonProps } from "@/components/ui/button";

interface DashboardActionCardProps {
  title: string;
  description?: string;
  buttonLabel: string;
  buttonIcon: LucideIcon;
  buttonVariant?: ButtonProps["variant"];
  onAction: () => void;
  // Contenu additionnel entre la description et le bouton — liste de la
  // flotte, pastilles de réglages... ce que chaque carte a de spécifique.
  children?: ReactNode;
}

// Motif répété sur les Dashboards Admin et SuperAdmin : titre, description
// courte, contenu optionnel, un bouton d'action. Partagé pour ne corriger
// qu'un seul endroit si ce motif évolue (voir audit du 31 août 2026).
export function DashboardActionCard({
  title,
  description,
  buttonLabel,
  buttonIcon: Icon,
  buttonVariant,
  onAction,
  children,
}: DashboardActionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {description && (
        <p className="mb-4 text-[13px] text-brand-gray dark:text-white/60">{description}</p>
      )}
      {children}
      <Button variant={buttonVariant} size="sm" className="gap-2" onClick={onAction}>
        <Icon size={16} strokeWidth={1.75} />
        {buttonLabel}
      </Button>
    </Card>
  );
}
