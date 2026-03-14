import { ReactNode, useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  LayoutDashboard,
  Ticket,
  MessageSquareText,
  Settings2,
  CreditCard,
  Monitor,
  Cpu,
  LogOut,
  ChevronRight,
  Zap,
  Bell,
  CheckCircle2,
  Settings,
  ShieldCheck,
  BarChart3,
  Search,
  BookOpen,
  Lock,
  ArrowRight,
  ClipboardList,
  HelpCircle,
  Server,
  History,
  Plug,
  Headphones,
  Globe,
  Crown,
  SlidersHorizontal,
  Blocks
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CommandPalette } from "@/components/command-palette";
import { NotificationBell } from "@/components/notification-center";

// ── Section-based navigation ──────────────────────────────────────────────────

const navSections = [
  {
    label: "Support",
    items: [
      { href: "/dashboard",        label: "Home",             icon: LayoutDashboard },
      { href: "/cases",            label: "My Tickets",       icon: Ticket          },
      { href: "/cases/resolved",   label: "Solved",           icon: CheckCircle2    },
      { href: "/apphia",           label: "Ask Apphia",       icon: MessageSquareText },
      { href: "/remote-assistance",label: "Screen Sharing",   icon: Monitor         },
      { href: "/batches",           label: "Run Checks",        icon: Zap             },
      { href: "/autonomous",        label: "Autonomous Support", icon: Cpu             },
    ],
  },
  {
    label: "Your Platform",
    items: [
      { href: "/connectors",       label: "Connected Tools",  icon: Plug            },
      { href: "/alerts",           label: "Alerts",           icon: Bell            },
      { href: "/issue-log",        label: "Activity",         icon: History         },
      { href: "/analytics",        label: "Reports",          icon: BarChart3       },
      { href: "/automation",       label: "Auto-Rules",       icon: Cpu             },
      { href: "/stack-intelligence", label: "My Tech Stack",  icon: Headphones      },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/kb",               label: "Help",             icon: BookOpen        },
      { href: "/secure-vault",     label: "Secure Files",     icon: Lock            },
      { href: "/security",         label: "Security",         icon: ShieldCheck     },
      { href: "/billing",          label: "Plans & Billing",  icon: CreditCard      },
      { href: "/preferences",      label: "Preferences",      icon: Settings2       },
      { href: "/settings",         label: "Settings",         icon: Settings        },
    ],
  },
];

const BASE = import.meta.env.BASE_URL?.replace(/\/+$/, "") || "";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => { setMobileOpen(false); }, [location]);

  const firstName = user?.firstName || "there";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile header bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20 lg:hidden">
        <div className="flex items-center gap-2">
          <img src={`${BASE}/images/logo-pmo-ops.png`} alt="Tech-Ops" className="w-7 h-7 object-contain rounded-lg" />
          <span className="font-bold text-sm text-slate-900">Tech-Ops</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} fixed lg:relative z-40 lg:z-20 w-60 h-full bg-white border-r border-slate-100 flex flex-col shadow-sm transition-transform duration-200`}>

        {/* Logo + bell row */}
        <div className="px-4 py-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <img src={`${BASE}/images/logo-pmo-ops.png`} alt="Tech-Ops" className="w-8 h-8 object-contain rounded-xl shadow-sm" />
            <div className="leading-tight">
              <p className="font-bold text-[13px] text-slate-900">Tech-Ops</p>
              <p className="text-[10px] text-slate-400 font-medium">by Martin PMO</p>
            </div>
          </div>
          <div className="hidden lg:block">
            <NotificationBell />
          </div>
        </div>

        {/* User greeting */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 p-2.5 rounded-xl border border-blue-100/60">
            <img
              src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=3b82f6&color=fff`}
              alt="Avatar"
              className="w-7 h-7 rounded-lg shadow-sm border border-blue-100"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold truncate text-slate-900">Hey, {firstName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-emerald-600 font-semibold">You're covered</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-slate-100">
          <button
            onClick={() => setCmdOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 text-xs hover:border-blue-300 hover:text-blue-500 transition-all"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 text-left">Search anything...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-[9px] font-mono text-slate-400 hidden sm:block">⌘K</kbd>
          </button>
        </div>

        {/* Get Help Now CTA */}
        <div className="px-3 pt-3 pb-1">
          <Link
            href="/cases/submit"
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:from-blue-500 hover:to-indigo-500 transition-all"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" />
              Get Help Now
            </div>
            <ArrowRight className="w-3 h-3 opacity-70" />
          </Link>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-2.5 overflow-y-auto py-2 custom-scrollbar space-y-4">
          {navSections.map(section => (
            <div key={section.label}>
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const isActive =
                    location === item.href ||
                    (item.href !== "/cases" &&
                     item.href !== "/cases/resolved" &&
                     item.href.length > 1 &&
                     location.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 group relative",
                        isActive
                          ? "text-blue-700 bg-blue-50 border border-blue-100"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-nav"
                          className="absolute inset-0 bg-blue-50 rounded-lg border border-blue-100 z-0"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      <item.icon className={cn("w-3.5 h-3.5 relative z-10 transition-colors shrink-0", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                      <span className="relative z-10">{item.label}</span>
                      {isActive && <ChevronRight className="w-3 h-3 ml-auto relative z-10 text-blue-400" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Creator-only section */}
          {user?.email === "martin@techopspmo.com" && (
            <div>
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-500 flex items-center gap-1">
                <Crown className="w-3 h-3" /> Creator
              </p>
              <div className="space-y-0.5">
                {[
                  { href: "/site-builder", label: "Site Builder", icon: Globe },
                  { href: "/builder",  label: "B-Stage Connect",    icon: Blocks             },
                  { href: "/admin",    label: "Admin Panel",        icon: SlidersHorizontal  },
                ].map(item => {
                  const isActive = location === item.href || (item.href.length > 1 && location.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 group relative",
                        isActive
                          ? "text-amber-700 bg-amber-50 border border-amber-100"
                          : "text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-nav-creator"
                          className="absolute inset-0 bg-amber-50 rounded-lg border border-amber-100 z-0"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      <item.icon className={cn("w-3.5 h-3.5 relative z-10 transition-colors shrink-0", isActive ? "text-amber-600" : "text-slate-400 group-hover:text-amber-500")} />
                      <span className="relative z-10">{item.label}</span>
                      {isActive && <ChevronRight className="w-3 h-3 ml-auto relative z-10 text-amber-400" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 space-y-1">
          <div className="flex items-center gap-1">
            <a
              href="mailto:support@techopspmo.com"
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Contact Support
            </a>
            <Link
              href="/status"
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium text-emerald-500 hover:bg-emerald-50 transition-colors"
              title="System Status"
            >
              <Server className="w-3.5 h-3.5" />
            </Link>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-50 pt-14 lg:pt-0">
        <div className="fixed top-0 left-0 lg:left-60 right-0 h-[200px] bg-gradient-to-b from-blue-500/[0.03] via-transparent to-transparent pointer-events-none z-0" />
        <div className="relative z-10 min-h-full p-4 lg:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
