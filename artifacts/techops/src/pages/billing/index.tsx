import { useListStripeProducts, useGetSubscription, useCreateCheckoutSession, useCreatePortalSession } from "@workspace/api-client-react";
import { Card, Button, Badge } from "@/components/ui";
import { Check, CreditCard, Sparkles, Zap, Shield, Brain, Building2, Gift } from "lucide-react";
import { motion } from "framer-motion";
import { useApiBase } from "@/hooks/use-api-base";

const PLAN_META: Record<string, {
  color: string;
  bg: string;
  border: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  tagline: string;
  mspEquiv?: string;
}> = {
  starter: {
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    icon: Zap,
    tagline: "Freelancers & solo operators",
    mspEquiv: "vs. $100–$150/user MSP basic",
    features: [
      "1 concurrent support ticket slot",
      "Apphia help desk — on-demand diagnostics & triage",
      "Remote monitoring & anomaly detection",
      "Automated low-risk fixes & preventive alerts",
      "Plain-language explanations & incident reports",
      "Email escalation support (1–24 hr response)",
    ],
  },
  professional: {
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    icon: Brain,
    tagline: "Small teams of 2–15 users",
    mspEquiv: "vs. $150–$225/user MSP standard",
    features: [
      "2 concurrent support ticket slots",
      "Everything in Foundation",
      "Advanced cybersecurity monitoring & threat response",
      "Cloud management (Google Workspace, AWS, Azure)",
      "Automated backup verification & integrity checks",
      "Slack, Zapier & full integration suite",
      "Priority email support (1–8 hr response)",
    ],
  },
  business: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: Shield,
    tagline: "SMBs of 15–75 users",
    mspEquiv: "vs. $250–$350+/user MSP compliance",
    features: [
      "5 concurrent support ticket slots",
      "Everything in Proactive",
      "HIPAA / FINRA compliance auditing & reporting",
      "High-risk action approvals with audit trail",
      "24/7 continuous monitoring & escalation",
      "Full connector & API lifecycle management",
      "Personalized Apphia Engine configuration",
    ],
  },
  enterprise: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: Building2,
    tagline: "Large organizations, 75+ users",
    features: [
      "Unlimited concurrent ticket slots",
      "Private Apphia Engine license",
      "Custom compliance frameworks (SOC 2, ISO 27001)",
      "Dedicated account & integration engineering",
      "Custom workflows, connectors & playbooks",
      "SLA-backed support with < 1 hr response",
      "Optional on-call accelerated response",
    ],
  },
};

const FALLBACK_PLANS = [
  { name: "Foundation", price: "$149", popular: false, key: "starter" },
  { name: "Proactive", price: "$349", popular: true, key: "professional" },
  { name: "Compliance", price: "$749", popular: false, key: "business" },
  { name: "Enterprise", price: "Custom", popular: false, key: "enterprise" },
];

export default function Billing() {
  const { data: productsRes, isLoading: productsLoading } = useListStripeProducts();
  const { data: subRes, isLoading: subLoading } = useGetSubscription();
  const { mutate: checkout, isPending: isCheckingOut } = useCreateCheckoutSession();
  const { mutate: portal, isPending: isPortalLoading } = useCreatePortalSession();

  if (productsLoading || subLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,240,255,0.3)]" />
      </div>
    );
  }

  const currentTier = subRes?.tier || "free";
  const products = productsRes?.data || [];

  const handleSubscribe = (priceId: string) => {
    checkout({ data: { priceId } }, {
      onSuccess: (res) => { window.location.href = res.url; }
    });
  };

  const handleManage = () => {
    portal(undefined, {
      onSuccess: (res) => { window.location.href = res.url; }
    });
  };

  const plansToRender = products.length > 0
    ? products.map(p => {
        const key = p.name.toLowerCase().replace(/\s+/g, "");
        const meta = PLAN_META[key] || PLAN_META.starter;
        const price = p.prices[0];
        return { id: p.id, name: p.name, price, description: p.description, meta, key };
      })
    : FALLBACK_PLANS.map(fp => {
        const meta = PLAN_META[fp.key] || PLAN_META.starter;
        return { id: fp.key, name: fp.name, price: null, description: null, meta, key: fp.key, fallbackPrice: fp.price, popular: fp.popular };
      });

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-display font-bold text-white text-glow">Simple, Transparent Pricing</h1>
        <p className="text-slate-400 mt-3 text-lg">Scale your autonomous operations engine as your infrastructure grows.</p>

        <div className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <Gift className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">7-Day Free Trial on all paid plans — No credit card required</span>
        </div>

        {subRes?.subscription && (
          <div className="mt-5 inline-flex items-center gap-3 p-2 pr-4 bg-cyan-500/10 border border-cyan-500/20 rounded-full ml-4">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-cyan-400">Active Plan: <span className="font-bold capitalize">{currentTier}</span></span>
            <Button size="sm" variant="outline" className="ml-4 h-8 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10" onClick={handleManage} isLoading={isPortalLoading}>
              Manage Billing
            </Button>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plansToRender.map((plan, i) => {
          const isCurrent = plan.name.toLowerCase().includes(currentTier.toLowerCase());
          const isPopular = plan.name.toLowerCase().includes("professional");
          const meta = plan.meta;
          const MetaIcon = meta.icon;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex"
            >
              <Card className={`p-6 relative flex flex-col w-full ${isPopular ? `border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.12)]` : ""}`}>
                {isPopular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </div>
                )}

                <div className="mb-5">
                  <div className={`w-10 h-10 rounded-2xl ${meta.bg} border ${meta.border} flex items-center justify-center mb-4`}>
                    <MetaIcon className={`w-5 h-5 ${meta.color}`} />
                  </div>
                  <h3 className="text-xl font-display font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{meta.tagline}</p>
                </div>

                <div className="mb-6">
                  {"fallbackPrice" in plan && plan.fallbackPrice ? (
                    <div className="space-y-1.5">
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-display font-bold text-white">{plan.fallbackPrice}</span>
                        {plan.fallbackPrice !== "Custom" && <span className="text-slate-500 font-medium mb-1">/mo</span>}
                      </div>
                      {meta.mspEquiv && (
                        <p className="text-[10px] font-semibold tracking-wide text-slate-600 uppercase">{meta.mspEquiv}</p>
                      )}
                    </div>
                  ) : plan.price ? (
                    <div className="space-y-1.5">
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-display font-bold text-white">
                          {plan.price.unitAmount != null ? `$${Math.round(plan.price.unitAmount / 100)}` : "Custom"}
                        </span>
                        {plan.price.unitAmount != null && <span className="text-slate-500 font-medium mb-1">/mo</span>}
                      </div>
                      {meta.mspEquiv && (
                        <p className="text-[10px] font-semibold tracking-wide text-slate-600 uppercase">{meta.mspEquiv}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-4xl font-display font-bold text-white">—</span>
                  )}
                </div>

                <ul className="space-y-2 flex-1 mb-6">
                  {meta.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-xs text-slate-400">
                      <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${meta.color}`} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  {isCurrent ? (
                    <Button className="w-full bg-white/5 text-slate-500 cursor-default hover:bg-white/5 border-white/[0.06] shadow-none" disabled>
                      Current Plan
                    </Button>
                  ) : plan.name.toLowerCase() === "enterprise" ? (
                    <Button className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10" variant="outline">
                      Contact Sales
                    </Button>
                  ) : plan.price ? (
                    <Button
                      className={`w-full ${isPopular ? "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.25)]" : ""}`}
                      variant={isPopular ? "primary" : "secondary"}
                      onClick={() => handleSubscribe(plan.price!.id)}
                      isLoading={isCheckingOut}
                    >
                      Start Free Trial
                    </Button>
                  ) : (
                    <Button className="w-full" variant="secondary">
                      Start Free Trial
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="p-6 border-white/[0.05]">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            Platform Service Rules
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-500">
            {[
              { icon: Brain, title: "Apphia-First Support", desc: "Apphia handles the vast majority of issues autonomously — human escalation is the exception, not the rule." },
              { icon: Zap, title: "Email Support Included", desc: "All plans include email support with 1–24 hr response depending on complexity and tier." },
              { icon: Shield, title: "Predictive Monitoring", desc: "Continuous monitoring reduces incidents before they require escalation, saving time and cost." },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <item.icon className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-slate-300 text-xs mb-0.5">{item.title}</p>
                  <p className="text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      <div className="text-center">
        <div className="inline-flex items-center gap-3 p-4 bg-white/[0.03] rounded-2xl text-slate-500 border border-white/[0.06]">
          <CreditCard className="w-5 h-5 text-slate-600" />
          <span className="font-medium text-sm">Secure payments powered by Stripe · Cancel anytime · No long-term contracts</span>
        </div>
      </div>
    </div>
  );
}
