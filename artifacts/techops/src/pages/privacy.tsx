import { motion } from "framer-motion";
import { Link } from "wouter";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#08090c] text-slate-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-10">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
              <p className="text-xs text-slate-500">Last updated: March 2026</p>
            </div>
          </div>

          <div className="space-y-8 text-sm leading-relaxed">
            <Section title="1. Introduction">
              Tech-Ops by Martin PMO ("we", "our", or "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </Section>

            <Section title="2. Information We Collect">
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong className="text-white">Account data:</strong> Name, email address, and authentication credentials you provide when registering.</li>
                <li><strong className="text-white">Usage data:</strong> Pages visited, features used, diagnostic cases submitted, and interaction logs.</li>
                <li><strong className="text-white">System data:</strong> Environment snapshots and connector health data you choose to submit for analysis.</li>
                <li><strong className="text-white">Vault data:</strong> Encrypted credentials and notes stored in the Secure Share Vault (AES-256-GCM encrypted at rest).</li>
                <li><strong className="text-white">Billing data:</strong> Handled entirely by your chosen payment provider. We do not store full card numbers.</li>
              </ul>
            </Section>

            <Section title="3. How We Use Your Information">
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>To provide, operate, and improve the Tech-Ops platform and Apphia Engine.</li>
                <li>To authenticate your identity and maintain your session securely.</li>
                <li>To run diagnostics, automation rules, and monitoring on your behalf.</li>
                <li>To send transactional emails (case updates, billing receipts, magic link authentication).</li>
                <li>To generate anonymised, aggregated usage analytics for platform improvement.</li>
              </ul>
            </Section>

            <Section title="4. Data Storage and Security">
              Your data is stored in a managed PostgreSQL database with encryption at rest. Vault items are encrypted with AES-256-GCM before storage. We use secure HTTPS connections for all data transmission. Session tokens are stored in HttpOnly cookies and expire after 7 days of inactivity.
            </Section>

            <Section title="5. Data Sharing">
              We do not sell your personal data. We may share data with:
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong className="text-white">Apphia Engine:</strong> Diagnostic content is processed via OpenAI's API under their data processing agreement. Case data is not used to train OpenAI models.</li>
                <li><strong className="text-white">Payment providers:</strong> Billing information is handled by your selected payment provider under their own privacy policy.</li>
                <li><strong className="text-white">Legal requirements:</strong> We may disclose data if required by law, court order, or to protect our legal rights.</li>
              </ul>
            </Section>

            <Section title="6. Your Rights (GDPR / CCPA)">
              You have the right to: access your personal data; correct inaccurate data; request deletion of your account and data; export your data; and withdraw consent at any time. To exercise these rights, email us at <a href="mailto:privacy@techopspmo.com" className="text-violet-400 hover:underline">privacy@techopspmo.com</a>.
            </Section>

            <Section title="7. Cookies">
              We use essential cookies for session management and authentication. We do not use tracking or advertising cookies. You can manage cookie preferences in your browser settings.
            </Section>

            <Section title="8. Data Retention">
              We retain your account data for as long as your account is active. Audit logs are retained for 90 days. Deleted accounts are purged within 30 days. Vault data is deleted immediately upon account deletion.
            </Section>

            <Section title="9. Children's Privacy">
              Tech-Ops is designed for business use and is not intended for individuals under 18. We do not knowingly collect data from minors.
            </Section>

            <Section title="10. Changes to This Policy">
              We may update this policy periodically. We will notify active users of material changes via email or in-platform notification. Continued use of the platform after changes constitutes acceptance of the updated policy.
            </Section>

            <Section title="11. Contact">
              Questions about this policy? Contact us at <a href="mailto:privacy@techopspmo.com" className="text-violet-400 hover:underline">privacy@techopspmo.com</a>.
            </Section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-white mb-2">{title}</h2>
      <div className="text-slate-400">{children}</div>
    </div>
  );
}
