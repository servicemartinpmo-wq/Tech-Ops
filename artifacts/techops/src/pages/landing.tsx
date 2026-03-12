import { useAuth } from "@workspace/replit-auth-web";
import { Redirect } from "wouter";
import { Button } from "@/components/ui";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, BarChart3 } from "lucide-react";

export default function Landing() {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden flex flex-col">
      {/* Background */}
      <img 
        src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
        alt="Hero Background" 
        className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none mix-blend-multiply"
      />
      
      {/* Nav */}
      <nav className="relative z-10 px-8 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}images/logo-mark.png`} alt="Logo" className="w-10 h-10 drop-shadow-md" />
          <span className="font-display font-bold text-2xl text-slate-900 tracking-tight">
            Tech-Ops <span className="text-primary">PMO</span>
          </span>
        </div>
        <Button onClick={login} variant="outline" className="bg-white/50 backdrop-blur-sm">
          Sign In
        </Button>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 -mt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm text-sm font-medium text-slate-600 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            Powered by the Apphia Engine
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-8">
            Autonomous tech operations for <span className="text-gradient">modern teams.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Your personal CTO companion. Diagnose issues, monitor connector health, and automate workflows with unprecedented intelligence and precision.
          </p>

          <Button onClick={login} size="lg" className="h-16 px-10 text-lg group rounded-full">
            Enter Dashboard
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-5xl w-full px-4"
        >
          {[
            { icon: Zap, title: "Apphia Diagnostic Engine", desc: "Multi-tier probabilistic root cause analysis that thinks like a systems engineer." },
            { icon: BarChart3, title: "Live Health Polling", desc: "Real-time monitoring of all your critical infrastructure connectors." },
            { icon: ShieldCheck, title: "Automated Resolution", desc: "Secure, permission-governed automation rules that act on your behalf." }
          ].map((feature, i) => (
            <div key={i} className="glass-card p-8 rounded-3xl text-left bg-white/60 hover:bg-white/80 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3 text-slate-900">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
