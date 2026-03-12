import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";

import { Layout } from "@/components/layout";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import CasesList from "@/pages/cases/list";
import CaseDetail from "@/pages/cases/detail";
import SubmitCase from "@/pages/cases/submit";
import ResolvedCases from "@/pages/cases/resolved";
import ApphiaChat from "@/pages/apphia/chat";
import PreferencesQuiz from "@/pages/preferences/quiz";
import Billing from "@/pages/billing";
import Connectors from "@/pages/connectors";
import AutomationCenter from "@/pages/automation";
import BatchDiagnostics from "@/pages/batches";
import SystemAlerts from "@/pages/alerts";
import VoicePanel from "@/pages/voice";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/cases"><ProtectedRoute component={CasesList} /></Route>
      <Route path="/cases/submit"><ProtectedRoute component={SubmitCase} /></Route>
      <Route path="/cases/resolved"><ProtectedRoute component={ResolvedCases} /></Route>
      <Route path="/cases/:id"><ProtectedRoute component={CaseDetail} /></Route>
      <Route path="/apphia"><ProtectedRoute component={ApphiaChat} /></Route>
      <Route path="/preferences"><ProtectedRoute component={PreferencesQuiz} /></Route>
      <Route path="/billing"><ProtectedRoute component={Billing} /></Route>
      <Route path="/connectors"><ProtectedRoute component={Connectors} /></Route>
      <Route path="/automation"><ProtectedRoute component={AutomationCenter} /></Route>
      <Route path="/batches"><ProtectedRoute component={BatchDiagnostics} /></Route>
      <Route path="/alerts"><ProtectedRoute component={SystemAlerts} /></Route>
      <Route path="/voice"><ProtectedRoute component={VoicePanel} /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
