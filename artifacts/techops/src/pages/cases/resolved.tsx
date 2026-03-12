import { useListCases } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, Badge } from "@/components/ui";
import { format } from "date-fns";
import { CheckCircle2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function ResolvedCases() {
  const { data: cases, isLoading } = useListCases({ status: "resolved" });

  const avgConfidence = cases?.length
    ? Math.round(cases.reduce((sum, c) => sum + (c.confidenceScore || 0), 0) / cases.length)
    : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold text-white text-glow">Resolved Cases</h1>
        <p className="text-slate-500 mt-1">Review completed diagnostics and their outcomes.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "Total Resolved", value: cases?.length || 0, icon: CheckCircle2, color: "text-emerald-400", glow: "rgba(0,255,136,0.15)" },
          { label: "Avg. Confidence", value: `${avgConfidence}%`, icon: TrendingUp, color: "text-cyan-400", glow: "rgba(0,240,255,0.15)" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="p-5 hud-element">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.06]" style={{ boxShadow: `0 0 15px ${stat.glow}` }}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white font-display">{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading resolved cases...</div>
        ) : !cases?.length ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/[0.06]">
              <CheckCircle2 className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-white">No resolved cases yet</h3>
            <p className="text-slate-500 mt-1">Cases will appear here after Apphia completes diagnostics.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {cases.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <Link href={`/cases/${c.id}`} className="block hover:bg-white/[0.02] transition-colors p-5 group">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-600">#{c.id.toString().padStart(4, "0")}</span>
                        <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors">{c.title}</h3>
                        <Badge variant="success">Resolved</Badge>
                      </div>
                      {c.rootCause && (
                        <p className="text-sm text-slate-500 truncate max-w-2xl">
                          <span className="font-medium text-slate-400">Root Cause:</span> {c.rootCause}
                        </p>
                      )}
                      {c.resolution && (
                        <p className="text-sm text-slate-500 truncate max-w-2xl">
                          <span className="font-medium text-slate-400">Resolution:</span> {c.resolution}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-600">{format(new Date(c.createdAt), "MMM d, yyyy")}</p>
                      {c.confidenceScore !== null && c.confidenceScore !== undefined && (
                        <p className="text-xs font-bold text-emerald-400 mt-1">{c.confidenceScore}% Confidence</p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
