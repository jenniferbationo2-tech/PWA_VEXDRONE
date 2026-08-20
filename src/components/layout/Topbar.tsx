import { useState } from "react";
import { Bell, LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/Auth/AuthContext";
import { useNotifications } from "@/lib/notifications/NotificationContext";
import { prettifyUsername } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";
import { NotificationsModal } from "@/components/layout/NotificationsModal";
import { ProfileMenu } from "@/components/layout/ProfileMenu";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void } = {}) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/connexion");
  }

  if (!user) return null;

  const displayName = user.name ?? prettifyUsername(user.username);
  const subtitle = [user.organisation, user.zone].filter(Boolean).join(" · ");

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-brand-blue/[0.06] bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 md:hidden">
        <button onClick={onMenuClick} aria-label="Ouvrir le menu" className="text-brand-blue">
          <Menu size={22} />
        </button>
        <span className="font-display text-[16px] font-bold text-brand-blue">VEXDRON</span>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-1.5">
        <IconButton
          icon={Bell}
          label="Notifications"
          showBadge={unreadCount > 0}
          onClick={() => setNotifOpen(true)}
          className="text-brand-gray hover:bg-brand-off-white hover:text-brand-orange"
        />

        <div className="mx-1 h-6 w-px bg-brand-blue/[0.08]" />

        <ProfileMenu user={user} displayName={displayName} subtitle={subtitle} />

        <div className="mx-1 h-6 w-px bg-brand-blue/[0.08]" />

        <IconButton
          icon={LogOut}
          label="Déconnexion"
          onClick={handleLogout}
          className="text-brand-gray hover:bg-brand-off-white hover:text-brand-orange"
        />
      </div>

      <NotificationsModal open={notifOpen} onClose={() => setNotifOpen(false)} />
    </header>
  );
}
