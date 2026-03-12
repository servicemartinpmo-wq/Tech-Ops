import { useListConnectorHealth, usePollConnectorHealth } from "@workspace/api-client-react";
import { Card, Button, Badge } from "@/components/ui";
import { RefreshCw, Server, AlertCircle, CheckCircle2, XCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState } from "react";

const STATUS_DESCRIPTIONS: Record<string, { label: string; description: string; color: string; tip: string }> = {
  healthy: {
    label: "Healthy",
    color: "#00ff88",
    description: "All systems nominal. Response times within acceptable thresholds. No errors detected in the last 5 polling cycles.",
    tip: "Last poll completed successfully within SLA limits.",
  },
  degraded: {
    label: "Degraded",
    color: "#ffb800",
    description: "Connector is reachable but experiencing elevated response times or intermittent errors. Service may be impacted.",
    tip: "Consider polling manually to confirm current status.",
  },
  down: {
    label: "Down",
    color: "#ff3355",
    description: "Connector is unreachable. No successful response received. Dependent integrations and automations will be paused.",
    tip: "Check firewall rules, credentials, and the upstream service status page.",
  },
  unknown: {
    label: "Unknown",
    color: "#64748b",
    description: "Status has not been checked yet or data is too stale to be reliable. Manual polling is recommended.",
    tip: "Click 'Poll Now' to run an immediate health check.",
  },
};

function StatusTooltip({ status, show }: { status: string; show: boolean }) {
  const info = STATUS_DESCRIPTIONS[status] || STATUS_DESCRIPTIONS.unknown;
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      className="absolute bottom-full left-0 mb-3 z-50 w-72 p-4 rounded-2xl text-xs text-left pointer-events-none"
      style={{
        background: "linear-gradient(135deg, rgba(26,26,40,0.98) 0%, rgba(20,20,32,0.99) 100%)",
        border: `1px solid ${info.color}30`,
        boxShadow: `0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color, boxShadow: `0 0 6px ${info.color}` }} />
        <span className="font-bold text-white">{info.label}</span>
      </div>
      <p className="text-slate-400 leading-relaxed mb-2">{info.description}</p>
      <p className="text-slate-600 italic flex items-center gap-1.5">
        <Info className="w-3 h-3 shrink-0" style={{ color: info.color }} />
        {info.tip}
      </p>
    </motion.div>
  );
}

export default function Connectors() {
  const { data: connectors, isLoading, refetch } = useListConnectorHealth();
  const { mutate: poll, isPending: isPolling } = usePollConnectorHealth();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handlePoll = (name: string) => {
    poll({ name }, { onSuccess: () => refetch() });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const healthy = connectors?.filter(c => c.status === "healthy").length || 0;
  const degraded = connectors?.filter(c => c.status === "degraded").length || 0;
  const down = connectors?.filter(c => c.status === "down").length || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white text-glow">Infrastructure Health</h1>
          <p className="text-slate-500 mt-1">Live monitoring of your integrated systems. Hover a status badge for details.</p>
        </div>
        <Button variant="secondary" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh All
        </Button>
      </motion.div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Healthy", count: healthy, color: "#00ff88" },
          { label: "Degraded", count: degraded, color: "#ffb800" },
          { label: "Down", count: down, color: "#ff3355" },
        ].map(item => (
          <div key={item.label} className="glass-card rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}30` }}>
              <span className="text-lg font-black" style={{ color: item.color }}>{item.count}</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">{item.label}</p>
              <p className="text-sm font-bold text-white">{item.count === 1 ? "1 connector" : `${item.count} connectors`}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {connectors?.map((conn, i) => {
          const statusInfo = STATUS_DESCRIPTIONS[conn.status] || STATUS_DESCRIPTIONS.unknown;
          const StatusIcon = conn.status === 'healthy' ? CheckCircle2 : conn.status === 'degraded' ? AlertCircle : XCircle;
          const cardId = conn.id?.toString() || conn.connectorName;

          return (
            <motion.div
              key={cardId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link href={`/connectors/${conn.connectorName}`}>
                <Card className="p-6 flex flex-col cursor-pointer group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.06] group-hover:border-cyan-500/20 transition-colors"
                        style={{ boxShadow: `0 0 20px ${statusInfo.color}15` }}>
                        <Server className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors">{conn.connectorName}</h3>

                        <div
                          className="relative inline-flex items-center gap-1.5 mt-1 cursor-help"
                          onMouseEnter={() => setHoveredId(cardId)}
                          onMouseLeave={() => setHoveredId(null)}
                          onClick={e => e.preventDefault()}
                        >
                          <div className="w-2 h-2 rounded-full pulse-dot" style={{ backgroundColor: statusInfo.color, boxShadow: `0 0 8px ${statusInfo.color}` }} />
                          <span className="text-xs font-medium uppercase" style={{ color: statusInfo.color }}>
                            {statusInfo.label}
                          </span>
                          <Info className="w-3 h-3 opacity-40 hover:opacity-80 transition-opacity" style={{ color: statusInfo.color }} />
                          <StatusTooltip status={conn.status} show={hoveredId === cardId} />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm mt-2 flex-1">
                    <div className="flex justify-between border-b border-white/[0.03] pb-2">
                      <span className="text-slate-500">Response Time</span>
                      <span className={`font-mono font-medium ${conn.responseTime && conn.responseTime > 500 ? "text-amber-400" : "text-slate-300"}`}>
                        {conn.responseTime ? `${conn.responseTime}ms` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between pb-2">
                      <span className="text-slate-500">Last Checked</span>
                      <span className="font-medium text-slate-300">{format(new Date(conn.lastChecked), "h:mm:ss a")}</span>
                    </div>
                    {conn.errorMessage && (
                      <div className="p-2 bg-red-500/5 text-red-400 text-xs rounded border border-red-500/10 mt-2">
                        {conn.errorMessage}
                      </div>
                    )}
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4" 
                    onClick={(e) => { e.preventDefault(); handlePoll(conn.connectorName); }}
                    disabled={isPolling}
                  >
                    Poll Now
                  </Button>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
