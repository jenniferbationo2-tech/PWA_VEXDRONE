import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-brand-off-white">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-brand-blue-dark/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 h-full">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-brand-blue/[0.06] bg-white px-4 py-3 md:hidden">
          <button onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu">
            <Menu size={22} className="text-brand-blue" />
          </button>
          <span className="font-display text-[16px] font-bold text-brand-blue">VEXDRON</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-page px-4 py-6 sm:px-6 md:px-8 lg:px-12 lg:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}