import { useEffect } from "react";
import { Redirect, Route, Switch, useParams } from "wouter";
import { StudioLayout } from "@/components/layout";
import { StudioCanvasRouter } from "@/components/canvas/StudioCanvasRouter";
import { ProjectsPage } from "@/components/pages/ProjectsPage";
import { NovelWorkbenchPage } from "@/components/pages/NovelWorkbenchPage";
import { SystemConfigPage } from "@/components/pages/SystemConfigPage";
import { ProjectSettingsPage } from "@/components/pages/ProjectSettingsPage";
import { ToastOverlay } from "@/components/layout/ToastOverlay";
import { API } from "@/api";
import { useProjectsStore } from "@/stores/projects-store";
import { useAssistantStore } from "@/stores/assistant-store";
import { useAuthStore } from "@/stores/auth-store";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { VerifyEmailPage } from "@/pages/VerifyEmailPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { HomePage } from "@/pages/HomePage";
import { AccountPage } from "@/pages/AccountPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-400">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-400">
        Loading...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/app/projects" />;
  }

  return <>{children}</>;
}

function StudioWorkspace() {
  const params = useParams<{ projectName: string }>();
  const projectName = params.projectName ?? null;
  const { setCurrentProject, setProjectDetailLoading } = useProjectsStore();

  useEffect(() => {
    if (!projectName) return;
    let cancelled = false;

    const assistantState = useAssistantStore.getState();
    assistantState.setSessions([]);
    assistantState.setCurrentSessionId(null);
    assistantState.setTurns([]);
    assistantState.setDraftTurn(null);
    assistantState.setSessionStatus(null);
    assistantState.setIsDraftSession(false);

    setProjectDetailLoading(true);
    API.getProject(projectName)
      .then((res) => {
        if (!cancelled) {
          setCurrentProject(projectName, res.project, res.scripts ?? {}, res.asset_fingerprints);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentProject(projectName, null);
        }
      })
      .finally(() => {
        if (!cancelled) setProjectDetailLoading(false);
      });

    return () => {
      cancelled = true;
      setCurrentProject(null, null);
    };
  }, [projectName, setCurrentProject, setProjectDetailLoading]);

  return (
    <StudioLayout>
      <StudioCanvasRouter />
    </StudioLayout>
  );
}

export function AppRoutes() {
  return (
    <>
      <Switch>
        <Route path="/">
          <HomePage />
        </Route>

        <Route path="/login">
          <GuestGuard>
            <LoginPage />
          </GuestGuard>
        </Route>

        <Route path="/register">
          <GuestGuard>
            <RegisterPage />
          </GuestGuard>
        </Route>

        <Route path="/verify-email">
          <GuestGuard>
            <VerifyEmailPage />
          </GuestGuard>
        </Route>

        <Route path="/forgot-password">
          <GuestGuard>
            <ForgotPasswordPage />
          </GuestGuard>
        </Route>

        <Route path="/app">
          <AuthGuard>
            <Redirect to="/app/projects" />
          </AuthGuard>
        </Route>

        <Route path="/app/projects">
          <AuthGuard>
            <ProjectsPage />
          </AuthGuard>
        </Route>

        <Route path="/app/novel-workbench">
          <AuthGuard>
            <NovelWorkbenchPage />
          </AuthGuard>
        </Route>

        <Route path="/app/settings">
          <AuthGuard>
            <SystemConfigPage />
          </AuthGuard>
        </Route>

        <Route path="/app/account">
          <AuthGuard>
            <AccountPage />
          </AuthGuard>
        </Route>

        <Route path="/app/projects/:projectName/settings">
          <AuthGuard>
            <ProjectSettingsPage />
          </AuthGuard>
        </Route>

        <Route path="/app/projects/:projectName" nest>
          <AuthGuard>
            <StudioWorkspace />
          </AuthGuard>
        </Route>

        <Route>
          <NotFoundPage />
        </Route>
      </Switch>
      <ToastOverlay />
    </>
  );
}
