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
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account, security, and team preferences.</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-white"
                : "bg-white border text-slate-600 hover:bg-slate-50"
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
            <h2 className="text-xl font-bold text-slate-900 mb-6">Profile Settings</h2>
            <div className="flex items-center gap-6 mb-8">
              <img
                src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=EBF4FF&color=2563EB&size=80`}
                alt="Avatar"
                className="w-20 h-20 rounded-xl shadow-sm border-2 border-white"
              />
              <div>
                <h3 className="text-lg font-bold text-slate-900">{user?.firstName} {user?.lastName}</h3>
                <p className="text-sm text-slate-500">Account ID: {user?.id}</p>
                <Badge variant="success" className="mt-1">Owner</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input defaultValue={user?.firstName || ""} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input defaultValue={user?.lastName || ""} />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input defaultValue={`${user?.firstName || ""} ${user?.lastName || ""}`} />
              </div>
              <div className="space-y-2">
                <Label>Time Zone</Label>
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
            <h2 className="text-xl font-bold text-slate-900 mb-6">Security & Access Control</h2>
            <div className="space-y-6">
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Authentication Active</p>
                    <p className="text-sm text-green-600">Signed in via Replit Auth (OpenID Connect)</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-3">Role-Based Access</h3>
                <div className="space-y-3">
                  {[
                    { role: "Owner", desc: "Full access to all features, billing, and team management", color: "bg-primary/10 text-primary" },
                    { role: "Admin", desc: "Manage cases, connectors, automation rules, and team members", color: "bg-amber-100 text-amber-700" },
                    { role: "Viewer", desc: "Read-only access to dashboards, cases, and reports", color: "bg-slate-100 text-slate-600" },
                  ].map((r) => (
                    <div key={r.role} className="flex items-center gap-4 p-3 rounded-lg border">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${r.color}`}>{r.role}</span>
                      <p className="text-sm text-slate-600">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "notifications" && (
          <Card className="p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Notification Preferences</h2>
            <div className="space-y-4">
              {[
                { key: "email", label: "Email Notifications", desc: "Receive case updates and resolution summaries via email", value: notifyEmail, setter: setNotifyEmail },
                { key: "alerts", label: "System Alert Notifications", desc: "Get notified for critical and warning-level system alerts", value: notifyAlerts, setter: setNotifyAlerts },
                { key: "digest", label: "Weekly Digest", desc: "Receive a weekly summary of operations, cases, and metrics", value: notifyDigest, setter: setNotifyDigest },
              ].map((pref) => (
                <div key={pref.key} className="flex items-center justify-between p-4 rounded-xl border hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-medium text-slate-900">{pref.label}</p>
                    <p className="text-sm text-slate-500">{pref.desc}</p>
                  </div>
                  <button
                    onClick={() => pref.setter(!pref.value)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${pref.value ? "bg-primary" : "bg-slate-200"}`}
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
            <h2 className="text-xl font-bold text-slate-900 mb-6">Team Management</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                <div className="flex items-center gap-4">
                  <img
                    src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.firstName}&background=EBF4FF&color=2563EB`}
                    alt=""
                    className="w-10 h-10 rounded-lg"
                  />
                  <div>
                    <p className="font-medium text-slate-900">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-slate-500">Account Owner</p>
                  </div>
                </div>
                <Badge variant="success">Owner</Badge>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">Invite team members</p>
                <p className="text-xs text-slate-400 mt-1">Team features available on Business and Enterprise tiers</p>
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
