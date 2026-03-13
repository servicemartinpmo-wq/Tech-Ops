import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui";
import {
  Globe, Palette, LayoutGrid, Eye, Rocket, Plus, Trash2,
  Check, ChevronRight, ChevronLeft, Monitor, Tablet, Smartphone,
  Download, Copy, RefreshCw, GripVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ────────────────────────────────────────────────────────────────────

interface ColorScheme { primary: string; secondary: string; bg: string; accent: string; }
interface FeatureItem { icon: string; title: string; desc: string; }
interface SiteConfig {
  templateId: string;
  siteName: string;
  tagline: string;
  heroHeadline: string;
  heroSubtext: string;
  ctaText: string;
  ctaSecondaryText: string;
  aboutTitle: string;
  aboutBody: string;
  contactEmail: string;
  contactPhone: string;
  features: FeatureItem[];
  colorScheme: ColorScheme;
  fontPair: string;
  pages: Array<{ id: string; name: string; slug: string; locked?: boolean }>;
  activeSections: string[];
}

// ── Templates ─────────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: "tech-pro",
    name: "Tech Pro",
    category: "Technology",
    desc: "Clean, authoritative layout for tech companies and SaaS products.",
    previewBg: "from-sky-500 to-indigo-600",
    accentDot: "bg-sky-400",
    defaultColors: { primary: "#0ea5e9", secondary: "#6366f1", bg: "#ffffff", accent: "#0284c7" },
  },
  {
    id: "minimal-studio",
    name: "Minimal Studio",
    category: "Agency / Portfolio",
    desc: "Refined whitespace and bold typography for agencies and creatives.",
    previewBg: "from-slate-800 to-slate-950",
    accentDot: "bg-white",
    defaultColors: { primary: "#1e293b", secondary: "#475569", bg: "#fafafa", accent: "#0f172a" },
  },
  {
    id: "bold-launch",
    name: "Bold Launch",
    category: "Startup",
    desc: "High-impact hero and conversion-focused sections for product launches.",
    previewBg: "from-violet-600 to-fuchsia-600",
    accentDot: "bg-fuchsia-300",
    defaultColors: { primary: "#7c3aed", secondary: "#c026d3", bg: "#ffffff", accent: "#6d28d9" },
  },
  {
    id: "warm-business",
    name: "Warm Business",
    category: "Local Business",
    desc: "Approachable, warm tones for service businesses and local brands.",
    previewBg: "from-amber-400 to-orange-500",
    accentDot: "bg-amber-200",
    defaultColors: { primary: "#f59e0b", secondary: "#ea580c", bg: "#fffbf5", accent: "#d97706" },
  },
  {
    id: "creative-portfolio",
    name: "Creative Portfolio",
    category: "Portfolio",
    desc: "Expressive, colorful layout that puts your work front and center.",
    previewBg: "from-emerald-400 to-teal-600",
    accentDot: "bg-emerald-200",
    defaultColors: { primary: "#10b981", secondary: "#0d9488", bg: "#f0fdf4", accent: "#059669" },
  },
  {
    id: "saas-platform",
    name: "SaaS Platform",
    category: "SaaS",
    desc: "Feature-rich sections optimized for software products and platforms.",
    previewBg: "from-rose-500 to-pink-600",
    accentDot: "bg-rose-200",
    defaultColors: { primary: "#f43f5e", secondary: "#ec4899", bg: "#ffffff", accent: "#e11d48" },
  },
];

const FONT_PAIRS = [
  { id: "inter", label: "Inter", preview: "Clean & Modern", css: "'Inter', sans-serif" },
  { id: "playfair", label: "Playfair Display", preview: "Elegant & Editorial", css: "'Playfair Display', serif" },
  { id: "space-grotesk", label: "Space Grotesk", preview: "Tech & Geometric", css: "'Space Grotesk', sans-serif" },
  { id: "dm-serif", label: "DM Serif", preview: "Warm & Approachable", css: "'DM Serif Display', serif" },
];

const COLOR_PRESETS: Array<{ name: string; scheme: ColorScheme }> = [
  { name: "Ocean", scheme: { primary: "#0ea5e9", secondary: "#6366f1", bg: "#ffffff", accent: "#0284c7" } },
  { name: "Violet", scheme: { primary: "#7c3aed", secondary: "#c026d3", bg: "#ffffff", accent: "#6d28d9" } },
  { name: "Emerald", scheme: { primary: "#10b981", secondary: "#0d9488", bg: "#f0fdf4", accent: "#059669" } },
  { name: "Amber", scheme: { primary: "#f59e0b", secondary: "#ea580c", bg: "#fffbf5", accent: "#d97706" } },
  { name: "Rose", scheme: { primary: "#f43f5e", secondary: "#ec4899", bg: "#ffffff", accent: "#e11d48" } },
  { name: "Slate", scheme: { primary: "#1e293b", secondary: "#475569", bg: "#fafafa", accent: "#0f172a" } },
];

const DEFAULT_FEATURES: FeatureItem[] = [
  { icon: "⚡", title: "Lightning Fast", desc: "Optimised for performance so your visitors get results instantly." },
  { icon: "🛡️", title: "Secure by Default", desc: "Industry-grade security built in from the ground up." },
  { icon: "🔗", title: "Easy Integrations", desc: "Connect the tools you already use in a few clicks." },
];

const SECTIONS = ["hero", "features", "about", "contact"];

const defaultConfig = (templateId = "tech-pro"): SiteConfig => {
  const tpl = TEMPLATES.find(t => t.id === templateId) ?? TEMPLATES[0];
  return {
    templateId,
    siteName: "My Business",
    tagline: "Your tagline goes here",
    heroHeadline: "The Future of Your Industry, Today",
    heroSubtext: "We help businesses grow faster with smarter tools and expert support. Start your free trial — no credit card needed.",
    ctaText: "Get Started Free",
    ctaSecondaryText: "See How It Works",
    aboutTitle: "About Us",
    aboutBody: "We're a passionate team dedicated to delivering exceptional results. Our approach combines deep expertise with cutting-edge tools to solve your toughest challenges.",
    contactEmail: "hello@yourbusiness.com",
    contactPhone: "+1 (555) 000-0000",
    features: DEFAULT_FEATURES,
    colorScheme: tpl.defaultColors,
    fontPair: "inter",
    pages: [
      { id: "home", name: "Home", slug: "/", locked: true },
      { id: "about", name: "About", slug: "/about" },
      { id: "contact", name: "Contact", slug: "/contact" },
    ],
    activeSections: ["hero", "features", "about", "contact"],
  };
};

// ── HTML Generator ────────────────────────────────────────────────────────────

function generateHTML(cfg: SiteConfig): string {
  const fontUrl = cfg.fontPair === "inter"
    ? "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
    : cfg.fontPair === "playfair"
    ? "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&display=swap"
    : cfg.fontPair === "space-grotesk"
    ? "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
    : "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap";

  const fontFamily = FONT_PAIRS.find(f => f.id === cfg.fontPair)?.css ?? "'Inter', sans-serif";
  const { primary, bg, accent } = cfg.colorScheme;

  const navLinks = cfg.pages.map(p =>
    `<a href="${p.slug}" style="margin: 0 16px; color: #374151; text-decoration: none; font-weight: 500; font-size: 15px;">${p.name}</a>`
  ).join("");

  const featuresHTML = cfg.features.map(f => `
    <div style="flex: 1; min-width: 220px; background: #f9fafb; border-radius: 12px; padding: 28px 24px; border: 1px solid #e5e7eb;">
      <div style="font-size: 32px; margin-bottom: 12px;">${f.icon}</div>
      <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 8px;">${f.title}</h3>
      <p style="color: #6b7280; line-height: 1.6; margin: 0; font-size: 15px;">${f.desc}</p>
    </div>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cfg.siteName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="${fontUrl}" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${fontFamily}; background: ${bg}; color: #111827; }
    a { color: inherit; }
    .btn-primary {
      display: inline-flex; align-items: center; gap: 8px;
      background: ${primary}; color: white; border: none; border-radius: 8px;
      padding: 14px 28px; font-size: 16px; font-weight: 600; cursor: pointer;
      text-decoration: none; transition: opacity .2s;
    }
    .btn-primary:hover { opacity: .88; }
    .btn-outline {
      display: inline-flex; align-items: center; gap: 8px;
      background: transparent; color: ${primary}; border: 2px solid ${primary};
      border-radius: 8px; padding: 12px 26px; font-size: 16px; font-weight: 600;
      cursor: pointer; text-decoration: none; transition: background .2s, color .2s; margin-left: 12px;
    }
    .btn-outline:hover { background: ${primary}; color: white; }
  </style>
</head>
<body>
  <!-- NAV -->
  <nav style="background: white; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; z-index: 100; padding: 0 40px;">
    <div style="max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 64px;">
      <span style="font-size: 20px; font-weight: 800; color: ${primary};">${cfg.siteName}</span>
      <div>${navLinks}</div>
      <a href="#contact" class="btn-primary" style="padding: 10px 20px; font-size: 14px;">${cfg.ctaText}</a>
    </div>
  </nav>

  ${cfg.activeSections.includes("hero") ? `
  <!-- HERO -->
  <section style="background: linear-gradient(135deg, ${primary}10 0%, ${bg} 60%); padding: 100px 40px;">
    <div style="max-width: 780px; margin: 0 auto; text-align: center;">
      <div style="display: inline-flex; align-items: center; gap: 8px; background: ${primary}15; border: 1px solid ${primary}30; border-radius: 999px; padding: 6px 16px; font-size: 13px; font-weight: 600; color: ${accent}; margin-bottom: 28px;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: ${primary}; display: inline-block;"></span>
        ${cfg.tagline}
      </div>
      <h1 style="font-size: clamp(36px, 5vw, 64px); font-weight: 800; color: #0f172a; line-height: 1.15; margin-bottom: 24px;">${cfg.heroHeadline}</h1>
      <p style="font-size: 18px; color: #475569; line-height: 1.7; margin-bottom: 40px; max-width: 600px; margin-left: auto; margin-right: auto;">${cfg.heroSubtext}</p>
      <div>
        <a href="#contact" class="btn-primary">${cfg.ctaText}</a>
        <a href="#features" class="btn-outline">${cfg.ctaSecondaryText}</a>
      </div>
    </div>
  </section>` : ""}

  ${cfg.activeSections.includes("features") ? `
  <!-- FEATURES -->
  <section id="features" style="padding: 90px 40px; background: white;">
    <div style="max-width: 1100px; margin: 0 auto;">
      <h2 style="font-size: 36px; font-weight: 800; color: #0f172a; text-align: center; margin-bottom: 12px;">Everything you need</h2>
      <p style="color: #64748b; text-align: center; font-size: 17px; margin-bottom: 56px;">Built to help your business move faster and smarter.</p>
      <div style="display: flex; gap: 24px; flex-wrap: wrap;">${featuresHTML}</div>
    </div>
  </section>` : ""}

  ${cfg.activeSections.includes("about") ? `
  <!-- ABOUT -->
  <section id="about" style="padding: 90px 40px; background: ${bg === "#ffffff" ? "#f8fafc" : bg};">
    <div style="max-width: 1100px; margin: 0 auto; display: flex; gap: 80px; align-items: center; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 280px;">
        <div style="width: 48px; height: 4px; background: ${primary}; border-radius: 4px; margin-bottom: 20px;"></div>
        <h2 style="font-size: 36px; font-weight: 800; color: #0f172a; margin-bottom: 20px;">${cfg.aboutTitle}</h2>
        <p style="color: #475569; line-height: 1.8; font-size: 16px; margin-bottom: 28px;">${cfg.aboutBody}</p>
        <a href="#contact" class="btn-primary">Work with us →</a>
      </div>
      <div style="flex: 1; min-width: 280px; background: linear-gradient(135deg, ${primary}20, ${primary}08); border-radius: 20px; height: 280px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 80px;">🏢</span>
      </div>
    </div>
  </section>` : ""}

  ${cfg.activeSections.includes("contact") ? `
  <!-- CONTACT / CTA -->
  <section id="contact" style="padding: 90px 40px; background: ${primary}; color: white; text-align: center;">
    <div style="max-width: 640px; margin: 0 auto;">
      <h2 style="font-size: 40px; font-weight: 800; margin-bottom: 16px;">Let's get started</h2>
      <p style="font-size: 18px; opacity: .85; margin-bottom: 40px; line-height: 1.6;">Reach out today. We'll get back to you within 24 hours.</p>
      <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 32px;">
        <a href="mailto:${cfg.contactEmail}" style="background: white; color: ${primary}; padding: 14px 28px; border-radius: 8px; font-weight: 700; text-decoration: none;">📧 ${cfg.contactEmail}</a>
        ${cfg.contactPhone ? `<a href="tel:${cfg.contactPhone}" style="background: white; color: ${primary}; padding: 14px 28px; border-radius: 8px; font-weight: 700; text-decoration: none;">📞 ${cfg.contactPhone}</a>` : ""}
      </div>
    </div>
  </section>` : ""}

  <!-- FOOTER -->
  <footer style="background: #0f172a; color: #94a3b8; text-align: center; padding: 28px 40px; font-size: 14px;">
    <p>© ${new Date().getFullYear()} ${cfg.siteName}. All rights reserved.</p>
  </footer>
</body>
</html>`;
}

// ── Steps ─────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Template",  icon: LayoutGrid },
  { id: 2, label: "Customize", icon: Palette },
  { id: 3, label: "Pages",     icon: Globe },
  { id: 4, label: "Preview",   icon: Eye },
  { id: 5, label: "Publish",   icon: Rocket },
];

// ── Step 1: Template Gallery ──────────────────────────────────────────────────

function TemplateGallery({ config, onChange }: { config: SiteConfig; onChange: (id: string) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Choose a template</h2>
      <p className="text-slate-500 mb-8">Pick a starting point — you'll customize everything in the next step.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {TEMPLATES.map(tpl => (
          <motion.button key={tpl.id} whileHover={{ y: -2 }}
            onClick={() => onChange(tpl.id)}
            className={`text-left rounded-2xl border-2 overflow-hidden transition-all ${config.templateId === tpl.id ? "border-blue-500 shadow-lg shadow-blue-100" : "border-slate-200 hover:border-slate-300"}`}>
            <div className={`h-40 bg-gradient-to-br ${tpl.previewBg} relative flex items-center justify-center`}>
              {config.templateId === tpl.id && (
                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white flex items-center justify-center">
                  <Check className="w-4 h-4 text-blue-500" />
                </div>
              )}
              <div className="w-48 bg-white/10 backdrop-blur rounded-lg p-3 space-y-2">
                <div className={`w-20 h-2.5 ${tpl.accentDot} rounded`} />
                <div className="w-36 h-1.5 bg-white/30 rounded" />
                <div className="w-28 h-1.5 bg-white/20 rounded" />
                <div className="flex gap-2 mt-3">
                  <div className={`w-16 h-6 ${tpl.accentDot} rounded opacity-90`} />
                  <div className="w-16 h-6 bg-white/20 rounded" />
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-slate-900">{tpl.name}</h3>
                <span className="text-[11px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{tpl.category}</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">{tpl.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Customizer ────────────────────────────────────────────────────────

function Customizer({ config, setConfig }: { config: SiteConfig; setConfig: React.Dispatch<React.SetStateAction<SiteConfig>> }) {
  const set = (key: keyof SiteConfig, val: unknown) => setConfig(c => ({ ...c, [key]: val }));
  const setFeature = (i: number, field: keyof FeatureItem, val: string) => setConfig(c => ({
    ...c, features: c.features.map((f, j) => j === i ? { ...f, [field]: val } : f),
  }));
  const toggleSection = (s: string) => setConfig(c => ({
    ...c, activeSections: c.activeSections.includes(s) ? c.activeSections.filter(x => x !== s) : [...c.activeSections, s],
  }));

  const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white";
  const labelCls = "text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left: sections toggles */}
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3">Active Sections</h3>
          {SECTIONS.map(s => (
            <label key={s} className="flex items-center justify-between py-2.5 border-b border-slate-100 cursor-pointer">
              <span className="text-sm font-medium text-slate-700 capitalize">{s}</span>
              <button onClick={() => toggleSection(s)}
                className={`w-10 h-5.5 rounded-full transition-colors relative ${config.activeSections.includes(s) ? "bg-blue-500" : "bg-slate-200"}`}
                style={{ width: 40, height: 22 }}>
                <span className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${config.activeSections.includes(s) ? "translate-x-5" : "translate-x-0.5"}`}
                  style={{ width: 18, height: 18, transitionProperty: "transform" }} />
              </button>
            </label>
          ))}
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3">Color Scheme</h3>
          <div className="grid grid-cols-3 gap-2">
            {COLOR_PRESETS.map(p => (
              <button key={p.name} onClick={() => set("colorScheme", p.scheme)}
                className={`rounded-xl border-2 overflow-hidden transition-all ${JSON.stringify(config.colorScheme) === JSON.stringify(p.scheme) ? "border-blue-500" : "border-slate-200"}`}>
                <div className="h-8" style={{ background: `linear-gradient(135deg, ${p.scheme.primary}, ${p.scheme.secondary})` }} />
                <p className="text-[10px] font-medium text-slate-600 py-1 text-center">{p.name}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3">Font Pair</h3>
          <div className="space-y-2">
            {FONT_PAIRS.map(fp => (
              <button key={fp.id} onClick={() => set("fontPair", fp.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all ${config.fontPair === fp.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                <p className="text-sm font-semibold text-slate-900">{fp.label}</p>
                <p className="text-xs text-slate-500">{fp.preview}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: content editors */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-700">Brand</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Site Name</label>
              <input className={inputCls} value={config.siteName} onChange={e => set("siteName", e.target.value)} placeholder="My Business" />
            </div>
            <div>
              <label className={labelCls}>Tagline</label>
              <input className={inputCls} value={config.tagline} onChange={e => set("tagline", e.target.value)} placeholder="Your short tagline" />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-700">Hero Section</h3>
          <div>
            <label className={labelCls}>Headline</label>
            <input className={inputCls} value={config.heroHeadline} onChange={e => set("heroHeadline", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Subtext</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={config.heroSubtext} onChange={e => set("heroSubtext", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Primary CTA</label>
              <input className={inputCls} value={config.ctaText} onChange={e => set("ctaText", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Secondary CTA</label>
              <input className={inputCls} value={config.ctaSecondaryText} onChange={e => set("ctaSecondaryText", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-700">Features / Services</h3>
          {config.features.map((f, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 items-start">
              <input className={`${inputCls} col-span-1 text-center`} value={f.icon} onChange={e => setFeature(i, "icon", e.target.value)} />
              <input className={`${inputCls} col-span-4`} value={f.title} onChange={e => setFeature(i, "title", e.target.value)} placeholder="Feature title" />
              <input className={`${inputCls} col-span-7`} value={f.desc} onChange={e => setFeature(i, "desc", e.target.value)} placeholder="Short description" />
            </div>
          ))}
        </div>

        <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-700">About</h3>
          <div>
            <label className={labelCls}>Section Title</label>
            <input className={inputCls} value={config.aboutTitle} onChange={e => set("aboutTitle", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Body Text</label>
            <textarea className={`${inputCls} resize-none`} rows={4} value={config.aboutBody} onChange={e => set("aboutBody", e.target.value)} />
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-700">Contact Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} type="email" value={config.contactEmail} onChange={e => set("contactEmail", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} value={config.contactPhone} onChange={e => set("contactPhone", e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Pages Manager ─────────────────────────────────────────────────────

function PagesManager({ config, setConfig }: { config: SiteConfig; setConfig: React.Dispatch<React.SetStateAction<SiteConfig>> }) {
  const [newName, setNewName] = useState("");

  const addPage = () => {
    if (!newName.trim()) return;
    const slug = "/" + newName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setConfig(c => ({ ...c, pages: [...c.pages, { id: slug, name: newName.trim(), slug }] }));
    setNewName("");
  };

  const removePage = (id: string) => setConfig(c => ({ ...c, pages: c.pages.filter(p => p.id !== id) }));

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Manage Pages</h2>
      <p className="text-slate-500 mb-8">Add or remove pages. The Home page is always included.</p>

      <div className="space-y-2 mb-6">
        {config.pages.map(page => (
          <div key={page.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
            <GripVertical className="w-4 h-4 text-slate-300" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">{page.name}</p>
              <p className="text-xs text-slate-400 font-mono">{page.slug}</p>
            </div>
            {page.locked ? (
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Required</span>
            ) : (
              <button onClick={() => removePage(page.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addPage(); }}
          placeholder="New page name (e.g. Services)"
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
        <Button onClick={addPage} disabled={!newName.trim()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Page
        </Button>
      </div>
    </div>
  );
}

// ── Step 4: Preview ───────────────────────────────────────────────────────────

function Preview({ config }: { config: SiteConfig }) {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const html = useMemo(() => generateHTML(config), [config]);

  const widths = { desktop: "100%", tablet: "768px", mobile: "375px" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Live Preview</h2>
          <p className="text-slate-500">This is exactly how your site will look.</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([id, Icon]) => (
            <button key={id} onClick={() => setViewport(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${viewport === id ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
              <Icon className="w-4 h-4" />
              <span className="capitalize">{id}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-200 rounded-2xl p-4 flex justify-center min-h-[600px]">
        <div
          className="bg-white rounded-xl overflow-hidden shadow-xl transition-all duration-300"
          style={{ width: widths[viewport], maxWidth: "100%" }}>
          <iframe
            title="Site Preview"
            srcDoc={html}
            className="w-full border-none"
            style={{ height: "700px" }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}

// ── Step 5: Publish ───────────────────────────────────────────────────────────

function Publish({ config }: { config: SiteConfig }) {
  const { toast } = useToast();
  const html = useMemo(() => generateHTML(config), [config]);

  const downloadHTML = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.siteName.toLowerCase().replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Your site HTML has been saved." });
  };

  const copyEmbed = () => {
    void navigator.clipboard.writeText(html);
    toast({ title: "Copied to clipboard", description: "Paste into any HTML file or hosting platform." });
  };

  const DEPLOY_OPTIONS = [
    { name: "Vercel", desc: "Free. Fastest global CDN. Custom domain support.", badge: "Free", color: "text-slate-900", bg: "bg-slate-50", border: "border-slate-200", url: "https://vercel.com/new" },
    { name: "Netlify", desc: "Free. Drag-and-drop deploy. Instant live preview.", badge: "Free", color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200", url: "https://app.netlify.com/drop" },
    { name: "Cloudflare Pages", desc: "Free. Unlimited bandwidth. Global edge network.", badge: "Free", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", url: "https://pages.cloudflare.com" },
    { name: "GitHub Pages", desc: "Free. Host directly from a GitHub repository.", badge: "Free", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", url: "https://pages.github.com" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Publish Your Site</h2>
      <p className="text-slate-500 mb-8">Download your site and deploy it to any free hosting platform in minutes.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        <button onClick={downloadHTML}
          className="flex items-center gap-4 p-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-colors text-left">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-lg">Download HTML</p>
            <p className="text-blue-200 text-sm">Get your complete site as a single HTML file</p>
          </div>
        </button>
        <button onClick={copyEmbed}
          className="flex items-center gap-4 p-5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl transition-colors text-left">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Copy className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-lg">Copy Source Code</p>
            <p className="text-slate-400 text-sm">Copy the full HTML to your clipboard</p>
          </div>
        </button>
      </div>

      <h3 className="text-base font-bold text-slate-800 mb-4">Deploy for Free — Recommended Platforms</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DEPLOY_OPTIONS.map(opt => (
          <a key={opt.name} href={opt.url} target="_blank" rel="noopener noreferrer"
            className={`flex items-start gap-4 p-4 rounded-xl border ${opt.bg} ${opt.border} hover:shadow-md transition-shadow`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className={`font-bold text-sm ${opt.color}`}>{opt.name}</p>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{opt.badge}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 ${opt.color}`} />
          </a>
        ))}
      </div>

      <div className="mt-8 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
        <p className="text-sm font-bold text-amber-800 mb-1">Want a custom domain?</p>
        <p className="text-sm text-amber-700">Buy one domain (~$10–15/year) from Namecheap, Cloudflare, or Google Domains, then point it to whichever platform you deploy to above. All four platforms support custom domains for free.</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SiteBuilder() {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<SiteConfig>(defaultConfig);

  const handleTemplateSelect = useCallback((id: string) => {
    const tpl = TEMPLATES.find(t => t.id === id);
    setConfig(c => ({ ...c, templateId: id, colorScheme: tpl?.defaultColors ?? c.colorScheme }));
  }, []);

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="text-3xl font-display font-bold text-slate-900">Site Builder</h1>
        <p className="text-slate-500 mt-1">Design and publish a professional website in minutes — no code required.</p>
      </motion.div>

      {/* Step Stepper */}
      <div className="flex items-center gap-0 mb-10 overflow-x-auto">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center shrink-0">
              <button onClick={() => { if (done || active) setStep(s.id); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${active ? "bg-blue-600 text-white shadow-md shadow-blue-200" : done ? "bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer" : "text-slate-400 cursor-default"}`}>
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${step > s.id ? "bg-blue-300" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
          {step === 1 && <TemplateGallery config={config} onChange={handleTemplateSelect} />}
          {step === 2 && <Customizer config={config} setConfig={setConfig} />}
          {step === 3 && <PagesManager config={config} setConfig={setConfig} />}
          {step === 4 && <Preview config={config} />}
          {step === 5 && <Publish config={config} />}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-200">
        <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <span className="text-sm text-slate-400">Step {step} of {STEPS.length}</span>
        {step < STEPS.length ? (
          <Button onClick={() => setStep(s => Math.min(STEPS.length, s + 1))} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            {step === 4 ? "Go to Publish" : "Continue"} <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={() => setStep(1)} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Start New Site
          </Button>
        )}
      </div>
    </div>
  );
}
