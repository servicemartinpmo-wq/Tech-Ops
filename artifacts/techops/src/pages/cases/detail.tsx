import { useParams, Link } from "wouter";
import { useGetCase, useUpdateCase } from "@workspace/api-client-react";
import { useSseDiagnostic } from "@/hooks/use-sse-diagnostic";
import { Card, Button, Badge } from "@/components/ui";
import { ArrowLeft, Play, Terminal, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CaseDetail() {
  const { id } = useParams();
  const caseId = parseInt(id || "0", 10);
  
  const { data: diagnosticCase, isLoading } = useGetCase(caseId);
  const { mutate: updateCase } = useUpdateCase();
  
  const { runDiagnostic, isRunning, logs } = useSseDiagnostic(caseId);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!diagnosticCase) return <div className="p-8 text-center text-red-500">Case not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <Link href="/cases" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Cases
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">#{diagnosticCase.id}</span>
            <Badge variant={diagnosticCase.status === 'resolved' ? 'success' : 'neutral'}>
              {diagnosticCase.status}
            </Badge>
            {diagnosticCase.diagnosticTier && (
              <Badge variant="default" className="bg-blue-50 text-blue-700 border-blue-200">
                Tier {diagnosticCase.diagnosticTier} Analysis
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900">{diagnosticCase.title}</h1>
          <p className="text-slate-500 mt-2 max-w-3xl leading-relaxed">{diagnosticCase.description || "No description provided."}</p>
        </div>

        <Button 
          size="lg" 
          onClick={runDiagnostic} 
          disabled={isRunning || diagnosticCase.status === 'resolved'}
          className="shadow-xl shadow-primary/20 shrink-0"
        >
          <Play className="w-5 h-5 mr-2" />
          {isRunning ? "Running Pipeline..." : "Run Apphia Pipeline"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Diagnostic Console */}
          <Card className="p-0 overflow-hidden border-slate-200 shadow-sm bg-slate-900 text-slate-300 font-mono text-sm h-[500px] flex flex-col relative">
            <div className="flex items-center gap-2 p-3 bg-slate-950 border-b border-slate-800">
              <Terminal className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-400 text-xs tracking-wider">APPHIA ENGINE // PIPELINE EXECUTION</span>
              {isRunning && <span className="ml-auto flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>}
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
              {logs.length === 0 ? (
                <div className="text-slate-600 italic h-full flex items-center justify-center">
                  Pipeline idle. Ready for execution.
                </div>
              ) : (
                <AnimatePresence>
                  {logs.map((log, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={i} 
                      className={`flex gap-3 ${log.type === 'error' ? 'text-red-400' : log.type === 'complete' ? 'text-green-400' : ''}`}
                    >
                      <span className="text-slate-600 select-none">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                      <div className="flex-1 break-words">
                        {log.type === 'signal' && <span className="text-blue-400 mr-2">➜ EXTRACT:</span>}
                        {log.type === 'udo_path' && <span className="text-purple-400 mr-2">➜ UDO TRAVERSAL:</span>}
                        {log.message}
                        {log.data && (
                          <pre className="mt-1 p-2 bg-slate-950 rounded text-xs text-slate-400 overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              <div ref={logEndRef} />
            </div>
          </Card>

          {/* Results Area */}
          {(diagnosticCase.rootCause || diagnosticCase.resolution) && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-6 bg-gradient-to-br from-white to-slate-50 border-primary/20">
                <h3 className="font-display font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Diagnostic Results
                </h3>
                
                <div className="space-y-4">
                  {diagnosticCase.rootCause && (
                    <div>
                      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">PROBABLE ROOT CAUSE</p>
                      <p className="text-slate-800 bg-white p-3 rounded-lg border shadow-sm">{diagnosticCase.rootCause}</p>
                    </div>
                  )}
                  {diagnosticCase.resolution && (
                    <div>
                      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">RECOMMENDED RESOLUTION</p>
                      <p className="text-slate-800 bg-white p-3 rounded-lg border shadow-sm">{diagnosticCase.resolution}</p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-display font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Metadata</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Created</span>
                <span className="font-medium">{format(new Date(diagnosticCase.createdAt), "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Confidence</span>
                <span className="font-bold text-primary">{diagnosticCase.confidenceScore || 0}%</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-500">Status</span>
                <span className="font-medium capitalize">{diagnosticCase.status.replace("_", " ")}</span>
              </div>
            </div>
          </Card>

          {diagnosticCase.signals && (
            <Card className="p-5 bg-blue-50/50 border-blue-100">
              <h3 className="font-display font-bold text-blue-900 mb-3 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Extracted Signals
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(diagnosticCase.signals).map(([k, v]) => (
                  <span key={k} className="px-2 py-1 bg-white border border-blue-200 text-blue-800 text-xs rounded shadow-sm">
                    {k}: {String(v)}
                  </span>
                ))}
              </div>
            </Card>
          )}
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => updateCase({ id: caseId, data: { status: "resolved" } })}
            disabled={diagnosticCase.status === 'resolved'}
          >
            Mark as Resolved
          </Button>
        </div>
      </div>
    </div>
  );
}
