import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications, type AppNotification } from "@/lib/notifications/NotificationContext";
import { cn, formatRelativeTime } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NotificationsModal({ open, onClose }: Props) {
  const { notifications, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  if (!open) return null;

  function handleClick(n: AppNotification) {
    markRead(n.id);
    if (n.link) navigate(n.link);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-brand-blue-dark">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-bold text-brand-blue-dark dark:text-white">Notifications</h2>
          <button
            onClick={onClose}
            className="text-brand-gray hover:text-brand-blue-dark dark:text-white/60 dark:hover:text-white"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <p className="text-[13px] text-brand-gray dark:text-white/60">Aucune notification pour le moment.</p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex justify-end">
              <button
                onClick={markAllRead}
                className="text-[12px] font-semibold text-brand-blue hover:underline dark:text-white/90"
              >
                Tout marquer comme lu
              </button>
            </div>
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-brand-off-white dark:hover:bg-white/5",
                      !n.read && "bg-brand-blue/[0.03] dark:bg-white/[0.04]"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full",
                        n.read ? "bg-transparent" : "bg-brand-orange"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-brand-blue-dark dark:text-white">
                        {n.title}
                      </span>
                      <span className="block text-[12px] text-brand-gray dark:text-white/60">{n.message}</span>
                      <span className="mt-0.5 block text-[11px] text-brand-gray/70 dark:text-white/40">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
