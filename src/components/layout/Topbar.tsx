import { useState } from "react";
import { Bell, Menu, Moon, Sun } from "lucide-react";
import { useAuth } from "@/lib/Auth/AuthContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useNotifications } from "@/lib/notifications/NotificationContext";
import { usePhoneCapture } from "@/lib/capture/PhoneCaptureContext";
import { prettifyUsername } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";
import { NotificationsModal } from "@/components/layout/NotificationsModal";
import { ProfileMenu } from "@/components/layout/ProfileMenu";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void } = {}) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const { isCapturing } = usePhoneCapture();
  const [notifOpen, setNotifOpen] = useState(false);

  if (!user) return null;

  const displayName = user.name ?? prettifyUsername(user.username);
  const subtitle = [user.organisation, user.zone].filter(Boolean).join(" · ");

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-brand-blue/[0.06] bg-white px-4 sm:px-6 lg:px-8 dark:border-white/10 dark:bg-brand-blue-dark">
      <div className="flex items-center gap-3 md:hidden">
        <button onClick={onMenuClick} aria-label="Ouvrir le menu" className="text-brand-blue dark:text-white">
          <Menu size={22} />
        </button>
        <span className="font-display text-[16px] font-bold text-brand-blue dark:text-white">VEXDRON</span>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-1.5">
        {isCapturing && (
          <span className="mr-1 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-orange/10 px-3 py-1 text-[12px] font-semibold text-brand-orange">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-orange opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-orange" />
            </span>
            Capture en direct
          </span>
        )}

        <IconButton
          icon={theme === "dark" ? Sun : Moon}
          label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
          onClick={toggleTheme}
        />

        <IconButton
          icon={Bell}
          label="Notifications"
          showBadge={unreadCount > 0}
          onClick={() => setNotifOpen(true)}
          className="hover:text-brand-orange"
        />

        <div className="mx-1 h-6 w-px bg-brand-blue/[0.08] dark:bg-white/10" />

        <ProfileMenu user={user} displayName={displayName} subtitle={subtitle} />
      </div>

      <NotificationsModal open={notifOpen} onClose={() => setNotifOpen(false)} />
    </header>
  );
}
