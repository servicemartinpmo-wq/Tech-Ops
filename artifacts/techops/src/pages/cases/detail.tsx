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

  if (isLoading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!diagnosticCase) return <div className="p-8 text-center text-red-400">Case not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <Link href="/cases" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-cyan-400 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Cases
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-slate-600 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06]">#{diagnosticCase.id}</span>
            <Badge variant={diagnosticCase.status === 'resolved' ? 'success' : 'neutral'}>
              {diagnosticCase.status}
            </Badge>
            {diagnosticCase.diagnosticTier && (
              <Badge variant="default">Tier {diagnosticCase.diagnosticTier} Analysis</Badge>
            )}
          </div>
          <h1 className="text-3xl font-display font-bold text-white">{diagnosticCase.title}</h1>
          <p className="text-slate-500 mt-2 max-w-3xl leading-relaxed">{diagnosticCase.description || "No description provided."}</p>
        </div>

        <Button 
          size="lg" 
          onClick={runDiagnostic} 
          disabled={isRunning || diagnosticCase.status === 'resolved'}
          className="shadow-xl shadow-cyan-500/20 shrink-0 neon-glow-cyan"
        >
          <Play className="w-5 h-5 mr-2" />
          {isRunning ? "Running Pipeline..." : "Run Apphia Pipeline"}
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden h-[500px] flex flex-col relative">
            <div className="flex items-center gap-2 p-3 bg-black/40 border-b border-white/[0.04]">
              <Terminal className="w-4 h-4 text-slate-600" />
              <span className="font-semibold text-slate-500 text-xs tracking-wider font-mono">APPHIA ENGINE // PIPELINE EXECUTION</span>
              {isRunning && <span className="ml-auto flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>}
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-2 custom-scrollbar bg-[#0a0a10] font-mono text-sm text-slate-400">
              {logs.length === 0 ? (
                <div className="text-slate-700 italic h-full flex items-center justify-center">
                  Pipeline idle. Ready for execution.
                </div>
              ) : (
                <AnimatePresence>
                  {logs.map((log, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={i} 
                      className={`flex gap-3 ${log.type === 'error' ? 'text-red-400' : log.type === 'system_error' ? 'text-amber-400' : log.type === 'complete' ? 'text-emerald-400' : ''}`}
                    >
                      <span className="text-slate-700 select-none">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                      <div className="flex-1 break-words">
                        {log.type === 'signal' && <span className="text-cyan-400 mr-2">EXTRACT:</span>}
                        {log.type === 'udo_path' && <span className="text-purple-400 mr-2">UDO TRAVERSAL:</span>}
                        {log.type === 'system_error' && <span className="text-amber-400 mr-2">⚠ PLATFORM ERROR:</span>}
                        {log.message}
                        {log.data && (
                          <pre className="mt-1 p-2 bg-black/40 rounded text-xs text-slate-500 overflow-x-auto border border-white/[0.03]">
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

          {logs.some((l) => l.type === "system_error") && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-5 bg-amber-50 border-amber-200">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-display font-bold text-amber-800">Platform Error</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      This diagnostic failed due to a platform-side error, not your input. The case has been reset to its previous state and does not count against your quota. You can re-run the diagnostic at no additional cost.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
                      onClick={runDiagnostic}
                      disabled={isRunning}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Retry Diagnostic
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
          {(diagnosticCase.rootCause || diagnosticCase.resolution) && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-6 neon-border">
                <h3 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Diagnostic Results
                </h3>
                <div className="space-y-4">
                  {diagnosticCase.rootCause && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">PROBABLE ROOT CAUSE</p>
                      <p className="text-slate-300 bg-white/[0.03] p-3 rounded-lg border border-white/[0.06]">{diagnosticCase.rootCause}</p>
                    </div>
                  )}
                  {diagnosticCase.resolution && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">RECOMMENDED RESOLUTION</p>
                      <p className="text-slate-300 bg-white/[0.03] p-3 rounded-lg border border-white/[0.06]">{diagnosticCase.resolution}</p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-display font-bold text-white mb-4 text-sm uppercase tracking-wider">Metadata</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-white/[0.04] pb-2">
                <span className="text-slate-500">Created</span>
                <span className="font-medium text-slate-300">{format(new Date(diagnosticCase.createdAt), "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.04] pb-2">
                <span className="text-slate-500">Confidence</span>
                <span className="font-bold text-cyan-400">{diagnosticCase.confidenceScore || 0}%</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-500">Status</span>
                <span className="font-medium capitalize text-slate-300">{diagnosticCase.status.replace("_", " ")}</span>
              </div>
            </div>
          </Card>

          {diagnosticCase.signals && (
            <Card className="p-5 neon-border">
              <h3 className="font-display font-bold text-cyan-400 mb-3 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Extracted Signals
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(diagnosticCase.signals).map(([k, v]) => (
                  <span key={k} className="px-2 py-1 bg-cyan-500/5 border border-cyan-500/10 text-cyan-400 text-xs rounded">
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
