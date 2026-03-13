import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Trash2, ExternalLink, AlertTriangle, CheckCircle2, Info, AlertCircle, BellRing } from "lucide-react";
import { useNotifications, type AppNotification, type NotifType } from "@/context/notifications";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

const TYPE_STYLES: Record<NotifType, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; dot: string }> = {
  info:    { icon: Info,          color: "text-sky-600",   bg: "bg-sky-50",     dot: "bg-sky-500"     },
  success: { icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50",   dot: "bg-amber-500"   },
  error:   { icon: AlertCircle,   color: "text-red-600",   bg: "bg-red-50",     dot: "bg-red-500"     },
};

function NotifItem({ n, onRead }: { n: AppNotification; onRead: (id: string) => void }) {
  const style = TYPE_STYLES[n.type];
  const Icon = style.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      layout
      onClick={() => onRead(n.id)}
      className={`flex gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-slate-50 border-b border-slate-50 ${!n.read ? "bg-sky-50/30" : ""}`}
    >
      <div className={`w-8 h-8 rounded-full ${style.bg} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon className={`w-4 h-4 ${style.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold leading-snug ${!n.read ? "text-slate-900" : "text-slate-600"}`}>
            {n.title}
          </p>
          {!n.read && <span className={`w-2 h-2 rounded-full ${style.dot} shrink-0 mt-1.5`} />}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
        <p className="text-[10px] text-slate-400 mt-1.5">{formatDistanceToNow(n.timestamp, { addSuffix: true })}</p>
        {n.link && (
          <Link href={n.link} className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:underline mt-1">
            View <ExternalLink className="w-2.5 h-2.5" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clear, pushPermission, requestPushPermission, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pushPermission === "default") {
      const timer = setTimeout(() => setShowPushPrompt(true), 8000);
      return () => clearTimeout(timer);
    }
  }, [pushPermission]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Push notification prompt */}
      <AnimatePresence>
        {showPushPrompt && !open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 p-4 z-50"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <BellRing className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">Stay in the loop</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Get notified instantly when your tech needs attention — even when you're not on the page.</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={async () => { await requestPushPermission(); setShowPushPrompt(false); }}
                    className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors"
                  >
                    Turn on
                  </button>
                  <button onClick={() => setShowPushPrompt(false)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors">
                    Not now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); setShowPushPrompt(false); }}
        className="relative w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
      >
        <Bell className={`w-4 h-4 ${unreadCount > 0 ? "text-blue-600" : ""}`} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-700" />
                <span className="text-sm font-bold text-slate-800">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{unreadCount} new</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} title="Mark all read"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={clear} title="Clear all"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500 font-medium">You're all caught up</p>
                  <p className="text-xs text-slate-400">No new notifications</p>
                </div>
              ) : (
                notifications.map(n => <NotifItem key={n.id} n={n} onRead={markRead} />)
              )}
            </div>

            {/* Push notification footer */}
            {pushPermission !== "granted" && (
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Enable browser alerts</span>
                <button onClick={() => void requestPushPermission()}
                  className="text-xs text-blue-600 font-semibold hover:underline">
                  Turn on →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
