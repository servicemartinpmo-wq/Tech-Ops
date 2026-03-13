import { useState, useEffect } from "react";
import { useListCases } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListOrdered, X, Plus, ExternalLink, Zap, Clock,
  ChevronDown, ChevronUp, Circle, ArrowRight, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  open: "#64748b",
  draft: "#6366f1",
  in_progress: "#f59e0b",
  resolved: "#10b981",
  closed: "#374151",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Queued",
  draft: "Draft",
  in_progress: "Processing",
  resolved: "Resolved",
  closed: "Closed",
};

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-amber-400",
  low: "text-slate-500",
};

function SlotIndicator({ used, total }: { used: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            "rounded-full border transition-all duration-500",
            i < used
              ? "bg-amber-400/80 border-amber-400/50 shadow-[0_0_6px_rgba(251,191,36,0.5)]"
              : "bg-white/[0.06] border-white/[0.1]"
          )}
          style={{ width: 10, height: 10 }}
          animate={i < used ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
    </div>
  );
}

export function TicketQueuePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: cases } = useListCases();

  const tier = 2;
  const parallelSlots = tier >= 3 ? 5 : tier === 2 ? 2 : 1;

  const pending = (cases || [])
    .filter(c => ["open", "draft", "in_progress"].includes(c.status))
    .sort((a, b) => {
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (b.status === "in_progress" && a.status !== "in_progress") return 1;
      const pa = PRIORITY_RANK[a.priority as string] ?? 99;
      const pb = PRIORITY_RANK[b.priority as string] ?? 99;
      return pa - pb;
    });

  const inProgress = pending.filter(c => c.status === "in_progress");
  const queued = pending.filter(c => c.status !== "in_progress");
  const slotsUsed = inProgress.length;

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!cases) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-[380px] max-h-[520px] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #16162a 0%, #111120 100%)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center border"
                  style={{ background: "rgba(99,102,241,0.12)", borderColor: "rgba(99,102,241,0.3)" }}>
                  <ListOrdered className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Support Queue</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {slotsUsed}/{parallelSlots} slots active · {queued.length} waiting
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between"
              style={{ background: "rgba(99,102,241,0.04)" }}
            >
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Parallel slots</span>
                <span className="text-indigo-400 font-bold">
                  {parallelSlots === 1 ? "Starter" : parallelSlots === 2 ? "Professional" : "Business+"}
                </span>
              </div>
              <SlotIndicator used={slotsUsed} total={parallelSlots} />
            </div>

            <div className="flex-1 overflow-y-auto">
              {pending.length === 0 ? (
                <div className="p-8 text-center text-slate-600">
                  <ListOrdered className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Queue is empty</p>
                  <p className="text-xs mt-1 text-slate-700">Submit a case to begin</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.03]">
                  {inProgress.length > 0 && (
                    <div className="px-5 pt-3 pb-1">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-amber-400/60 mb-2">
                        Active — {inProgress.length} of {parallelSlots} slots
                      </p>
                      {inProgress.map((c) => (
                        <Link key={c.id} href={`/cases/${c.id}`} onClick={() => setIsOpen(false)}>
                          <div className="flex items-center gap-3 py-3 hover:bg-white/[0.03] -mx-2 px-2 rounded-xl transition-colors group cursor-pointer mb-1">
                            <motion.div
                              className="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-400"
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ duration: 1.2, repeat: Infinity }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate font-medium group-hover:text-indigo-400 transition-colors">
                                {c.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden max-w-[120px]">
                                  <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                                    animate={{ width: ["20%", "85%"] }}
                                    transition={{ duration: 8, ease: "linear", repeat: Infinity }}
                                  />
                                </div>
                                <span className="text-[10px] text-amber-500/80 font-medium">Processing</span>
                              </div>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {queued.length > 0 && (
                    <div className="px-5 pt-3 pb-2">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-slate-600 mb-2">
                        Waiting — {queued.length} in queue
                      </p>
                      {queued.map((c, idx) => {
                        const color = STATUS_COLOR[c.status] || "#64748b";
                        const priorityClass = PRIORITY_COLOR[c.priority as string] || "text-slate-500";
                        return (
                          <Link key={c.id} href={`/cases/${c.id}`} onClick={() => setIsOpen(false)}>
                            <div className="flex items-center gap-3 py-2.5 hover:bg-white/[0.03] -mx-2 px-2 rounded-xl transition-colors group cursor-pointer">
                              <div className="w-5 h-5 rounded-md bg-white/[0.05] flex items-center justify-center shrink-0 border border-white/[0.07]">
                                <span className="text-[9px] font-bold text-slate-500">
                                  {(idx + 1).toString().padStart(2, "0")}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-300 truncate font-medium group-hover:text-indigo-400 transition-colors">
                                  {c.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Circle className="w-1.5 h-1.5 shrink-0" fill={color} stroke={color} />
                                  <span className="text-[10px] text-slate-600">{STATUS_LABEL[c.status] || c.status}</span>
                                  {c.priority && (
                                    <span className={cn("text-[10px] font-semibold capitalize", priorityClass)}>
                                      · {c.priority}
                                    </span>
                                  )}
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
              )}
            </div>

            <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <Link href="/cases/submit" onClick={() => setIsOpen(false)}>
                <button className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  Add to Queue
                </button>
              </Link>
              <Link href="/cases" onClick={() => setIsOpen(false)}>
                <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  All Cases <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-300 shadow-2xl",
          isOpen
            ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
            : "bg-[#16162a] border-white/[0.1] text-slate-400 hover:text-white hover:border-white/20"
        )}
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
      >
        <ListOrdered className="w-5 h-5" />
        <span className="text-sm font-bold">Queue</span>
        {pending.length > 0 && (
          <div className="flex items-center gap-1.5">
            {slotsUsed > 0 && (
              <motion.span
                className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {slotsUsed} active
              </motion.span>
            )}
            {queued.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/[0.08] text-slate-400">
                {queued.length} waiting
              </span>
            )}
          </div>
        )}
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </motion.button>
    </div>
  );
}
