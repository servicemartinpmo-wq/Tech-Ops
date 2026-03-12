import { useListCases } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, Badge } from "@/components/ui";
import { format } from "date-fns";
import { CheckCircle2, TrendingUp } from "lucide-react";

export default function ResolvedCases() {
  const { data: cases, isLoading } = useListCases({ status: "resolved" });

  const avgConfidence = cases?.length
    ? Math.round(
        cases.reduce((sum, c) => sum + (c.confidenceScore || 0), 0) / cases.length
      )
    : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Resolved Cases</h1>
          <p className="text-slate-500 mt-1">Review completed diagnostics and their outcomes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 bg-gradient-to-br from-green-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{cases?.length || 0}</p>
              <p className="text-sm text-slate-500">Total Resolved</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{avgConfidence}%</p>
              <p className="text-sm text-slate-500">Avg. Confidence</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading resolved cases...</div>
        ) : !cases?.length ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No resolved cases yet</h3>
            <p className="text-slate-500 mt-1">Cases will appear here after Apphia completes diagnostics.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {cases.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`} className="block hover:bg-slate-50/80 transition-colors p-5 group">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400">#{c.id.toString().padStart(4, "0")}</span>
                      <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{c.title}</h3>
                      <Badge variant="success">Resolved</Badge>
                    </div>
                    {c.rootCause && (
                      <p className="text-sm text-slate-500 truncate max-w-2xl">
                        <span className="font-medium text-slate-700">Root Cause:</span> {c.rootCause}
                      </p>
                    )}
                    {c.resolution && (
                      <p className="text-sm text-slate-500 truncate max-w-2xl">
                        <span className="font-medium text-slate-700">Resolution:</span> {c.resolution}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-400">{format(new Date(c.createdAt), "MMM d, yyyy")}</p>
                    {c.confidenceScore !== null && c.confidenceScore !== undefined && (
                      <p className="text-xs font-bold text-green-600 mt-1">{c.confidenceScore}% Confidence</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
