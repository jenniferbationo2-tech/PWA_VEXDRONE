import {
  LayoutGrid,
  ClipboardList,
  PlaneTakeoff,
  ScanSearch,
  Map as MapIcon,
  FileText,
  Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/missions", label: "Missions", icon: ClipboardList },
  { to: "/vols", label: "Vols", icon: PlaneTakeoff },
  { to: "/anomalies", label: "IA & Anomalies", icon: ScanSearch },
  { to: "/carte", label: "Carte", icon: MapIcon },
  { to: "/rapports", label: "Rapports", icon: FileText },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  return (
    <aside className="flex h-full w-[240px] flex-shrink-0 flex-col overflow-y-auto bg-brand-blue text-white">
      <div className="flex items-center gap-2 px-8 py-8">
  <img src="/logo/vexdrone-icon.png" alt="VEXDRONE" className="h-15 w-15 rounded-full" />
  
</div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
          onClick={onNavigate}
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-sm px-3 py-2.5 text-[14px] font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white",
                isActive && "bg-white/10 text-white border-l-2 border-brand-orange -ml-[2px] pl-[14px]"
              )
            }
          >
            <Icon size={18} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 px-3 pb-4">
        <NavLink
          to="/parametres"
          className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-[14px] font-medium text-white/60 hover:bg-white/5 hover:text-white"
        >
          <Settings size={18} strokeWidth={1.75} />
          Paramètres
        </NavLink>
        <div className="mt-3 flex items-center gap-3 border-t border-white/10 px-3 pt-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[13px] font-semibold">
            MD
          </div>
          <div className="text-[13px] leading-tight">
            <div className="font-semibold">Mounira D.</div>
            <div className="text-white/50">SONABEL · Zone Nord</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
