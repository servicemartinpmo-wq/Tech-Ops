import { useState } from "react";
import { useListAutomationRules, useCreateAutomationRule, useDeleteAutomationRule } from "@workspace/api-client-react";
import { Card, Button, Badge, Input } from "@/components/ui";
import { Cpu, Plus, Trash2, Shield, Play } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function AutomationCenter() {
  const { data: rules, isLoading, refetch } = useListAutomationRules();
  const { mutate: createRule, isPending: isCreating } = useCreateAutomationRule();
  const { mutate: deleteRule } = useDeleteAutomationRule();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", trigger: "alert_high_cpu", action: "restart_service" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRule({ data: { ...formData, permissions: { require_approval: true } } }, {
      onSuccess: () => {
        setIsFormOpen(false);
        setFormData({ name: "", trigger: "alert_high_cpu", action: "restart_service" });
        refetch();
      }
    });
  };

  if (isLoading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white text-glow">Automation Center</h1>
          <p className="text-slate-500 mt-1">Define smart triggers and resolution actions governed by Apphia.</p>
        </div>
        <Button onClick={() => setIsFormOpen(!isFormOpen)}>
          <Plus className="w-4 h-4 mr-2" />
          New Rule
        </Button>
      </motion.div>

      <AnimatePresence>
        {isFormOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="p-6 mb-6 neon-border">
              <h3 className="font-bold text-lg text-white mb-4">Create Automation Rule</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                      <option value="alert_high_cpu">Alert: High CPU Usage</option>
                      <option value="alert_memory_leak">Alert: Memory Leak Detected</option>
                      <option value="connector_down">Event: Connector goes down</option>
                      <option value="case_created">Event: Critical Case Created</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-400 block mb-1.5">Then (Action)</label>
                    <select 
                      className="w-full border border-showroom-border bg-showroom-panel text-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none"
                      value={formData.action}
                      onChange={e => setFormData(p => ({...p, action: e.target.value}))}
                    >
                      <option value="restart_service">Restart Target Service</option>
                      <option value="scale_up">Scale Infrastructure Up</option>
                      <option value="notify_oncall">Page On-call Engineer</option>
                      <option value="run_diagnostic">Run Apphia Diagnostic</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancel</Button>
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
          </Card>
        ) : rules.map((rule, i) => (
          <motion.div key={rule.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-cyan-500/20 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-white text-lg">{rule.name}</h3>
                  <Badge variant={rule.enabled === 'true' ? 'success' : 'neutral'}>
                    {rule.enabled === 'true' ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400 font-mono bg-white/[0.03] p-2 rounded-lg inline-flex border border-white/[0.06]">
                  <span className="text-purple-400 font-semibold">IF</span> {rule.trigger} 
                  <span className="text-cyan-400 font-semibold ml-2">THEN</span> {rule.action}
                </div>
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
        ))}
      </div>
    </div>
  );
}
