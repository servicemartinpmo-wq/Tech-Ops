import { useState, useEffect } from "react";
import { Card, Button, Badge } from "@/components/ui";
import { format } from "date-fns";
import { Bell, BellOff, AlertTriangle, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SystemAlert {
  id: number;
  type: string;
  severity: string;
  title: string;
  message: string;
  source: string | null;
  acknowledged: string;
  createdAt: string;
}

export default function SystemAlerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    fetch("/api/alerts")
      .then((res) => res.json())
      .then((data) => {
        setAlerts(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const acknowledge = async (id: number) => {
    const res = await fetch(`/api/alerts/${id}/acknowledge`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertCircle className="w-5 h-5 text-red-400" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case "info": return <Info className="w-5 h-5 text-cyan-400" />;
      default: return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case "critical": return "error" as const;
      case "warning": return "warning" as const;
      case "info": return "neutral" as const;
      default: return "neutral" as const;
    }
  };

  const filteredAlerts = filter ? alerts.filter((a) => a.severity === filter) : alerts;
  const unacknowledged = alerts.filter((a) => a.acknowledged !== "true").length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white text-glow">System Alerts</h1>
          <p className="text-slate-500 mt-1">
            Monitor system notifications and acknowledge resolved alerts.
            {unacknowledged > 0 && <span className="text-cyan-400 font-medium ml-2">{unacknowledged} unacknowledged</span>}
          </p>
        </div>
      </motion.div>

      <div className="flex gap-2">
        {["", "critical", "warning", "info"].map((sev) => (
          <button
            key={sev}
            onClick={() => setFilter(sev)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === sev ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "text-slate-500 border border-white/[0.04] hover:text-slate-300"
            }`}
          >
            {sev ? sev.charAt(0).toUpperCase() + sev.slice(1) : "All"}
          </button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading alerts...</div>
        ) : !filteredAlerts.length ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white">All clear</h3>
            <p className="text-slate-500 mt-1">No system alerts to display.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            <AnimatePresence>
              {filteredAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-5 transition-colors ${alert.acknowledged === "true" ? "opacity-50" : "hover:bg-white/[0.02]"}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      {getSeverityIcon(alert.severity)}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white">{alert.title}</h3>
                          <Badge variant={getSeverityVariant(alert.severity)}>{alert.severity}</Badge>
                          {alert.source && <span className="text-xs text-slate-600 font-mono">{alert.source}</span>}
                        </div>
                        <p className="text-sm text-slate-400">{alert.message}</p>
                        <p className="text-xs text-slate-600">{format(new Date(alert.createdAt), "MMM d, yyyy HH:mm:ss")}</p>
                      </div>
                    </div>
                    {alert.acknowledged !== "true" && (
                      <Button variant="outline" size="sm" onClick={() => acknowledge(alert.id)}>
                        <BellOff className="w-4 h-4 mr-1" />
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>
    </div>
  );
}
