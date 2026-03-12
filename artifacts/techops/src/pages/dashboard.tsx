import { useGetDashboardStats, useGetRecentActivity } from "@workspace/api-client-react";
import { Card } from "@/components/ui";
import { Activity, AlertCircle, CheckCircle2, Clock, Server, Zap } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ limit: 8 });

  if (statsLoading || activityLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const statCards = [
    { label: "Active Cases", value: stats?.openCases || 0, icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Resolved", value: stats?.resolvedCases || 0, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
    { label: "Avg Resolution", value: stats?.avgResolutionTime ? `${Math.round(stats.avgResolutionTime / 60)}h` : "-", icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Total Handled", value: stats?.totalCases || 0, icon: Activity, color: "text-purple-500", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Platform Overview</h1>
          <p className="text-slate-500 mt-1">Real-time metrics and system health powered by Apphia.</p>
        </div>
        <div className="px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm flex items-center gap-2 text-sm font-medium text-slate-600">
          Plan: <span className="text-primary font-bold capitalize">{stats?.subscriptionTier || 'Free'}</span>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-display font-bold text-slate-900 mt-2">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Connector Health Summary */}
        <Card className="lg:col-span-2 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              Connector Health Matrix
            </h2>
          </div>
          
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="flex gap-12 w-full justify-center">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full border-8 border-green-100 flex items-center justify-center mb-3 mx-auto">
                  <span className="text-3xl font-bold text-green-600">{stats?.connectorHealth.healthy || 0}</span>
                </div>
                <span className="font-medium text-slate-600">Healthy</span>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 rounded-full border-8 border-amber-100 flex items-center justify-center mb-3 mx-auto">
                  <span className="text-3xl font-bold text-amber-500">{stats?.connectorHealth.degraded || 0}</span>
                </div>
                <span className="font-medium text-slate-600">Degraded</span>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 rounded-full border-8 border-red-100 flex items-center justify-center mb-3 mx-auto">
                  <span className="text-3xl font-bold text-red-500">{stats?.connectorHealth.down || 0}</span>
                </div>
                <span className="font-medium text-slate-600">Down</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Activity Feed */}
        <Card className="p-0 overflow-hidden flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-display font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              System Activity
            </h2>
          </div>
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            {!activity?.length ? (
              <p className="text-slate-500 text-center py-8">No recent activity.</p>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {activity.map((item, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={item.id} 
                    className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-sm">
                      <p className="font-medium text-slate-800">{item.message}</p>
                      <time className="text-xs text-slate-400 mt-1 block">
                        {format(new Date(item.timestamp), "MMM d, h:mm a")}
                      </time>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
