import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { playTechOpsChime, playTechOpsAlert, playTechOpsSuccess } from "@/lib/notification-sound";

export type NotifType = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

interface NotificationsCtx {
  notifications: AppNotification[];
  unreadCount: number;
  push: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
  pushPermission: NotificationPermission | null;
  requestPushPermission: () => Promise<void>;
}

const Ctx = createContext<NotificationsCtx | null>(null);

export function useNotifications() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useNotifications must be used within NotificationProvider");
  return c;
}

const SEED: AppNotification[] = [
  {
    id: "seed-1",
    type: "success",
    title: "All systems running",
    message: "No issues detected. Your tech stack looks healthy.",
    timestamp: new Date(Date.now() - 1000 * 60 * 3),
    read: false,
  },
  {
    id: "seed-2",
    type: "info",
    title: "New help article",
    message: "\"How to speed up a slow Windows PC\" was added to Help Guides.",
    timestamp: new Date(Date.now() - 1000 * 60 * 18),
    read: false,
  },
];

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(SEED);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(
    typeof Notification !== "undefined" ? Notification.permission : null
  );
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const push = useCallback((n: Omit<AppNotification, "id" | "timestamp" | "read">) => {
    const notif: AppNotification = {
      ...n,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [notif, ...prev].slice(0, 50));

    // Play sound based on type
    if (n.type === "success") playTechOpsSuccess();
    else if (n.type === "error" || n.type === "warning") playTechOpsAlert();
    else playTechOpsChime();

    // Browser push notification (if permission granted)
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification(`Tech-Ops · ${n.title}`, {
          body: n.message,
          icon: "/images/logo-pmo-ops.png",
          badge: "/images/logo-pmo-ops.png",
          tag: notif.id,
          silent: true, // We handle sound ourselves
        });
      } catch {
        // Push notifications not available in this context
      }
    }
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  const requestPushPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPushPermission(result);
  }, []);

  // Simulate periodic background checks from the server pushing new notifications
  useEffect(() => {
    const poll = setInterval(async () => {
      if (!isMounted.current) return;
      try {
        const res = await fetch("/api/alerts/unread-count", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json() as { count?: number; alerts?: Array<{ title: string; message: string; severity: string }> };
        if (data.alerts?.length) {
          data.alerts.forEach(a => {
            push({
              type: a.severity === "critical" || a.severity === "high" ? "error" : a.severity === "medium" ? "warning" : "info",
              title: a.title,
              message: a.message,
            });
          });
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 5 * 60 * 1000); // every 5 minutes

    return () => clearInterval(poll);
  }, [push]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Ctx.Provider value={{ notifications, unreadCount, push, markRead, markAllRead, clear, pushPermission, requestPushPermission }}>
      {children}
    </Ctx.Provider>
  );
}
