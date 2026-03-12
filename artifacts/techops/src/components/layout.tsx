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
  Command,
  BookOpen,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CommandPalette } from "@/components/command-palette";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases/submit", label: "Submit Issue", icon: PlusCircle },
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
    <div className="flex h-screen bg-showroom-dark overflow-hidden font-sans text-slate-200">
      <aside className="w-72 glass-panel flex flex-col relative z-20">
        <div className="p-6 flex items-center gap-3">
          <img 
            src={`${import.meta.env.BASE_URL}images/logo-pmo-ops.png`} 
            alt="PMO-Ops Logo" 
            className="w-10 h-10 object-contain rounded-lg"
          />
          <h1 className="font-display font-bold text-base tracking-tight text-white leading-tight">
            Tech-Ops<br /><span className="text-xs font-medium text-slate-500 font-sans tracking-normal">by Martin PMO</span>
          </h1>
        </div>

        <div className="px-6 pb-4 pt-1">
          <div className="flex items-center gap-3 bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
            <img 
              src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=0a0a0f&color=00f0ff`} 
              alt="Avatar" 
              className="w-10 h-10 rounded-lg shadow-sm border border-white/10"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-white">{user?.firstName} {user?.lastName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] pulse-dot"></span>
                <p className="text-xs text-slate-500 font-medium truncate">System Online</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 mb-3">
          <button 
            onClick={() => setCmdOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-500 text-sm hover:border-cyan-500/20 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Quick search...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-slate-500 border border-white/[0.06]">⌘K</kbd>
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4 custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/cases" && item.href !== "/cases/submit" && item.href !== "/cases/resolved" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isActive 
                    ? "text-cyan-400" 
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-nav" 
                    className="absolute inset-0 bg-cyan-500/[0.08] rounded-xl border border-cyan-500/20 z-0"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5 relative z-10 transition-colors", isActive ? "text-cyan-400 drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]" : "text-slate-600 group-hover:text-slate-400")} />
                <span className="relative z-10 text-[13px]">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto relative z-10 text-cyan-500/50" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 mt-auto border-t border-white/[0.04]">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 relative overflow-y-auto overflow-x-hidden custom-scrollbar bg-showroom-dark">
        <div className="fixed top-0 left-72 right-0 h-[500px] bg-gradient-to-b from-cyan-500/[0.03] via-transparent to-transparent pointer-events-none z-0" />
        <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-purple-500/[0.03] via-transparent to-transparent blur-3xl rounded-full pointer-events-none z-0" />
        
        <div className="relative z-10 min-h-full p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
