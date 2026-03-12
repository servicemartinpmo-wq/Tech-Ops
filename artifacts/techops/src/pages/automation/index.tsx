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

  if (isLoading) return <div className="p-12 text-center">Loading rules...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Automation Center</h1>
          <p className="text-slate-500 mt-1">Define smart triggers and resolution actions governed by Apphia.</p>
        </div>
        <Button onClick={() => setIsFormOpen(!isFormOpen)}>
          <Plus className="w-4 h-4 mr-2" />
          New Rule
        </Button>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="p-6 mb-6 border-primary/20 shadow-md">
              <h3 className="font-bold text-lg mb-4">Create Automation Rule</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Rule Name</label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData(p => ({...p, name: e.target.value}))} 
                    placeholder="e.g. Auto-restart stale workers"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">When (Trigger)</label>
                    <select 
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
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
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Then (Action)</label>
                    <select 
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
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
          <Card className="p-12 text-center bg-slate-50 border-dashed border-2">
            <Cpu className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="font-medium text-slate-600">No automation rules configured.</p>
          </Card>
        ) : rules.map((rule) => (
          <Card key={rule.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-primary/30 transition-colors">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-bold text-slate-900 text-lg">{rule.name}</h3>
                <Badge variant={rule.enabled === 'true' ? 'success' : 'neutral'}>
                  {rule.enabled === 'true' ? 'Active' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 font-mono bg-slate-50 p-2 rounded-lg inline-flex border">
                <span className="text-purple-600 font-semibold">IF</span> {rule.trigger} 
                <span className="text-blue-600 font-semibold ml-2">THEN</span> {rule.action}
              </div>
            </div>
            
            <div className="flex items-center gap-6 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
              <div className="text-sm">
                <p className="text-slate-500 mb-1 flex items-center gap-1"><Shield className="w-3.5 h-3.5"/> Governance</p>
                <p className="font-medium text-slate-800">Requires Approval</p>
              </div>
              <div className="text-sm text-right">
                <p className="text-slate-500 mb-1">Executions</p>
                <p className="font-bold text-slate-900">{rule.executionCount || 0}</p>
              </div>
              <Button 
                variant="ghost" 
                className="text-red-500 hover:bg-red-50 hover:text-red-700 h-10 w-10 p-0"
                onClick={() => deleteRule({ id: rule.id }, { onSuccess: () => refetch() })}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
