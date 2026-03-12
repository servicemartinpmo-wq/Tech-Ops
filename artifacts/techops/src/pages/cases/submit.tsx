import { useState } from "react";
import { useCreateCase } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, Button, Input } from "@/components/ui";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Send } from "lucide-react";
import { motion } from "framer-motion";

export default function SubmitCase() {
  const [, setLocation] = useLocation();
  const { mutate: createCase, isPending } = useCreateCase();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("");
  const [environment, setEnvironment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createCase(
      { data: { title, description, priority: priority as "low" | "medium" | "high" | "critical" } },
      { onSuccess: (data) => { setLocation(`/cases/${data.id}`); } }
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white text-glow">Submit New Issue</h1>
        <p className="text-slate-500 mt-1">Describe the issue and Apphia will begin diagnostic analysis.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-400">Issue Title</Label>
              <Input
                placeholder="e.g. Database connection timeout in EU-West cluster"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-400">Description</Label>
              <Textarea
                placeholder="Provide details about the issue: when it started, affected services, error messages, steps to reproduce..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="resize-none bg-showroom-panel border-showroom-border text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-cyan-500/10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-400">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-400">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="application">Application</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-400">Environment</Label>
                <Select value={environment} onValueChange={setEnvironment}>
                  <SelectTrigger><SelectValue placeholder="Select environment" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-2 border-dashed border-white/[0.06] rounded-xl p-8 text-center hover:border-cyan-500/20 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-medium">Drop log files, screenshots, or environment snapshots here</p>
              <p className="text-xs text-slate-600 mt-1">Supports .log, .txt, .png, .jpg, .json up to 10MB</p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setLocation("/cases")}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isPending}>
                <Send className="w-4 h-4 mr-2" />
                Submit Issue
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
