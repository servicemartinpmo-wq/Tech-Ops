import { ReactNode } from "react";
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
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
  { href: "/alerts", label: "System Alerts", icon: Bell },
  { href: "/preferences", label: "Preferences", icon: Settings2 },
  { href: "/billing", label: "Subscription", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-72 glass-panel flex flex-col relative z-20">
        <div className="p-6 flex items-center gap-3">
          <img 
            src={`${import.meta.env.BASE_URL}images/logo-mark.png`} 
            alt="Logo" 
            className="w-8 h-8 object-contain drop-shadow-sm"
          />
          <h1 className="font-display font-bold text-xl tracking-tight text-slate-900">
            Tech-Ops <span className="text-primary opacity-80">by Martin PMO</span>
          </h1>
        </div>

        <div className="px-6 pb-6 pt-2">
          <div className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-white shadow-sm">
            <img 
              src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=EBF4FF&color=2563EB`} 
              alt="Avatar" 
              className="w-10 h-10 rounded-lg shadow-sm border border-white"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                <p className="text-xs text-slate-500 font-medium truncate">System Online</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-4 custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/cases" && item.href !== "/cases/submit" && item.href !== "/cases/resolved" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isActive 
                    ? "text-primary bg-primary/5 shadow-sm" 
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-nav" 
                    className="absolute inset-0 bg-white rounded-xl shadow-sm border border-primary/10 z-0"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5 relative z-10 transition-colors", isActive ? "text-primary" : "text-slate-400 group-hover:text-primary/70")} />
                <span className="relative z-10">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto relative z-10 text-primary/50" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#F8FAFC]">
        {/* Decorative background gradients */}
        <div className="fixed top-0 left-72 right-0 h-[500px] bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none -z-10" />
        <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-accent/40 via-transparent to-transparent blur-3xl rounded-full pointer-events-none -z-10" />
        
        <div className="min-h-full p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
