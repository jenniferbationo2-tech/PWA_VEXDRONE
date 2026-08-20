import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (input: { title: string; message: string; link?: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Pas d'endpoint notifications cote backend : generees localement a partir
// des evenements de l'app (mission lancee, analyse terminee/echouee...).
const MAX_NOTIFICATIONS = 30;

let notificationCounter = 0;
function nextId() {
  notificationCounter += 1;
  return `notif-${notificationCounter}`;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = useCallback((input: { title: string; message: string; link?: string }) => {
    setNotifications((prev) =>
      [{ id: nextId(), ...input, createdAt: new Date().toISOString(), read: false }, ...prev].slice(
        0,
        MAX_NOTIFICATIONS
      )
    );
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications doit être utilisé dans un NotificationProvider");
  return ctx;
}
