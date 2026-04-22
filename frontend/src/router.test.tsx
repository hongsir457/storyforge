import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { API } from "@/api";
import { AppRoutes } from "@/router";
import { useAssistantStore } from "@/stores/assistant-store";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectsStore } from "@/stores/projects-store";

vi.mock("@/components/layout", () => ({
  StudioLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="studio-layout">{children}</div>
  ),
}));

vi.mock("@/components/canvas/StudioCanvasRouter", () => ({
  StudioCanvasRouter: () => <div data-testid="studio-canvas-router">Studio Canvas</div>,
}));

vi.mock("@/components/pages/ProjectsPage", () => ({
  ProjectsPage: () => <div data-testid="projects-page">Projects Page</div>,
}));

vi.mock("@/components/pages/SystemConfigPage", () => ({
  SystemConfigPage: () => <div data-testid="admin-page">Admin Console</div>,
}));

function renderAt(path: string) {
  const { hook } = memoryLocation({ path });
  return render(
    <Router hook={hook}>
      <AppRoutes />
    </Router>,
  );
}

function resetStores(): void {
  useProjectsStore.setState(useProjectsStore.getInitialState(), true);
  useAssistantStore.setState(useAssistantStore.getInitialState(), true);
}

describe("AppRoutes", () => {
  beforeEach(() => {
    resetStores();
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: "admin",
        username: "admin",
        email: "admin@example.com",
        display_name: "Admin",
        role: "admin",
        is_active: true,
        is_email_verified: true,
      },
    });
    vi.restoreAllMocks();
  });

  it("renders the public home page at root", async () => {
    renderAt("/");
    expect((await screen.findAllByText("AutoNovel")).length).toBeGreaterThan(0);
  });

  it("redirects /app to /app/projects", async () => {
    renderAt("/app");
    expect(await screen.findByTestId("projects-page")).toBeInTheDocument();
  });

  it("renders admin console for admin users", async () => {
    renderAt("/app/admin");
    expect(await screen.findByTestId("admin-page")).toBeInTheDocument();
  });

  it("redirects non-admin users away from admin routes", async () => {
    useAuthStore.setState({
      user: {
        id: "user-1",
        username: "frametale_demo",
        email: "demo@example.com",
        display_name: "Demo",
        role: "user",
        is_active: true,
        is_email_verified: true,
      },
    });

    renderAt("/app/admin");
    expect(await screen.findByTestId("projects-page")).toBeInTheDocument();
  });

  it("renders 404 for unknown routes", async () => {
    renderAt("/not-found");
    expect(await screen.findByText("404")).toBeInTheDocument();
    expect(await screen.findByText("这个入口不在当前的叙事版图里。")).toBeInTheDocument();
  });

  it("loads project workspace and resets assistant state", async () => {
    vi.spyOn(API, "getProject").mockResolvedValue({
      project: {
        title: "Demo Project",
        content_mode: "narration",
        style: "Anime",
        episodes: [],
        characters: {},
        clues: {},
      },
      scripts: {},
    });

    useAssistantStore.setState({
      sessions: [
        {
          id: "session-1",
          project_name: "old",
          title: "Old",
          status: "idle",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      currentSessionId: "session-1",
      turns: [{ type: "user", content: [{ type: "text", text: "hello" }] }],
      draftTurn: { type: "assistant", content: [{ type: "text", text: "draft" }] },
      sessionStatus: "running",
      isDraftSession: true,
    });

    const view = renderAt("/app/projects/demo");

    expect(await screen.findByTestId("studio-layout")).toBeInTheDocument();
    expect(await screen.findByTestId("studio-canvas-router")).toBeInTheDocument();
    await waitFor(() => {
      expect(API.getProject).toHaveBeenCalledWith("demo");
    });

    const assistant = useAssistantStore.getState();
    expect(assistant.sessions).toEqual([]);
    expect(assistant.currentSessionId).toBeNull();
    expect(assistant.turns).toEqual([]);
    expect(assistant.draftTurn).toBeNull();
    expect(assistant.sessionStatus).toBeNull();
    expect(assistant.isDraftSession).toBe(false);

    await waitFor(() => {
      const projectState = useProjectsStore.getState();
      expect(projectState.currentProjectName).toBe("demo");
      expect(projectState.currentProjectData?.title).toBe("Demo Project");
      expect(projectState.projectDetailLoading).toBe(false);
    });

    view.unmount();
    expect(useProjectsStore.getState().currentProjectName).toBeNull();
    expect(useProjectsStore.getState().currentProjectData).toBeNull();
  });

  it("decodes encoded project names before loading the workspace", async () => {
    vi.spyOn(API, "getProject").mockResolvedValue({
      project: {
        title: "深度",
        content_mode: "narration",
        style: "Editorial",
        episodes: [],
        characters: {},
        clues: {},
      },
      scripts: {},
    });

    renderAt("/app/projects/%E6%B7%B1%E5%BA%A6");

    expect(await screen.findByTestId("studio-layout")).toBeInTheDocument();
    await waitFor(() => {
      expect(API.getProject).toHaveBeenCalledWith("深度");
    });
  });

  it("keeps project name when loading project details fails", async () => {
    vi.spyOn(API, "getProject").mockRejectedValue(new Error("network"));

    renderAt("/app/projects/fail-demo");

    expect(await screen.findByTestId("studio-layout")).toBeInTheDocument();
    await waitFor(() => {
      const projectState = useProjectsStore.getState();
      expect(projectState.currentProjectName).toBe("fail-demo");
      expect(projectState.currentProjectData).toBeNull();
      expect(projectState.projectDetailLoading).toBe(false);
    });
  });
});
