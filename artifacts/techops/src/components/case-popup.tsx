import { useState } from "react";
import { useListCases } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, ChevronDown, ChevronUp, X, Plus, ExternalLink, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColor: Record<string, string> = {
  open: "#64748b",
  draft: "#6366f1",
  in_progress: "#ffb800",
  resolved: "#00ff88",
  closed: "#374151",
};

const statusLabel: Record<string, string> = {
  open: "Open",
  draft: "Draft",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export function CasePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const { data: cases } = useListCases();

  const activeCases = cases?.filter(c => ["open", "in_progress", "draft"].includes(c.status)).slice(0, 8) || [];
  const inProgress = activeCases.filter(c => c.status === "in_progress");

  if (!cases) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-[380px] max-h-[520px] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/[0.1]"
            style={{
              background: "linear-gradient(180deg, #1a1a28 0%, #151520 100%)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <Briefcase className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Diagnostic Cases</h3>
                  <p className="text-xs text-slate-500">{activeCases.length} active · {inProgress.length} running</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeCases.length === 0 ? (
                <div className="p-8 text-center text-slate-600">
                  <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No active cases</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {activeCases.map((c) => {
                    const color = statusColor[c.status] || "#64748b";
                    return (
                      <Link key={c.id} href={`/cases/${c.id}`} onClick={() => setIsOpen(false)}>
                        <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group cursor-pointer">
                          <Circle
                            className="w-2.5 h-2.5 shrink-0"
                            fill={color}
                            stroke={color}
                            style={c.status === "in_progress" ? { animation: "pulse 2s infinite" } : {}}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-200 truncate font-medium group-hover:text-cyan-400 transition-colors">
                              {c.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-medium" style={{ color }}>
                                {statusLabel[c.status] || c.status}
                              </span>
                              <span className="text-xs text-slate-600">#{c.id.toString().padStart(4, "0")}</span>
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
              <Link href="/cases/submit" onClick={() => setIsOpen(false)}>
                <button className="flex items-center gap-2 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  New Case
                </button>
              </Link>
              <Link href="/cases" onClick={() => setIsOpen(false)}>
                <button className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  View All →
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => {
          if (isMinimized) {
            setIsMinimized(false);
          } else {
            setIsOpen(prev => !prev);
          }
        }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-300 shadow-2xl",
          isOpen && !isMinimized
            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
            : "bg-[#1a1a28] border-white/[0.1] text-slate-400 hover:text-white hover:border-white/20"
        )}
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
      >
        <Briefcase className="w-5 h-5" />
        <span className="text-sm font-bold">Cases</span>
        {activeCases.length > 0 && (
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center",
            inProgress.length > 0 ? "bg-amber-500/20 text-amber-400" : "bg-white/[0.08] text-slate-400"
          )}>
            {activeCases.length}
          </span>
        )}
        {isOpen && !isMinimized
          ? <ChevronDown className="w-4 h-4" />
          : <ChevronUp className="w-4 h-4" />
        }
      </button>
    </div>
  );
}
