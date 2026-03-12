import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Card, Button, Input, Badge } from "@/components/ui";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Shield, Bell, Users, Save } from "lucide-react";
import { motion } from "framer-motion";

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyAlerts, setNotifyAlerts] = useState(true);
  const [notifyDigest, setNotifyDigest] = useState(false);

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security & Access", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "team", label: "Team Management", icon: Users },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white text-glow">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account, security, and team preferences.</p>
      </motion.div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "text-slate-500 hover:text-slate-300 border border-white/[0.04]"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {activeTab === "profile" && (
          <Card className="p-8">
            <h2 className="text-xl font-bold text-white mb-6">Profile Settings</h2>
            <div className="flex items-center gap-6 mb-8">
              <img
                src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=0a0a0f&color=00f0ff&size=80`}
                alt="Avatar"
                className="w-20 h-20 rounded-xl border-2 border-white/10"
              />
              <div>
                <h3 className="text-lg font-bold text-white">{user?.firstName} {user?.lastName}</h3>
                <p className="text-sm text-slate-500">Account ID: {user?.id}</p>
                <Badge variant="success" className="mt-1">Owner</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-400">First Name</Label>
                <Input defaultValue={user?.firstName || ""} />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Last Name</Label>
                <Input defaultValue={user?.lastName || ""} />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Display Name</Label>
                <Input defaultValue={`${user?.firstName || ""} ${user?.lastName || ""}`} />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Time Zone</Label>
                <Select defaultValue="utc">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">Eastern (EST)</SelectItem>
                    <SelectItem value="cst">Central (CST)</SelectItem>
                    <SelectItem value="pst">Pacific (PST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button><Save className="w-4 h-4 mr-2" />Save Changes</Button>
            </div>
          </Card>
        )}

        {activeTab === "security" && (
          <Card className="p-8">
            <h2 className="text-xl font-bold text-white mb-6">Security & Access Control</h2>
            <div className="space-y-6">
              <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="font-medium text-emerald-400">Authentication Active</p>
                    <p className="text-sm text-slate-500">Signed in via Replit Auth (OpenID Connect)</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-white mb-3">Role-Based Access</h3>
                <div className="space-y-3">
                  {[
                    { role: "Owner", desc: "Full access to all features, billing, and team management", color: "bg-cyan-500/10 text-cyan-400" },
                    { role: "Admin", desc: "Manage cases, connectors, automation rules, and team members", color: "bg-amber-500/10 text-amber-400" },
                    { role: "Viewer", desc: "Read-only access to dashboards, cases, and reports", color: "bg-white/5 text-slate-400" },
                  ].map((r) => (
                    <div key={r.role} className="flex items-center gap-4 p-3 rounded-lg border border-white/[0.04]">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${r.color}`}>{r.role}</span>
                      <p className="text-sm text-slate-400">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "notifications" && (
          <Card className="p-8">
            <h2 className="text-xl font-bold text-white mb-6">Notification Preferences</h2>
            <div className="space-y-4">
              {[
                { key: "email", label: "Email Notifications", desc: "Receive case updates and resolution summaries via email", value: notifyEmail, setter: setNotifyEmail },
                { key: "alerts", label: "System Alert Notifications", desc: "Get notified for critical and warning-level system alerts", value: notifyAlerts, setter: setNotifyAlerts },
                { key: "digest", label: "Weekly Digest", desc: "Receive a weekly summary of operations, cases, and metrics", value: notifyDigest, setter: setNotifyDigest },
              ].map((pref) => (
                <div key={pref.key} className="flex items-center justify-between p-4 rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                  <div>
                    <p className="font-medium text-white">{pref.label}</p>
                    <p className="text-sm text-slate-500">{pref.desc}</p>
                  </div>
                  <button
                    onClick={() => pref.setter(!pref.value)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${pref.value ? "bg-cyan-500" : "bg-white/10"}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${pref.value ? "translate-x-6" : "translate-x-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-6">
              <Button><Save className="w-4 h-4 mr-2" />Save Preferences</Button>
            </div>
          </Card>
        )}

        {activeTab === "team" && (
          <Card className="p-8">
            <h2 className="text-xl font-bold text-white mb-6">Team Management</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                <div className="flex items-center gap-4">
                  <img
                    src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.firstName}&background=0a0a0f&color=00f0ff`}
                    alt=""
                    className="w-10 h-10 rounded-lg"
                  />
                  <div>
                    <p className="font-medium text-white">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-slate-500">Account Owner</p>
                  </div>
                </div>
                <Badge variant="success">Owner</Badge>
              </div>

              <div className="border-2 border-dashed border-white/[0.06] rounded-xl p-8 text-center">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-400">Invite team members</p>
                <p className="text-xs text-slate-600 mt-1">Team features available on Business and Enterprise tiers</p>
                <Button variant="outline" className="mt-4" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </div>
            </div>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
