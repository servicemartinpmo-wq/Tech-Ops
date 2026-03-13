import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Card, Button, Badge } from "@/components/ui";
import { Label } from "@/components/ui/label";
import { User, Shield, Bell, Users, Save, CheckCircle2, Loader2, Eye, EyeOff, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApiBase } from "@/hooks/use-api-base";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

function SettingsInput({ value, onChange, type = "text", placeholder, disabled, rightEl }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string; disabled?: boolean;
  rightEl?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        className="w-full bg-[#0d1117] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors disabled:opacity-50"
      />
      {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>}
    </div>
  );
}

export default function Settings() {
  const { user, refetch } = useAuth();
  const apiBase = useApiBase();
  const [activeTab, setActiveTab] = useState("profile");

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName]   = useState(user?.lastName ?? "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [pwBusy, setPwBusy]       = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError]     = useState("");

  const [notifyEmail, setNotifyEmail]   = useState(true);
  const [notifyAlerts, setNotifyAlerts] = useState(true);
  const [notifyDigest, setNotifyDigest] = useState(false);

  const tabs = [
    { id: "profile",       label: "Profile",         icon: User   },
    { id: "security",      label: "Security",         icon: Shield },
    { id: "notifications", label: "Notifications",    icon: Bell   },
    { id: "team",          label: "Team",             icon: Users  },
  ];

  const handleSaveProfile = async () => {
    setProfileBusy(true); setProfileError(""); setProfileSuccess(false);
    try {
      const res = await fetch(`${apiBase}/api/auth/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      });
      if (!res.ok) { const d = await res.json() as { error?: string }; setProfileError(d.error ?? "Failed to save"); return; }
      setProfileSuccess(true);
      refetch();
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch { setProfileError("Network error"); } finally { setProfileBusy(false); }
  };

  const handleChangePassword = async () => {
    setPwBusy(true); setPwError(""); setPwSuccess(false);
    if (newPw !== confirmPw) { setPwError("Passwords do not match"); setPwBusy(false); return; }
    if (newPw.length < 8)    { setPwError("Password must be at least 8 characters"); setPwBusy(false); return; }
    try {
      const res = await fetch(`${apiBase}/api/auth/password`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (!res.ok) { const d = await res.json() as { error?: string }; setPwError(d.error ?? "Failed to change password"); return; }
      setPwSuccess(true); setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwSuccess(false), 4000);
    } catch { setPwError("Network error"); } finally { setPwBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Settings</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage your account, security, and preferences.</p>
      </motion.div>

      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                : "text-slate-500 hover:text-slate-300 border border-white/[0.04]"
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

          {activeTab === "profile" && (
            <Card className="p-6 bg-[#0d1117] border border-white/[0.06]">
              <h2 className="text-lg font-bold text-white mb-5">Profile</h2>

              <div className="flex items-center gap-4 mb-6">
                <img
                  src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.firstName || "U") + "+" + (user?.lastName || ""))}&background=5b21b6&color=ffffff&size=80`}
                  alt="Avatar" className="w-16 h-16 rounded-xl border border-white/10"
                />
                <div>
                  <p className="font-semibold text-white">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
                  <Badge variant="success" className="mt-1.5 text-xs">Owner</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name">
                  <SettingsInput value={firstName} onChange={setFirstName} placeholder="First name" disabled={profileBusy} />
                </Field>
                <Field label="Last Name">
                  <SettingsInput value={lastName} onChange={setLastName} placeholder="Last name" disabled={profileBusy} />
                </Field>
              </div>

              {profileError && <p className="text-rose-400 text-xs mt-3">{profileError}</p>}

              <div className="flex items-center justify-between mt-5">
                {profileSuccess && (
                  <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Profile saved
                  </span>
                )}
                <div className="ml-auto">
                  <button onClick={() => void handleSaveProfile()} disabled={profileBusy}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all disabled:opacity-50">
                    {profileBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "security" && (
            <div className="space-y-4">
              <Card className="p-6 bg-[#0d1117] border border-white/[0.06]">
                <div className="flex items-center gap-3 mb-1">
                  <Lock className="w-5 h-5 text-violet-400" />
                  <h2 className="text-lg font-bold text-white">Change Password</h2>
                </div>
                <p className="text-xs text-slate-500 mb-5">Set a new password. If you signed up via Google or Magic Link, you can set a password here to also enable email/password login.</p>

                <div className="space-y-3">
                  <Field label="Current Password">
                    <SettingsInput type={showPw ? "text" : "password"} value={currentPw} onChange={setCurrentPw}
                      placeholder="Leave blank if not set" disabled={pwBusy}
                      rightEl={
                        <button type="button" onClick={() => setShowPw(s => !s)} className="text-slate-500 hover:text-slate-300">
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                  </Field>
                  <Field label="New Password">
                    <SettingsInput type={showPw ? "text" : "password"} value={newPw} onChange={setNewPw}
                      placeholder="Min. 8 characters" disabled={pwBusy} />
                  </Field>
                  <Field label="Confirm New Password">
                    <SettingsInput type={showPw ? "text" : "password"} value={confirmPw} onChange={setConfirmPw}
                      placeholder="Repeat new password" disabled={pwBusy} />
                  </Field>
                </div>

                {pwError && <p className="text-rose-400 text-xs mt-3">{pwError}</p>}

                <div className="flex items-center justify-between mt-5">
                  {pwSuccess && (
                    <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Password updated
                    </span>
                  )}
                  <div className="ml-auto">
                    <button onClick={() => void handleChangePassword()} disabled={pwBusy || !newPw}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all disabled:opacity-50">
                      {pwBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                      Update Password
                    </button>
                  </div>
                </div>
              </Card>

              <Card className="p-5 bg-[#0d1117] border border-white/[0.06]">
                <h3 className="font-semibold text-white mb-3">Role-Based Access Levels</h3>
                <div className="space-y-2">
                  {[
                    { role: "Owner",  desc: "Full access — billing, team, and all platform features", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                    { role: "Admin",  desc: "Manage cases, connectors, automation, and team members",  color: "text-amber-400 bg-amber-500/10 border-amber-500/20"  },
                    { role: "Viewer", desc: "Read-only access to dashboards, cases, and reports",       color: "text-slate-400 bg-white/5 border-white/[0.06]"          },
                  ].map(r => (
                    <div key={r.role} className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.04]">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${r.color}`}>{r.role}</span>
                      <p className="text-xs text-slate-400">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === "notifications" && (
            <Card className="p-6 bg-[#0d1117] border border-white/[0.06]">
              <h2 className="text-lg font-bold text-white mb-5">Notification Preferences</h2>
              <div className="space-y-3">
                {[
                  { key: "email",  label: "Email Notifications",      desc: "Case updates and resolution summaries via email",    value: notifyEmail,  setter: setNotifyEmail  },
                  { key: "alerts", label: "System Alert Notifications", desc: "Critical and warning-level system alerts in real-time", value: notifyAlerts, setter: setNotifyAlerts },
                  { key: "digest", label: "Weekly Digest",             desc: "Weekly summary of operations, cases, and metrics",    value: notifyDigest, setter: setNotifyDigest },
                ].map(pref => (
                  <div key={pref.key} className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white">{pref.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{pref.desc}</p>
                    </div>
                    <button onClick={() => pref.setter(!pref.value)}
                      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${pref.value ? "bg-violet-600" : "bg-white/10"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-1 transition-transform ${pref.value ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-4">Notification delivery requires SMTP configuration.</p>
            </Card>
          )}

          {activeTab === "team" && (
            <Card className="p-6 bg-[#0d1117] border border-white/[0.06]">
              <h2 className="text-lg font-bold text-white mb-5">Team Management</h2>
              <div className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.04] mb-5">
                <img
                  src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.firstName || "U") + "+" + (user?.lastName || ""))}&background=5b21b6&color=ffffff`}
                  alt="" className="w-10 h-10 rounded-lg"
                />
                <div>
                  <p className="text-sm font-semibold text-white">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <Badge variant="success" className="ml-auto">Owner</Badge>
              </div>
              <div className="border-2 border-dashed border-white/[0.06] rounded-xl p-8 text-center">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-400">Invite team members</p>
                <p className="text-xs text-slate-600 mt-1">Team features available on Business and Enterprise plans</p>
                <button className="mt-4 px-4 py-2 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:text-white hover:border-white/[0.15] transition-all">
                  <Users className="w-4 h-4 inline mr-2" />Invite Member
                </button>
              </div>
            </Card>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
