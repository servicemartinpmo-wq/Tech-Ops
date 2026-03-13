import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";

import { Layout } from "@/components/layout";
import { VoiceOrb } from "@/components/voice-orb";
import { TicketQueuePanel } from "@/components/ticket-queue-panel";
import { CookieConsent } from "@/components/cookie-consent";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { ErrorBoundary } from "@/components/error-boundary";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import CasesList from "@/pages/cases/list";
import CaseDetail from "@/pages/cases/detail";
import SubmitCase from "@/pages/cases/submit";
import ResolvedCases from "@/pages/cases/resolved";
import ApphiaChat from "@/pages/apphia/chat";
import PreferencesQuiz from "@/pages/preferences/quiz";
import Billing from "@/pages/billing";
import Connectors from "@/pages/connectors";
import ConnectorDetail from "@/pages/connectors/detail";
import AutomationCenter from "@/pages/automation";
import BatchDiagnostics from "@/pages/batches";
import SystemAlerts from "@/pages/alerts";
import VoicePanel from "@/pages/voice";
import Settings from "@/pages/settings";
import Security from "@/pages/security";
import StackIntelligence from "@/pages/stack-intelligence";
import PMOOps from "@/pages/pmo-ops";
import RemoteAssistance from "@/pages/remote-assistance";
import KnowledgeBase from "@/pages/kb";
import SecureVault from "@/pages/secure-vault";
import IssueLog from "@/pages/issue-log";
import Analytics from "@/pages/analytics";
import Hosting from "@/pages/hosting";
import AdminPanel from "@/pages/admin";
import PrivacyPolicy from "@/pages/privacy";
import TermsOfService from "@/pages/terms";
import StatusPage from "@/pages/status";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090c]">
        <div className="w-10 h-10 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  return (
    <Layout>
      <ErrorBoundary>
        <Component />
      </ErrorBoundary>
      <TicketQueuePanel />
      <VoiceOrb />
      <OnboardingWizard />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/status" component={StatusPage} />
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/cases"><ProtectedRoute component={CasesList} /></Route>
      <Route path="/cases/submit"><ProtectedRoute component={SubmitCase} /></Route>
      <Route path="/cases/resolved"><ProtectedRoute component={ResolvedCases} /></Route>
      <Route path="/cases/:id"><ProtectedRoute component={CaseDetail} /></Route>
      <Route path="/apphia"><ProtectedRoute component={ApphiaChat} /></Route>
      <Route path="/preferences"><ProtectedRoute component={PreferencesQuiz} /></Route>
      <Route path="/billing"><ProtectedRoute component={Billing} /></Route>
      <Route path="/connectors"><ProtectedRoute component={Connectors} /></Route>
      <Route path="/connectors/:name"><ProtectedRoute component={ConnectorDetail} /></Route>
      <Route path="/automation"><ProtectedRoute component={AutomationCenter} /></Route>
      <Route path="/batches"><ProtectedRoute component={BatchDiagnostics} /></Route>
      <Route path="/alerts"><ProtectedRoute component={SystemAlerts} /></Route>
      <Route path="/voice"><ProtectedRoute component={VoicePanel} /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
      <Route path="/security"><ProtectedRoute component={Security} /></Route>
      <Route path="/kb"><ProtectedRoute component={KnowledgeBase} /></Route>
      <Route path="/stack-intelligence"><ProtectedRoute component={StackIntelligence} /></Route>
      <Route path="/pmo-ops"><ProtectedRoute component={PMOOps} /></Route>
      <Route path="/remote-assistance"><ProtectedRoute component={RemoteAssistance} /></Route>
      <Route path="/secure-vault"><ProtectedRoute component={SecureVault} /></Route>
      <Route path="/issue-log"><ProtectedRoute component={IssueLog} /></Route>
      <Route path="/analytics"><ProtectedRoute component={Analytics} /></Route>
      <Route path="/hosting"><ProtectedRoute component={Hosting} /></Route>
      <Route path="/admin"><ProtectedRoute component={AdminPanel} /></Route>
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
          <CookieConsent />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
