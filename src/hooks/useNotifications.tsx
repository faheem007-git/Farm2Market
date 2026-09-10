import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { notificationsService } from "../services";
import type { AppNotification, Role } from "../types";

const NOTIF_KEY = "agripulse.notifications.v1";

interface NotificationsContextValue {
  items: AppNotification[];
  unread: number;
  refresh: (userId: string, role: Role) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const Ctx = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [who, setWho] = useState<{ userId: string; role: Role } | null>(null);

  const refresh = useCallback(async (userId: string, role: Role) => {
    setWho({ userId, role });
    setItems(await notificationsService.listFor(userId, role));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!who) return;
    await notificationsService.markAllRead(who.userId, who.role);
    setItems(await notificationsService.listFor(who.userId, who.role));
  }, [who]);

  // Cross-tab + cross-session sync: another tab/role wrote notifications.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === NOTIF_KEY && who) {
        void notificationsService.listFor(who.userId, who.role).then(setItems);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [who]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      items,
      unread: items.filter((n) => !n.read).length,
      refresh,
      markAllRead,
    }),
    [items, refresh, markAllRead]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
