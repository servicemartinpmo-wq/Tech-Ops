import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, LayoutDashboard, Briefcase, MessageSquareText, Activity, Cpu, 
  ShieldCheck, Brain, BarChart3, Monitor, Bell, Settings2, CreditCard, Settings,
  PlusCircle, Layers, CheckCircle2, Mic
} from "lucide-react";

const commands = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, category: "Navigation" },
  { label: "Submit Issue", href: "/cases/submit", icon: PlusCircle, category: "Navigation" },
  { label: "Diagnostic Cases", href: "/cases", icon: Briefcase, category: "Navigation" },
  { label: "Resolved Cases", href: "/cases/resolved", icon: CheckCircle2, category: "Navigation" },
  { label: "Batch Diagnostics", href: "/batches", icon: Layers, category: "Navigation" },
  { label: "Apphia Engine", href: "/apphia", icon: MessageSquareText, category: "Navigation" },
  { label: "Voice Companion", href: "/voice", icon: Mic, category: "Navigation" },
  { label: "Connector Health", href: "/connectors", icon: Activity, category: "Monitoring" },
  { label: "Security & Privacy", href: "/security", icon: ShieldCheck, category: "Monitoring" },
  { label: "Stack Intelligence", href: "/stack-intelligence", icon: Brain, category: "Intelligence" },
  { label: "PMO-Ops", href: "/pmo-ops", icon: BarChart3, category: "Intelligence" },
  { label: "Automation Center", href: "/automation", icon: Cpu, category: "Operations" },
  { label: "Remote Assistance", href: "/remote-assistance", icon: Monitor, category: "Operations" },
  { label: "System Alerts", href: "/alerts", icon: Bell, category: "Operations" },
  { label: "Preferences", href: "/preferences", icon: Settings2, category: "Settings" },
  { label: "Subscription", href: "/billing", icon: CreditCard, category: "Settings" },
  { label: "Settings", href: "/settings", icon: Settings, category: "Settings" },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  const filtered = commands.filter(c => 
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      setLocation(filtered[selectedIndex].href);
      onOpenChange(false);
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[560px] max-h-[60vh] z-50 glass-card rounded-2xl border border-cyan-500/10 shadow-2xl shadow-cyan-500/5 overflow-hidden"
          >
            <div className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
              <Search className="w-5 h-5 text-cyan-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search commands, pages, apps..."
                className="flex-1 bg-transparent text-white placeholder:text-slate-500 text-sm outline-none"
              />
              <kbd className="px-2 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-slate-500 border border-white/[0.06]">ESC</kbd>
            </div>
            <div className="overflow-y-auto max-h-[calc(60vh-60px)] p-2 custom-scrollbar">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">No results found.</div>
              ) : (
                <>
                  {Array.from(new Set(filtered.map(c => c.category))).map(cat => (
                    <div key={cat}>
                      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">{cat}</div>
                      {filtered.filter(c => c.category === cat).map((cmd) => {
                        const idx = filtered.indexOf(cmd);
                        return (
                          <motion.button
                            key={cmd.href}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            onClick={() => { setLocation(cmd.href); onOpenChange(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                              idx === selectedIndex ? "bg-cyan-500/10 text-cyan-400" : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-300"
                            }`}
                          >
                            <cmd.icon className="w-4 h-4" />
                            <span className="font-medium">{cmd.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
