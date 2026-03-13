import { useState, useRef, useCallback } from "react";
import { useCreateCase } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, Button, Input } from "@/components/ui";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Send, X, FileText, ImageIcon, Clock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface FileEntry {
  name: string;
  type: string;
  size: number;
  data: string;
}

const SLA_HOURS: Record<string, number> = { critical: 4, high: 8, medium: 24, low: 72 };
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "text/plain", "application/json", "text/csv"];

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("");
  const [environment, setEnvironment] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
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
      { onSuccess: (data) => { setLocation(`/cases/${data.id}`); } }
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
