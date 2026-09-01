import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { PhoneCaptureProvider } from "@/lib/capture/PhoneCaptureContext";

// Affiché pendant le chargement du chunk de l'écran ciblé (voir App.tsx) —
// la sidebar/topbar restent montées, seul le contenu central attend.
function RouteFallback() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <Loader2 size={22} className="animate-spin text-brand-blue/40" />
    </div>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <PhoneCaptureProvider>
      <div className="flex h-screen overflow-hidden bg-brand-off-white dark:bg-brand-dark-bg">
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
          <Topbar onMenuClick={() => setMobileOpen(true)} />

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-page px-4 py-6 sm:px-6 md:px-8 lg:px-12 lg:py-10">
              <Suspense fallback={<RouteFallback />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </PhoneCaptureProvider>
  );
}
