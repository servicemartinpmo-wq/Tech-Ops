import { useState, useRef, useCallback } from "react";
import { useCreateCase } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, Button, Input } from "@/components/ui";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Send, X, FileText, ImageIcon, Clock, AlertTriangle, ChevronDown, Monitor, Server, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApiBase } from "@/hooks/use-api-base";

interface FileEntry {
  name: string;
  type: string;
  size: number;
  data: string;
}

const SLA_HOURS: Record<string, number> = { critical: 4, high: 8, medium: 24, low: 72 };
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "text/plain", "application/json", "text/csv"];

const TECH_STACK_OPTIONS = [
  "Node.js", "Python", "Java", "Go", "Ruby", ".NET", "PHP", "Rust",
  "Docker", "Kubernetes", "Terraform", "Ansible",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
  "React", "Vue", "Angular", "Next.js",
  "AWS", "Azure", "GCP", "Cloudflare",
  "Nginx", "Apache", "HAProxy",
  "Kafka", "RabbitMQ", "Jenkins", "GitHub Actions", "GitLab CI",
];

const ACTIVE_SERVICE_OPTIONS = [
  "Web Server", "API Gateway", "Load Balancer", "CDN",
  "Database", "Cache", "Message Queue", "Search Engine",
  "Auth Service", "Email Service", "Payment Gateway",
  "Monitoring", "Logging", "CI/CD Pipeline",
  "DNS", "SSL/TLS", "Firewall", "VPN",
  "Object Storage", "File System", "Backup Service",
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function SubmitCase() {
  const [, setLocation] = useLocation();
  const { mutate: createCase, isPending } = useCreateCase();
  const apiBase = useApiBase();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("");
  const [environment, setEnvironment] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showEnvDetails, setShowEnvDetails] = useState(false);
  const [osInfo, setOsInfo] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [activeServices, setActiveServices] = useState<string[]>([]);
  const [customTech, setCustomTech] = useState("");
  const [customService, setCustomService] = useState("");

  const processFiles = useCallback(async (incoming: FileList | File[]) => {
    setFileError(null);
    const arr = Array.from(incoming);
    const valid: FileEntry[] = [];

    for (const file of arr) {
      if (file.size > MAX_FILE_BYTES) {
        setFileError(`"${file.name}" exceeds 10MB limit.`);
        continue;
      }
      const isAllowed = ALLOWED_TYPES.includes(file.type) || file.name.endsWith(".log");
      if (!isAllowed) {
        setFileError(`"${file.name}" — unsupported format. Use .log, .txt, .json, .png, .jpg.`);
        continue;
      }
      try {
        const data = await fileToBase64(file);
        valid.push({ name: file.name, type: file.type || "text/plain", size: file.size, data });
      } catch {
        setFileError(`Failed to read "${file.name}".`);
      }
    }

    setFiles(prev => {
      const combined = [...prev, ...valid];
      return combined.slice(0, 5);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const toggleTechStack = (item: string) => {
    setTechStack(prev => prev.includes(item) ? prev.filter(t => t !== item) : [...prev, item]);
  };

  const addCustomTech = () => {
    const val = customTech.trim();
    if (val && !techStack.includes(val)) {
      setTechStack(prev => [...prev, val]);
      setCustomTech("");
    }
  };

  const toggleActiveService = (item: string) => {
    setActiveServices(prev => prev.includes(item) ? prev.filter(s => s !== item) : [...prev, item]);
  };

  const addCustomService = () => {
    const val = customService.trim();
    if (val && !activeServices.includes(val)) {
      setActiveServices(prev => [...prev, val]);
      setCustomService("");
    }
  };

  const hasEnvironmentData = osInfo || techStack.length > 0 || activeServices.length > 0 || !!environment;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createCase(
      {
        data: {
          title,
          description,
          priority: priority as "low" | "medium" | "high" | "critical",
          attachments: files.length > 0 ? files : undefined,
        }
      },
      {
        onSuccess: async (data) => {
          if (hasEnvironmentData) {
            try {
              await fetch(`${apiBase}/api/cases/${data.id}/environment`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  osInfo: osInfo || undefined,
                  techStack: techStack.length > 0 ? techStack : undefined,
                  activeServices: activeServices.length > 0 ? activeServices : undefined,
                  environment: environment || undefined,
                }),
              });
            } catch {}
          }
          setLocation(`/cases/${data.id}`);
        }
      }
    );
  };

  const slaHours = SLA_HOURS[priority] ?? 24;
  const priorityColors: Record<string, string> = {
    critical: "text-red-500 bg-red-50 border-red-200",
    high: "text-orange-500 bg-orange-50 border-orange-200",
    medium: "text-sky-500 bg-sky-50 border-sky-200",
    low: "text-slate-500 bg-slate-50 border-slate-200",
  };

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-display font-bold text-slate-900">Submit New Issue</h1>
        <p className="text-slate-400 mt-1 text-sm">Describe the issue and Apphia will begin diagnostic analysis.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-600 font-medium">Issue Title</Label>
              <Input
                placeholder="e.g. Database connection timeout in EU-West cluster"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600 font-medium">Description</Label>
              <Textarea
                placeholder="Provide details about the issue: when it started, affected services, error messages, steps to reproduce..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600 font-medium">Priority</Label>
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
                <Label className="text-slate-600 font-medium">Category</Label>
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
                <Label className="text-slate-600 font-medium">Environment</Label>
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

            {/* SLA badge */}
            <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border text-xs font-medium ${priorityColors[priority]}`}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>SLA target: resolve within <strong>{slaHours} hours</strong> of submission</span>
              {priority === "critical" && (
                <span className="ml-auto flex items-center gap-1 text-red-500">
                  <AlertTriangle className="w-3 h-3" /> Email notification will be sent
                </span>
              )}
            </div>

            {/* Environment Details (optional, collapsible) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowEnvDetails(!showEnvDetails)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center shadow-sm shrink-0">
                  <Monitor className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-display font-bold text-slate-900">Environment Details</h3>
                  <p className="text-[11px] text-slate-500">
                    {hasEnvironmentData
                      ? `${[osInfo, techStack.length > 0 ? `${techStack.length} tech` : "", activeServices.length > 0 ? `${activeServices.length} services` : ""].filter(Boolean).join(" · ")}`
                      : "Optional — helps Apphia provide environment-specific recommendations"}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showEnvDetails ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {showEnvDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
                      <div className="space-y-2">
                        <Label className="text-slate-600 font-medium flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5" /> Operating System
                        </Label>
                        <Select value={osInfo} onValueChange={setOsInfo}>
                          <SelectTrigger><SelectValue placeholder="Select OS" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Linux (Ubuntu)">Linux (Ubuntu)</SelectItem>
                            <SelectItem value="Linux (CentOS/RHEL)">Linux (CentOS/RHEL)</SelectItem>
                            <SelectItem value="Linux (Debian)">Linux (Debian)</SelectItem>
                            <SelectItem value="Linux (Alpine)">Linux (Alpine)</SelectItem>
                            <SelectItem value="Linux (Other)">Linux (Other)</SelectItem>
                            <SelectItem value="macOS">macOS</SelectItem>
                            <SelectItem value="Windows Server">Windows Server</SelectItem>
                            <SelectItem value="Windows">Windows</SelectItem>
                            <SelectItem value="Cloud (Containerized)">Cloud (Containerized)</SelectItem>
                            <SelectItem value="Cloud (Serverless)">Cloud (Serverless)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-600 font-medium flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5" /> Tech Stack
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {TECH_STACK_OPTIONS.map(tech => (
                            <button
                              key={tech}
                              type="button"
                              onClick={() => toggleTechStack(tech)}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                                techStack.includes(tech)
                                  ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium"
                                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                              }`}
                            >
                              {tech}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add custom technology..."
                            value={customTech}
                            onChange={e => setCustomTech(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomTech(); } }}
                            className="text-xs h-8"
                          />
                          <Button type="button" variant="outline" size="sm" onClick={addCustomTech} className="h-8 text-xs shrink-0">
                            Add
                          </Button>
                        </div>
                        {techStack.filter(t => !TECH_STACK_OPTIONS.includes(t)).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {techStack.filter(t => !TECH_STACK_OPTIONS.includes(t)).map(tech => (
                              <span
                                key={tech}
                                className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-300 text-indigo-700 font-medium flex items-center gap-1"
                              >
                                {tech}
                                <button type="button" onClick={() => toggleTechStack(tech)} className="hover:text-red-500">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-600 font-medium flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5" /> Active Services
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {ACTIVE_SERVICE_OPTIONS.map(svc => (
                            <button
                              key={svc}
                              type="button"
                              onClick={() => toggleActiveService(svc)}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                                activeServices.includes(svc)
                                  ? "bg-teal-50 border-teal-300 text-teal-700 font-medium"
                                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                              }`}
                            >
                              {svc}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add custom service..."
                            value={customService}
                            onChange={e => setCustomService(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomService(); } }}
                            className="text-xs h-8"
                          />
                          <Button type="button" variant="outline" size="sm" onClick={addCustomService} className="h-8 text-xs shrink-0">
                            Add
                          </Button>
                        </div>
                        {activeServices.filter(s => !ACTIVE_SERVICE_OPTIONS.includes(s)).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {activeServices.filter(s => !ACTIVE_SERVICE_OPTIONS.includes(s)).map(svc => (
                              <span
                                key={svc}
                                className="text-xs px-2.5 py-1 rounded-full bg-teal-50 border border-teal-300 text-teal-700 font-medium flex items-center gap-1"
                              >
                                {svc}
                                <button type="button" onClick={() => toggleActiveService(svc)} className="hover:text-red-500">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* File attachments */}
            <div className="space-y-3">
              <Label className="text-slate-600 font-medium">Attachments</Label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                  isDragging ? "border-sky-400 bg-sky-50" : "border-slate-200 hover:border-sky-300 hover:bg-sky-50/50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">Drop files here or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">Supports .log, .txt, .json, .png, .jpg · Max 10MB per file · Up to 5 files</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".log,.txt,.json,.png,.jpg,.jpeg,.gif,.webp,.csv"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.length) processFiles(e.target.files); e.target.value = ""; }}
                />
              </div>

              {fileError && (
                <p className="text-xs text-red-500 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" /> {fileError}
                </p>
              )}

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                      {f.type.startsWith("image/") ? (
                        <ImageIcon className="w-4 h-4 text-violet-400 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{f.name}</p>
                        <p className="text-[10px] text-slate-400">{formatBytes(f.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="p-1 rounded hover:bg-slate-200 transition-colors text-slate-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
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
