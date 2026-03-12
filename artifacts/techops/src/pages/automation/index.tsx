import { useState } from "react";
import { useListAutomationRules, useCreateAutomationRule, useDeleteAutomationRule } from "@workspace/api-client-react";
import { Card, Button, Badge, Input } from "@/components/ui";
import { Cpu, Plus, Trash2, Shield, Wand2, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TRIGGER_OPTIONS = [
  { value: "alert_high_cpu", label: "Alert: High CPU Usage", description: "Fires when CPU exceeds 85% for 5 continuous minutes" },
  { value: "alert_memory_leak", label: "Alert: Memory Leak Detected", description: "Fires when available memory drops below 10% threshold" },
  { value: "connector_down", label: "Event: Connector Goes Down", description: "Fires immediately when any monitored connector stops responding" },
  { value: "case_created", label: "Event: Critical Case Created", description: "Fires when a high or critical priority case is opened" },
  { value: "disk_space_low", label: "Alert: Low Disk Space", description: "Fires when disk usage exceeds 90% on any monitored volume" },
  { value: "response_time_spike", label: "Alert: Response Time Spike", description: "Fires when API response time exceeds 2x baseline for 3+ minutes" },
];

const ACTION_OPTIONS = [
  { value: "restart_service", label: "Restart Target Service", description: "Gracefully restart the affected service or container" },
  { value: "scale_up", label: "Scale Infrastructure Up", description: "Add compute capacity to handle the load spike" },
  { value: "notify_oncall", label: "Page On-call Engineer", description: "Send PagerDuty/Slack alert to the on-call rotation" },
  { value: "run_diagnostic", label: "Run Apphia Diagnostic", description: "Launch full 7-stage Apphia pipeline on the affected system" },
  { value: "collect_logs", label: "Collect & Archive Logs", description: "Capture system logs, ship to storage, and attach to the case" },
  { value: "failover", label: "Trigger Failover", description: "Redirect traffic to the secondary endpoint or region" },
];

const NLP_EXAMPLES = [
  "Restart the API server when CPU is above 80%",
  "Page the engineer whenever a connector goes offline",
  "Run a diagnostic when a critical case is created",
  "Scale up servers if memory is low",
];

function matchNlp(prompt: string): { name: string; trigger: string; action: string } | null {
  const p = prompt.toLowerCase();

  let trigger = "alert_high_cpu";
  let action = "restart_service";

  if (p.includes("cpu") || p.includes("processor")) trigger = "alert_high_cpu";
  else if (p.includes("memory") || p.includes("mem") || p.includes("ram")) trigger = "alert_memory_leak";
  else if (p.includes("connector") || p.includes("offline") || p.includes("down")) trigger = "connector_down";
  else if (p.includes("case") || p.includes("critical") || p.includes("ticket")) trigger = "case_created";
  else if (p.includes("disk") || p.includes("storage") || p.includes("space")) trigger = "disk_space_low";
  else if (p.includes("slow") || p.includes("response") || p.includes("latency")) trigger = "response_time_spike";

  if (p.includes("restart") || p.includes("reboot") || p.includes("reset")) action = "restart_service";
  else if (p.includes("scale") || p.includes("capacity") || p.includes("more server")) action = "scale_up";
  else if (p.includes("page") || p.includes("notify") || p.includes("alert") || p.includes("engineer") || p.includes("oncall")) action = "notify_oncall";
  else if (p.includes("diagnos") || p.includes("apphia") || p.includes("investigat")) action = "run_diagnostic";
  else if (p.includes("log") || p.includes("collect") || p.includes("archive")) action = "collect_logs";
  else if (p.includes("failover") || p.includes("redirect") || p.includes("backup")) action = "failover";

  const name = prompt.length > 60 ? prompt.slice(0, 57).trim() + "..." : prompt.trim();
  return { name, trigger, action };
}

export default function AutomationCenter() {
  const { data: rules, isLoading, refetch } = useListAutomationRules();
  const { mutate: createRule, isPending: isCreating } = useCreateAutomationRule();
  const { mutate: deleteRule } = useDeleteAutomationRule();
  
  const [mode, setMode] = useState<"none" | "nlp" | "manual">("none");
  const [nlpPrompt, setNlpPrompt] = useState("");
  const [nlpResult, setNlpResult] = useState<{ name: string; trigger: string; action: string } | null>(null);
  const [formData, setFormData] = useState({ name: "", trigger: "alert_high_cpu", action: "restart_service" });

  const handleNlpTranslate = () => {
    const result = matchNlp(nlpPrompt);
    if (result) setNlpResult(result);
  };

  const handleNlpCreate = () => {
    if (!nlpResult) return;
    createRule(
      { data: { name: nlpResult.name, trigger: nlpResult.trigger, action: nlpResult.action, permissions: { require_approval: true } } },
      { onSuccess: () => { setMode("none"); setNlpPrompt(""); setNlpResult(null); refetch(); } }
    );
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRule({ data: { ...formData, permissions: { require_approval: true } } }, {
      onSuccess: () => {
        setMode("none");
        setFormData({ name: "", trigger: "alert_high_cpu", action: "restart_service" });
        refetch();
      }
    });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white text-glow">Automation Center</h1>
          <p className="text-slate-500 mt-1">Define smart triggers in plain English — Apphia translates them for you.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setMode(mode === "nlp" ? "none" : "nlp")}>
            <Wand2 className="w-4 h-4 mr-2" />
            Describe in English
          </Button>
          <Button onClick={() => setMode(mode === "manual" ? "none" : "manual")}>
            <Plus className="w-4 h-4 mr-2" />
            Manual Rule
          </Button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {mode === "nlp" && (
          <motion.div key="nlp" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="p-6 neon-border">
              <div className="flex items-center gap-2 mb-4">
                <Wand2 className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-lg text-white">Natural Language Rule Creator</h3>
              </div>
              <p className="text-sm text-slate-400 mb-4">Describe your automation in plain language — Apphia will translate it into a configured rule.</p>

              <div className="flex gap-2 mb-4 flex-wrap">
                {NLP_EXAMPLES.map(ex => (
                  <button
                    key={ex}
                    onClick={() => { setNlpPrompt(ex); setNlpResult(null); }}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white hover:border-purple-500/30 hover:bg-purple-500/5 transition-all"
                  >
                    "{ex}"
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Input
                  value={nlpPrompt}
                  onChange={e => { setNlpPrompt(e.target.value); setNlpResult(null); }}
                  placeholder="e.g. Send an alert to the engineer when a connector goes offline"
                  className="flex-1"
                  onKeyDown={e => e.key === "Enter" && handleNlpTranslate()}
                />
                <Button onClick={handleNlpTranslate} disabled={!nlpPrompt.trim()} variant="secondary">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Translate
                </Button>
              </div>

              <AnimatePresence>
                {nlpResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3">Apphia Interpretation</p>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-16">Name:</span>
                        <span className="text-white font-medium">{nlpResult.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-16">IF:</span>
                        <code className="text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded text-xs">
                          {TRIGGER_OPTIONS.find(t => t.value === nlpResult.trigger)?.label || nlpResult.trigger}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-16">THEN:</span>
                        <code className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded text-xs">
                          {ACTION_OPTIONS.find(a => a.value === nlpResult.action)?.label || nlpResult.action}
                        </code>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleNlpCreate} isLoading={isCreating} size="sm">
                        Create This Rule
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setNlpResult(null)}>Adjust</Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}

        {mode === "manual" && (
          <motion.div key="manual" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="p-6 mb-6 neon-border">
              <h3 className="font-bold text-lg text-white mb-4">Create Automation Rule</h3>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-400 block mb-1.5">Rule Name</label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData(p => ({...p, name: e.target.value}))} 
                    placeholder="e.g. Auto-restart stale workers"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-400 block mb-1.5">When (Trigger)</label>
                    <select 
                      className="w-full border border-showroom-border bg-showroom-panel text-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none"
                      value={formData.trigger}
                      onChange={e => setFormData(p => ({...p, trigger: e.target.value}))}
                    >
                      {TRIGGER_OPTIONS.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-600 mt-1">
                      {TRIGGER_OPTIONS.find(t => t.value === formData.trigger)?.description}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-400 block mb-1.5">Then (Action)</label>
                    <select 
                      className="w-full border border-showroom-border bg-showroom-panel text-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none"
                      value={formData.action}
                      onChange={e => setFormData(p => ({...p, action: e.target.value}))}
                    >
                      {ACTION_OPTIONS.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-600 mt-1">
                      {ACTION_OPTIONS.find(a => a.value === formData.action)?.description}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <Button type="button" variant="ghost" onClick={() => setMode("none")}>Cancel</Button>
                  <Button type="submit" isLoading={isCreating}>Save Rule</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {!rules?.length ? (
          <Card className="p-12 text-center border-dashed border-2 border-white/[0.06]">
            <Cpu className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="font-medium text-slate-500">No automation rules configured.</p>
            <p className="text-sm text-slate-600 mt-1">Describe a rule in plain English or create one manually above.</p>
          </Card>
        ) : rules.map((rule, i) => {
          const triggerInfo = TRIGGER_OPTIONS.find(t => t.value === rule.trigger);
          const actionInfo = ACTION_OPTIONS.find(a => a.value === rule.action);
          return (
            <motion.div key={rule.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-cyan-500/20 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-white text-lg">{rule.name}</h3>
                    <Badge variant={rule.enabled === 'true' ? 'success' : 'neutral'}>
                      {rule.enabled === 'true' ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <div className="flex items-center gap-2 bg-white/[0.03] p-2 rounded-lg border border-white/[0.06]">
                      <span className="text-purple-400 font-semibold text-xs">IF</span>
                      <span className="text-slate-300 text-xs">{triggerInfo?.label || rule.trigger}</span>
                    </div>
                    <span className="text-slate-600">→</span>
                    <div className="flex items-center gap-2 bg-white/[0.03] p-2 rounded-lg border border-white/[0.06]">
                      <span className="text-cyan-400 font-semibold text-xs">THEN</span>
                      <span className="text-slate-300 text-xs">{actionInfo?.label || rule.action}</span>
                    </div>
                  </div>
                  {triggerInfo && <p className="text-xs text-slate-600 mt-2">{triggerInfo.description}</p>}
                </div>
                
                <div className="flex items-center gap-6 shrink-0 border-t md:border-t-0 md:border-l border-white/[0.04] pt-4 md:pt-0 md:pl-6">
                  <div className="text-sm">
                    <p className="text-slate-600 mb-1 flex items-center gap-1"><Shield className="w-3.5 h-3.5"/> Governance</p>
                    <p className="font-medium text-slate-300">Requires Approval</p>
                  </div>
                  <div className="text-sm text-right">
                    <p className="text-slate-600 mb-1">Executions</p>
                    <p className="font-bold text-white">{rule.executionCount || 0}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="text-red-400 hover:bg-red-500/10 hover:text-red-300 h-10 w-10 p-0"
                    onClick={() => deleteRule({ id: rule.id }, { onSuccess: () => refetch() })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
