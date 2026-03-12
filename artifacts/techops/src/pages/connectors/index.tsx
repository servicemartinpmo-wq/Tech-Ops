import { useListConnectorHealth, usePollConnectorHealth } from "@workspace/api-client-react";
import { Card, Button, Badge } from "@/components/ui";
import { RefreshCw, Server, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function Connectors() {
  const { data: connectors, isLoading, refetch } = useListConnectorHealth();
  const { mutate: poll, isPending: isPolling } = usePollConnectorHealth();

  const handlePoll = (name: string) => {
    poll({ name }, { onSuccess: () => refetch() });
  };

  if (isLoading) return <div className="p-12 text-center">Loading connectors...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Infrastructure Health</h1>
          <p className="text-slate-500 mt-1">Live monitoring of your integrated systems.</p>
        </div>
        <Button variant="secondary" onClick={() => refetch()} className="bg-white">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {connectors?.map((conn) => {
          const StatusIcon = conn.status === 'healthy' ? CheckCircle2 : conn.status === 'degraded' ? AlertCircle : XCircle;
          const statusColor = conn.status === 'healthy' ? 'text-green-500' : conn.status === 'degraded' ? 'text-amber-500' : 'text-red-500';
          const bgColor = conn.status === 'healthy' ? 'bg-green-50' : conn.status === 'degraded' ? 'bg-amber-50' : 'bg-red-50';

          return (
            <Card key={conn.id} className="p-6 flex flex-col bg-white">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColor}`}>
                    <Server className={`w-5 h-5 ${statusColor}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{conn.connectorName}</h3>
                    <Badge variant={conn.status === 'healthy' ? 'success' : conn.status === 'degraded' ? 'warning' : 'error'} className="mt-1 uppercase text-[10px]">
                      {conn.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm mt-4 flex-1">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Response Time</span>
                  <span className="font-mono font-medium">{conn.responseTime ? `${conn.responseTime}ms` : '-'}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-slate-500">Last Checked</span>
                  <span className="font-medium">{format(new Date(conn.lastChecked), "h:mm:ss a")}</span>
                </div>
                {conn.errorMessage && (
                  <div className="p-2 bg-red-50 text-red-700 text-xs rounded border border-red-100 mt-2">
                    {conn.errorMessage}
                  </div>
                )}
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4" 
                onClick={() => handlePoll(conn.connectorName)}
                disabled={isPolling}
              >
                Poll Now
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
