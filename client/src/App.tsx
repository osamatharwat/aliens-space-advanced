import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PublicCatalogPage from "./pages/PublicCatalogPage";
import ScopedModulePage from "./pages/ScopedModulePage";
import { DashboardPage, GuestCertificatePage, ProfilePage, RecruitmentPage, ResetPasswordPage, VerifyPage, WorkspacePage } from "./pages/PortalPages";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/committees" component={PublicCatalogPage} />
      <Route path="/events" component={PublicCatalogPage} />
      <Route path="/gallery" component={PublicCatalogPage} />
      <Route path="/projects" component={PublicCatalogPage} />
      <Route path="/members" component={PublicCatalogPage} />
      <Route path="/partners" component={PublicCatalogPage} />
      <Route path="/about" component={PublicCatalogPage} />
      <Route path="/pr" component={PublicCatalogPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/workspace" component={WorkspacePage} />
      <Route path="/workspace/committee" component={ScopedModulePage} />
      <Route path="/workspace/ir" component={ScopedModulePage} />
      <Route path="/workspace/leadership" component={ScopedModulePage} />
      <Route path="/workspace/og" component={ScopedModulePage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/recruitment" component={RecruitmentPage} />
      <Route path="/verify" component={VerifyPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/certificate-access" component={GuestCertificatePage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
