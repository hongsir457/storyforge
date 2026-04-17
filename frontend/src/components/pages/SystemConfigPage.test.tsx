import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import { API } from "@/api";
import { SystemConfigPage } from "@/components/pages/SystemConfigPage";
import { useAuthStore } from "@/stores/auth-store";
import { useConfigStatusStore } from "@/stores/config-status-store";
import type { GetSystemConfigResponse, ProviderInfo } from "@/types";

function makeConfigResponse(
  overrides?: Partial<GetSystemConfigResponse["settings"]>,
): GetSystemConfigResponse {
  return {
    settings: {
      default_video_backend: "gemini/veo-3",
      default_image_backend: "gemini/imagen-4",
      default_text_backend: "",
      text_backend_script: "",
      text_backend_overview: "",
      text_backend_style: "",
      video_generate_audio: true,
      anthropic_api_key: { is_set: true, masked: "sk-ant-***" },
      anthropic_auth_token: { is_set: false, masked: null },
      anthropic_base_url: "",
      anthropic_model: "",
      anthropic_default_haiku_model: "",
      anthropic_default_opus_model: "",
      anthropic_default_sonnet_model: "",
      claude_code_subagent_model: "",
      agent_session_cleanup_delay_seconds: 300,
      agent_max_concurrent_sessions: 5,
      ...overrides,
    },
    options: {
      video_backends: ["gemini/veo-3"],
      image_backends: ["gemini/imagen-4"],
      text_backends: [],
    },
  };
}

function makeProviders(overrides?: Partial<ProviderInfo>): { providers: ProviderInfo[] } {
  return {
    providers: [
      {
        id: "gemini",
        display_name: "Google Gemini",
        description: "Google Gemini API",
        status: "ready",
        media_types: ["image", "video", "text"],
        capabilities: [],
        configured_keys: ["api_key"],
        missing_keys: [],
        models: {},
        ...overrides,
      },
    ],
  };
}

function renderPage(path = "/app/admin") {
  const location = memoryLocation({ path, record: true });
  return render(
    <Router hook={location.hook}>
      <SystemConfigPage />
    </Router>,
  );
}

describe("SystemConfigPage", () => {
  beforeEach(() => {
    useConfigStatusStore.setState(useConfigStatusStore.getInitialState(), true);
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      token: "token",
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

    vi.spyOn(API, "getSystemConfig").mockResolvedValue(makeConfigResponse());
    vi.spyOn(API, "getProviders").mockResolvedValue(makeProviders());
    vi.spyOn(API, "listCustomProviders").mockResolvedValue({ providers: [] });
    vi.spyOn(API, "getProviderConfig").mockResolvedValue({
      id: "gemini",
      display_name: "Google Gemini",
      status: "ready",
      media_types: ["image", "video"],
      capabilities: [],
      fields: [],
    } as never);
    vi.spyOn(API, "listCredentials").mockResolvedValue({ credentials: [] });
    vi.spyOn(API, "getUsageStatsGrouped").mockResolvedValue({ stats: [], period: { start: "", end: "" } });
  });

  it("renders the admin console header", () => {
    renderPage();
    expect(screen.getByText("管理控制台")).toBeInTheDocument();
    expect(screen.getByText("仅管理员可见：供应商、模型、用量和 API Key 管理")).toBeInTheDocument();
  });

  it("renders all 5 sidebar sections", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /Agents|智能体/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Providers|供应商/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Models|模型选择/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Usage|用量统计/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /API Keys|API 管理/ })).toBeInTheDocument();
  });

  it("defaults to the agent section", () => {
    renderPage();
    const agentButton = screen.getByRole("button", { name: /Agents|智能体/ });
    expect(agentButton.className).toContain("border-indigo-500");
  });

  it("switches sections from the sidebar", async () => {
    renderPage();
    const providersButton = screen.getByRole("button", { name: /Providers|供应商/ });
    fireEvent.click(providersButton);
    await waitFor(() => {
      expect(providersButton.className).toContain("border-indigo-500");
    });
  });

  it("shows config warning banner when there are config issues", async () => {
    vi.spyOn(API, "getSystemConfig").mockResolvedValue(
      makeConfigResponse({ anthropic_api_key: { is_set: false, masked: null } }),
    );
    vi.spyOn(API, "getProviders").mockResolvedValue(makeProviders({ status: "ready" }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/The following issues were found|当前配置存在以下问题/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Storyforge.*API Key/)).toBeInTheDocument();
  });

  it("does not show warning banner when config is complete", async () => {
    renderPage();

    await waitFor(() => {
      expect(API.getProviders).toHaveBeenCalled();
    });

    expect(screen.queryByText(/The following issues were found|当前配置存在以下问题/)).not.toBeInTheDocument();
  });

  it("renders the back link that navigates to projects", () => {
    renderPage();
    const link = screen.getByRole("link", { name: /Back|返回/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/app/projects");
  });
});
