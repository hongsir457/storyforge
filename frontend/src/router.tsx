import { lazy, Suspense } from "react";
import { Redirect, Route, Switch, useSearch } from "wouter";
import { ToastOverlay } from "@/components/layout/ToastOverlay";
import { RouteLoadingState } from "@/components/shared/RouteLoadingState";
import { useAuthStore } from "@/stores/auth-store";

const HomePage = lazy(() => import("@/pages/HomePage").then((module) => ({ default: module.HomePage })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const VerifyEmailPage = lazy(() => import("@/pages/VerifyEmailPage").then((module) => ({ default: module.VerifyEmailPage })));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage").then((module) => ({ default: module.ForgotPasswordPage })));
const AccountPage = lazy(() => import("@/pages/AccountPage").then((module) => ({ default: module.AccountPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const PrivacyPage = lazy(() => import("@/pages/LegalPages").then((module) => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import("@/pages/LegalPages").then((module) => ({ default: module.TermsPage })));
const ContactPage = lazy(() => import("@/pages/LegalPages").then((module) => ({ default: module.ContactPage })));
const ProjectsPage = lazy(() => import("@/components/pages/ProjectsPage").then((module) => ({ default: module.ProjectsPage })));
const NovelWorkbenchPage = lazy(() => import("@/components/pages/NovelWorkbenchPage").then((module) => ({ default: module.NovelWorkbenchPage })));
const SystemConfigPage = lazy(() => import("@/components/pages/SystemConfigPage").then((module) => ({ default: module.SystemConfigPage })));
const ProjectSettingsPage = lazy(() => import("@/components/pages/ProjectSettingsPage").then((module) => ({ default: module.ProjectSettingsPage })));
const StudioWorkspaceRoute = lazy(() =>
  import("@/routes/StudioWorkspaceRoute").then((module) => ({ default: module.StudioWorkspaceRoute })),
);

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <RouteLoadingState />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <RouteLoadingState />;
  }

  if (isAuthenticated) {
    return <Redirect to="/app/projects" />;
  }

  return <>{children}</>;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return <RouteLoadingState />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (user?.role !== "admin") {
    return <Redirect to="/app/projects" />;
  }

  return <>{children}</>;
}

function LegacySettingsRedirect() {
  const search = useSearch();
  return <Redirect to={`/app/admin${search ? `?${search}` : ""}`} />;
}

function LazyRouteBoundary({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteLoadingState />}>{children}</Suspense>;
}

function WorkspaceRouteBoundary({ projectName }: { projectName: string | null }) {
  return (
    <Suspense fallback={<RouteLoadingState />}>
      <StudioWorkspaceRoute projectName={projectName} />
    </Suspense>
  );
}

export function AppRoutes() {
  return (
    <>
      <Switch>
        <Route path="/">
          <LazyRouteBoundary>
            <HomePage />
          </LazyRouteBoundary>
        </Route>

        <Route path="/login">
          <GuestGuard>
            <LazyRouteBoundary>
              <LoginPage />
            </LazyRouteBoundary>
          </GuestGuard>
        </Route>

        <Route path="/register">
          <GuestGuard>
            <LazyRouteBoundary>
              <RegisterPage />
            </LazyRouteBoundary>
          </GuestGuard>
        </Route>

        <Route path="/verify-email">
          <GuestGuard>
            <LazyRouteBoundary>
              <VerifyEmailPage />
            </LazyRouteBoundary>
          </GuestGuard>
        </Route>

        <Route path="/forgot-password">
          <GuestGuard>
            <LazyRouteBoundary>
              <ForgotPasswordPage />
            </LazyRouteBoundary>
          </GuestGuard>
        </Route>

        <Route path="/privacy">
          <LazyRouteBoundary>
            <PrivacyPage />
          </LazyRouteBoundary>
        </Route>

        <Route path="/terms">
          <LazyRouteBoundary>
            <TermsPage />
          </LazyRouteBoundary>
        </Route>

        <Route path="/contact">
          <LazyRouteBoundary>
            <ContactPage />
          </LazyRouteBoundary>
        </Route>

        <Route path="/app">
          <AuthGuard>
            <Redirect to="/app/projects" />
          </AuthGuard>
        </Route>

        <Route path="/app/projects">
          <AuthGuard>
            <LazyRouteBoundary>
              <ProjectsPage />
            </LazyRouteBoundary>
          </AuthGuard>
        </Route>

        <Route path="/app/novel-workbench">
          <AuthGuard>
            <LazyRouteBoundary>
              <NovelWorkbenchPage />
            </LazyRouteBoundary>
          </AuthGuard>
        </Route>

        <Route path="/app/settings">
          <AuthGuard>
            <LegacySettingsRedirect />
          </AuthGuard>
        </Route>

        <Route path="/app/admin">
          <AdminGuard>
            <LazyRouteBoundary>
              <SystemConfigPage />
            </LazyRouteBoundary>
          </AdminGuard>
        </Route>

        <Route path="/app/account">
          <AuthGuard>
            <LazyRouteBoundary>
              <AccountPage />
            </LazyRouteBoundary>
          </AuthGuard>
        </Route>

        <Route path="/app/projects/:projectName/settings">
          <AuthGuard>
            <LazyRouteBoundary>
              <ProjectSettingsPage />
            </LazyRouteBoundary>
          </AuthGuard>
        </Route>

        <Route path="/app/projects/:projectName" nest>
          {(params) => (
            <AuthGuard>
              <WorkspaceRouteBoundary projectName={params.projectName ?? null} />
            </AuthGuard>
          )}
        </Route>

        <Route>
          <LazyRouteBoundary>
            <NotFoundPage />
          </LazyRouteBoundary>
        </Route>
      </Switch>
      <ToastOverlay />
    </>
  );
}
