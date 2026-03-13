import { useState } from "react";
import { Card, Badge } from "@/components/ui";
import {
  Check, Zap, Shield, Brain, Building2, Gift,
  CreditCard, ChevronRight, ExternalLink, X, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Pricing Tiers ────────────────────────────────────────────────────────────

const PLANS = [
  {
    key: "starter",
    name: "Foundation",
    price: "$75",
    tagline: "Freelancers & solo operators",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    icon: Zap,
    features: [
      "1 concurrent support ticket slot",
      "Apphia help desk — on-demand diagnostics & triage",
      "Remote monitoring & anomaly detection",
      "Automated low-risk fixes & preventive alerts",
      "Plain-language explanations & incident reports",
      "Email escalation support (1–24 hr response)",
    ],
  },
  {
    key: "professional",
    name: "Proactive",
    price: "$250",
    tagline: "Small teams of 2–15 users",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    icon: Brain,
    popular: true,
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
  {
    key: "business",
    name: "Compliance",
    price: "$500",
    tagline: "SMBs of 15–75 users",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: Shield,
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
  {
    key: "enterprise",
    name: "Enterprise",
    price: "Custom",
    tagline: "Large organizations, 75+ users",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: Building2,
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
] as const;

// ── Payment Providers ─────────────────────────────────────────────────────────

const PROVIDERS = [
  {
    id: "zoho",
    name: "Zoho Subscriptions",
    tagline: "Subscription management for growing businesses",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    accent: "#ef4444",
    description: "Zoho Subscriptions is an end-to-end subscription billing platform with built-in dunning management, multi-currency support, and deep Zoho ecosystem integration.",
    features: ["Dunning management", "Multi-currency billing", "Zoho CRM integration", "Revenue recognition reports", "Hosted payment pages"],
    setupUrl: "https://www.zoho.com/subscriptions/",
    configKeys: ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_ORG_ID"],
  },
  {
    id: "billsby",
    name: "Billsby",
    tagline: "Flexible recurring billing & subscription management",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    accent: "#3b82f6",
    description: "Billsby provides powerful subscription management with a focus on flexibility — supporting complex plan configurations, add-ons, and metered billing out of the box.",
    features: ["Complex plan structures", "Add-ons & allowances", "Metered billing", "Self-service customer portal", "Retention tools"],
    setupUrl: "https://www.billsby.com/",
    configKeys: ["BILLSBY_API_KEY", "BILLSBY_COMPANY_DOMAIN"],
  },
  {
    id: "chargebee",
    name: "Chargebee",
    tagline: "Enterprise-grade subscription & revenue management",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    accent: "#f97316",
    description: "Chargebee is a subscription management and recurring billing platform used by thousands of SaaS businesses, with powerful revenue automation and compliance tools.",
    features: ["Revenue recognition (ASC 606)", "Offline payment support", "CPQ & quote-to-cash", "Tax automation (Avalara)", "Multi-entity billing"],
    setupUrl: "https://www.chargebee.com/",
    configKeys: ["CHARGEBEE_API_KEY", "CHARGEBEE_SITE"],
  },
  {
    id: "fastspring",
    name: "FastSpring",
    tagline: "Global SaaS payments & subscription commerce",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    accent: "#22c55e",
    description: "FastSpring is a full-service commerce platform specialising in global software and SaaS sales — handling VAT, GST, and other digital taxes automatically across 200+ countries.",
    features: ["Global tax compliance (VAT/GST)", "200+ currencies", "Localized checkout", "Subscription lifecycle management", "Partner & affiliate management"],
    setupUrl: "https://fastspring.com/",
    configKeys: ["FASTSPRING_API_KEY", "FASTSPRING_STOREFRONT"],
  },
  {
    id: "square",
    name: "Square",
    tagline: "Payments, subscriptions & point of sale",
    color: "text-slate-300",
    bg: "bg-white/5",
    border: "border-white/10",
    accent: "#94a3b8",
    description: "Square offers a unified commerce platform covering in-person payments, online checkout, and subscription billing — ideal if you need both physical and digital payment support.",
    features: ["In-person & online payments", "Recurring billing", "Invoicing & estimates", "Square POS integration", "Team management tools"],
    setupUrl: "https://squareup.com/",
    configKeys: ["SQUARE_ACCESS_TOKEN", "SQUARE_APPLICATION_ID", "SQUARE_LOCATION_ID"],
  },
];

// ── Plan Selection Modal ───────────────────────────────────────────────────────

function PlanModal({ plan, onClose }: { plan: typeof PLANS[number]; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
        className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${plan.bg} border ${plan.border} flex items-center justify-center`}>
              <plan.icon className={`w-5 h-5 ${plan.color}`} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{plan.name}</h3>
              <p className="text-xs text-slate-500">{plan.price}{plan.price !== "Custom" ? "/mo" : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-5">
          To activate the <span className="text-slate-900 font-semibold">{plan.name}</span> plan, connect one of the payment providers below and configure your subscription products.
        </p>
        <div className="space-y-2 mb-5">
          {PROVIDERS.map(p => (
            <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${p.border} ${p.bg}`}>
              <span className={`text-sm font-medium ${p.color}`}>{p.name}</span>
              <Badge variant="warning" className="text-[10px]">Setup Required</Badge>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600">Scroll down to the Payment Providers section to configure your preferred provider.</p>
      </motion.div>
    </motion.div>
  );
}

// ── Provider Detail Modal ─────────────────────────────────────────────────────

function ProviderModal({ provider, onClose }: { provider: typeof PROVIDERS[number]; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
        className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${provider.bg} border ${provider.border}`}>
            <CreditCard className={`w-4 h-4 ${provider.color}`} />
            <span className={`font-bold text-sm ${provider.color}`}>{provider.name}</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-2 mb-4">{provider.tagline}</p>
        <p className="text-sm text-slate-400 mb-5 leading-relaxed">{provider.description}</p>

        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Key Features</p>
          <ul className="space-y-1.5">
            {provider.features.map(f => (
              <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                <Check className={`w-3.5 h-3.5 shrink-0 ${provider.color}`} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Required Secrets</p>
          <p className="text-xs text-slate-500 mb-3">Add these to your Replit Secrets panel, then restart the server:</p>
          <div className="space-y-1.5">
            {provider.configKeys.map(k => (
              <div key={k} className="flex items-center gap-2 font-mono text-xs text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-slate-600">$</span>
                {k}
              </div>
            ))}
          </div>
        </div>

        <a href={provider.setupUrl} target="_blank" rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border ${provider.border} ${provider.color} text-sm font-semibold hover:opacity-80 transition-opacity`}>
          Open {provider.name} Dashboard
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </motion.div>
    </motion.div>
  );
}

// ── Main Billing Page ─────────────────────────────────────────────────────────

export default function Billing() {
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[number] | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<typeof PROVIDERS[number] | null>(null);

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-display font-bold text-slate-900">Simple, Transparent Pricing</h1>
        <p className="text-slate-400 mt-3 text-lg">Scale your autonomous operations engine as your infrastructure grows.</p>
        <div className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <Gift className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">7-Day Free Trial on all paid plans — No credit card required</span>
        </div>
      </motion.div>

      {/* Pricing Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {PLANS.map((plan, i) => (
          <motion.div key={plan.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }} className="flex">
            <Card className={`p-6 relative flex flex-col w-full ${"popular" in plan && plan.popular ? "border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.12)]" : ""}`}>
              {"popular" in plan && plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1 shadow-sm whitespace-nowrap">
                  <Sparkles className="w-3 h-3" /> Most Popular
                </div>
              )}

              <div className="mb-5">
                <div className={`w-10 h-10 rounded-2xl ${plan.bg} border ${plan.border} flex items-center justify-center mb-4`}>
                  <plan.icon className={`w-5 h-5 ${plan.color}`} />
                </div>
                <h3 className="text-xl font-display font-bold text-slate-900">{plan.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{plan.tagline}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-display font-bold text-slate-900">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-slate-500 font-medium mb-1">/mo</span>}
                </div>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-xs text-slate-400">
                    <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${plan.color}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedPlan(plan)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all mt-auto ${
                  plan.key === "enterprise"
                    ? `border ${plan.border} ${plan.color} hover:${plan.bg}`
                    : ("popular" in plan && plan.popular)
                    ? "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                    : "bg-slate-100 hover:bg-slate-100 text-slate-700 border border-slate-200"
                }`}>
                {plan.key === "enterprise" ? "Contact Sales" : "Choose Plan"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Payment Providers */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <div className="flex items-center gap-3 mb-5">
          <CreditCard className="w-5 h-5 text-slate-400" />
          <h2 className="text-xl font-bold text-slate-900">Payment Providers</h2>
          <Badge variant="warning" className="text-xs">Setup Required</Badge>
        </div>
        <p className="text-sm text-slate-500 mb-6 max-w-2xl">
          Connect one of the providers below to activate subscription checkout. Click any provider to see setup instructions and the required credentials.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROVIDERS.map((provider, i) => (
            <motion.button
              key={provider.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.07 }}
              onClick={() => setSelectedProvider(provider)}
              className={`text-left p-5 rounded-2xl border ${provider.border} ${provider.bg} hover:brightness-125 transition-all group`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-2 font-bold text-sm ${provider.color}`}>
                  <CreditCard className="w-4 h-4" />
                  {provider.name}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{provider.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {provider.features.slice(0, 2).map(f => (
                  <span key={f} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 border border-slate-200 text-slate-600">
                    {f}
                  </span>
                ))}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Footer note */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="text-center">
        <div className="inline-flex items-center gap-3 p-4 bg-slate-50 rounded-2xl text-slate-500 border border-slate-100">
          <Shield className="w-5 h-5 text-slate-600" />
          <span className="text-sm font-medium">Payment provider integration in progress · Cancel anytime · No long-term contracts</span>
        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {selectedPlan && <PlanModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />}
        {selectedProvider && <ProviderModal provider={selectedProvider} onClose={() => setSelectedProvider(null)} />}
      </AnimatePresence>
    </div>
  );
}
