import { useListConnectorHealth, usePollConnectorHealth } from "@workspace/api-client-react";
import { Card, Button, Badge } from "@/components/ui";
import { RefreshCw, Server, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Connectors() {
  const { data: connectors, isLoading, refetch } = useListConnectorHealth();
  const { mutate: poll, isPending: isPolling } = usePollConnectorHealth();

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white text-glow">Infrastructure Health</h1>
          <p className="text-slate-500 mt-1">Live monitoring of your integrated systems.</p>
        </div>
        <Button variant="secondary" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh All
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {connectors?.map((conn, i) => {
          const statusColor = conn.status === 'healthy' ? '#00ff88' : conn.status === 'degraded' ? '#ffb800' : conn.status === 'down' ? '#ff3355' : '#64748b';
          const StatusIcon = conn.status === 'healthy' ? CheckCircle2 : conn.status === 'degraded' ? AlertCircle : XCircle;

          return (
            <motion.div
              key={conn.id || conn.connectorName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link href={`/connectors/${conn.connectorName}`}>
                <Card className="p-6 flex flex-col cursor-pointer group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.06] group-hover:border-cyan-500/20 transition-colors"
                        style={{ boxShadow: `0 0 20px ${statusColor}15` }}>
                        <Server className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors">{conn.connectorName}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-2 h-2 rounded-full pulse-dot" style={{ backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
                          <span className="text-xs font-medium uppercase" style={{ color: statusColor }}>{conn.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm mt-2 flex-1">
                    <div className="flex justify-between border-b border-white/[0.03] pb-2">
                      <span className="text-slate-500">Response Time</span>
                      <span className="font-mono font-medium text-slate-300">{conn.responseTime ? `${conn.responseTime}ms` : '-'}</span>
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
