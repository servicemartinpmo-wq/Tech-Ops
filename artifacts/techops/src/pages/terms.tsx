import { motion } from "framer-motion";
import { Link } from "wouter";
import { FileText, ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#08090c] text-slate-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-10">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Terms of Service</h1>
              <p className="text-xs text-slate-500">Last updated: March 2026</p>
            </div>
          </div>

          <div className="space-y-8 text-sm leading-relaxed">
            <Section title="1. Agreement to Terms">
              By creating an account or using Tech-Ops by Martin PMO ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
            </Section>

            <Section title="2. Description of Service">
              Tech-Ops by Martin PMO is an autonomous IT operations platform powered by the Apphia Engine. It provides diagnostic analysis, connector health monitoring, automation rule execution, secure credential storage, and related IT support tooling for businesses and individuals.
            </Section>

            <Section title="3. Account Responsibilities">
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>You are responsible for maintaining the security of your account credentials.</li>
                <li>You must provide accurate, current, and complete information during registration.</li>
                <li>You are responsible for all activity that occurs under your account.</li>
                <li>You must notify us immediately of any unauthorised access to your account.</li>
              </ul>
            </Section>

            <Section title="4. Acceptable Use">
              You agree not to:
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Use the Service to process or store data that violates any applicable law.</li>
                <li>Attempt to reverse-engineer, decompile, or extract proprietary algorithms from the Apphia Engine.</li>
                <li>Use automated means to access the Service in ways that exceed your plan's limits.</li>
                <li>Resell or sublicense access to the Service without written authorisation.</li>
                <li>Submit malicious code, exploits, or data designed to harm the platform or other users.</li>
              </ul>
            </Section>

            <Section title="5. Subscription and Billing">
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Subscriptions are billed monthly at the rate shown on the Billing page at time of purchase.</li>
                <li>Prices may change with 30 days' notice to active subscribers.</li>
                <li>A 7-day free trial is available on all paid plans; no charge until the trial ends.</li>
                <li>You may cancel at any time; cancellation takes effect at the end of the current billing period.</li>
                <li>No refunds are issued for partial billing periods.</li>
              </ul>
            </Section>

            <Section title="6. Service Availability">
              We aim to provide 99.9% uptime. Scheduled maintenance will be communicated in advance where possible. We are not liable for losses caused by downtime, service interruptions, or data processing delays.
            </Section>

            <Section title="7. Data and Privacy">
              Your use of the Service is subject to our <Link href="/privacy" className="text-violet-400 hover:underline">Privacy Policy</Link>. By using the Service, you consent to the data practices described therein.
            </Section>

            <Section title="8. Intellectual Property">
              The Service, including the Apphia Engine, all software, logos, and content, is owned by Martin PMO and protected by intellectual property laws. You retain ownership of data you submit to the platform.
            </Section>

            <Section title="9. Disclaimer of Warranties">
              The Service is provided "as is" without warranties of any kind. We do not guarantee that diagnostic outputs, automation actions, or recommendations will be error-free or suitable for your specific situation. Human review of critical actions is your responsibility.
            </Section>

            <Section title="10. Limitation of Liability">
              To the maximum extent permitted by law, Martin PMO shall not be liable for indirect, incidental, special, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount paid by you in the 3 months preceding the claim.
            </Section>

            <Section title="11. Termination">
              We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or pose a security risk to the platform or other users.
            </Section>

            <Section title="12. Governing Law">
              These Terms are governed by the laws of the jurisdiction in which Martin PMO is registered. Disputes shall be resolved through binding arbitration unless prohibited by applicable law.
            </Section>

            <Section title="13. Changes to Terms">
              We may update these Terms periodically. Continued use of the Service after changes constitutes acceptance. Material changes will be communicated via email to registered users.
            </Section>

            <Section title="14. Contact">
              Questions about these Terms? Contact us at <a href="mailto:legal@techopspmo.com" className="text-violet-400 hover:underline">legal@techopspmo.com</a>.
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
