import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { routes } from "./lib/routes";

// Layouts
import { PublicLayout } from "./routes/PublicLayout";
import { AppLayout } from "./routes/AppLayout";

// Public pages
import { LandingPage } from "./routes/public/LandingPage";
import { UseCasesPage } from "./routes/public/UseCasesPage";
import { PricingPage } from "./routes/public/PricingPage";
import { AboutPage } from "./routes/public/AboutPage";
import { ContactPage } from "./routes/public/ContactPage";
import { LegalPage } from "./routes/public/LegalPage";
import { PrivacyPage } from "./routes/public/PrivacyPage";

// Auth pages
import { LoginPage } from "./routes/auth/LoginPage";
import { RegisterPage } from "./routes/auth/RegisterPage";
import { ForgotPasswordPage } from "./routes/auth/ForgotPasswordPage";

// App pages
import { OverviewPage } from "./routes/app/OverviewPage";
import { DocumentsPage } from "./routes/app/DocumentsPage";
import { ChatPage } from "./routes/app/ChatPage";
import { WorkspacesPage } from "./routes/app/WorkspacesPage";
import { WorkspaceDetailPage } from "./routes/app/WorkspaceDetailPage";
import { HistoryPage } from "./routes/app/HistoryPage";
import { HistoryDetailPage } from "./routes/app/HistoryDetailPage";
import { EvaluationPage } from "./routes/app/EvaluationPage";
import { SettingsPage } from "./routes/app/SettingsPage";
import { BillingPage } from "./routes/app/BillingPage";
import { AccountPage } from "./routes/app/AccountPage";
import { HelpPage } from "./routes/app/HelpPage";
import { GuidePage } from "./routes/app/GuidePage";
import { FeedbackPage } from "./routes/app/FeedbackPage";
import { ComingSoonPage } from "./routes/app/ComingSoonPage";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <Routes>
              {/* Public routes */}
              <Route element={<PublicLayout />}>
                <Route path={routes.home} element={<LandingPage />} />
                <Route path={routes.useCases} element={<UseCasesPage />} />
                <Route path={routes.pricing} element={<PricingPage />} />
                <Route path={routes.about} element={<AboutPage />} />
                <Route path={routes.contact} element={<ContactPage />} />
                <Route path={routes.legal} element={<LegalPage />} />
                <Route path={routes.privacy} element={<PrivacyPage />} />
              </Route>

              {/* Auth routes */}
              <Route path={routes.login} element={<LoginPage />} />
              <Route path={routes.register} element={<RegisterPage />} />
              <Route path={routes.forgotPassword} element={<ForgotPasswordPage />} />

              {/* App routes (protected) */}
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Navigate to={routes.app.overview} replace />} />
                <Route path="overview" element={<OverviewPage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="workspaces" element={<WorkspacesPage />} />
                <Route path="workspaces/:workspaceId" element={<WorkspaceDetailPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="history/:historyId" element={<HistoryDetailPage />} />
                <Route path="evaluation" element={<EvaluationPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="account" element={<AccountPage />} />
                <Route path="help" element={<HelpPage />} />
                <Route path="guide" element={<GuidePage />} />
                <Route path="feedback" element={<FeedbackPage />} />
                <Route path="videos" element={<ComingSoonPage />} />
                <Route path="community" element={<ComingSoonPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
