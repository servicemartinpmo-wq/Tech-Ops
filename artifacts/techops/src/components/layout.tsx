import { ReactNode, useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { 
  LayoutDashboard, 
  Briefcase, 
  MessageSquareText, 
  Settings2, 
  CreditCard, 
  Activity, 
  Cpu,
  LogOut,
  ChevronRight,
  PlusCircle,
  Layers,
  Bell,
  CheckCircle2,
  Mic,
  Settings,
  ShieldCheck,
  Brain,
  BarChart3,
  Monitor,
  Search,
  BookOpen,
  Lock,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CommandPalette } from "@/components/command-palette";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases", label: "Diagnostic Cases", icon: Briefcase },
  { href: "/cases/resolved", label: "Resolved Cases", icon: CheckCircle2 },
  { href: "/batches", label: "Batch Diagnostics", icon: Layers },
  { href: "/apphia", label: "Apphia Engine", icon: MessageSquareText },
  { href: "/voice", label: "Voice Companion", icon: Mic },
  { href: "/connectors", label: "Connector Health", icon: Activity },
  { href: "/automation", label: "Automation Center", icon: Cpu },
  { href: "/security", label: "Security & Privacy", icon: ShieldCheck },
  { href: "/kb", label: "Knowledge Base", icon: BookOpen },
  { href: "/stack-intelligence", label: "Stack Intelligence", icon: Brain },
  { href: "/pmo-ops", label: "PMO-Ops", icon: BarChart3 },
  { href: "/remote-assistance", label: "Remote Assistance", icon: Monitor },
  { href: "/secure-vault", label: "Secure Share Vault", icon: Lock },
  { href: "/alerts", label: "System Alerts", icon: Bell },
  { href: "/preferences", label: "Preferences", icon: Settings2 },
  { href: "/billing", label: "Subscription", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [cmdOpen, setCmdOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setCmdOpen(prev => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen bg-[#f0f4f8] overflow-hidden font-sans text-slate-800">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col relative z-20 shadow-sm">
        <div className="p-5 flex items-center gap-3 border-b border-slate-100">
          <img
            src={`${import.meta.env.BASE_URL}images/logo-pmo-ops.png`}
            alt="PMO-Ops Logo"
            className="w-9 h-9 object-contain rounded-xl shadow-sm"
          />
          <h1 className="font-display font-bold text-sm tracking-tight text-slate-900 leading-tight">
            Tech-Ops<br /><span className="text-[11px] font-medium text-slate-400 font-sans tracking-normal">by Martin PMO</span>
          </h1>
        </div>

        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <img
              src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=0ea5e9&color=fff`}
              alt="Avatar"
              className="w-8 h-8 rounded-lg shadow-sm border border-slate-200"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-slate-900">{user?.firstName} {user?.lastName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)] animate-pulse" />
                <p className="text-[10px] text-slate-400 font-medium">System Online</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 py-2.5 border-b border-slate-100">
          <button
            onClick={() => setCmdOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 text-xs hover:border-sky-300 hover:text-sky-500 transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Quick search...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-[9px] font-mono text-slate-400">⌘K</kbd>
          </button>
        </div>

        <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto py-3 custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/cases" && item.href !== "/cases/resolved" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group relative",
                  isActive
                    ? "text-sky-600 bg-sky-50 border border-sky-100"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-sky-50 rounded-lg border border-sky-100 z-0"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("w-4 h-4 relative z-10 transition-colors shrink-0", isActive ? "text-sky-500" : "text-slate-400 group-hover:text-slate-600")} />
                <span className="relative z-10 text-[12px]">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 ml-auto relative z-10 text-sky-400" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-2">
          <Link
            href="/cases/submit"
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm hover:from-sky-400 hover:to-indigo-400 transition-all"
          >
            <div className="flex items-center gap-2">
              <PlusCircle className="w-3.5 h-3.5" />
              Submit an Issue
            </div>
            <ArrowRight className="w-3 h-3 opacity-70" />
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 relative overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#f0f4f8]">
        <div className="fixed top-0 left-64 right-0 h-[300px] bg-gradient-to-b from-sky-500/[0.04] via-transparent to-transparent pointer-events-none z-0" />
        <div className="relative z-10 min-h-full p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
