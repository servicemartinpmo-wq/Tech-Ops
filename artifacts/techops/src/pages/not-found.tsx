import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Cpu, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-md"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-display font-bold text-slate-900">Tech-Ops by Martin PMO</span>
        </div>

        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-slate-100 border border-slate-200 mb-4">
            <Search className="w-9 h-9 text-slate-400" />
          </div>
          <h1 className="text-6xl font-display font-bold text-slate-900 mb-2">404</h1>
          <h2 className="text-xl font-semibold text-slate-700 mb-3">Page not found</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            That page doesn't exist or may have moved. Head back to the dashboard and everything should be right where you left it.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </Link>
          <Link href="/cases">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors">
              View Support Tickets
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
