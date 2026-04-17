import { create } from "zustand";
import { API } from "@/api";
import { useAuthStore } from "@/stores/auth-store";

// ---------------------------------------------------------------------------
// ConfigIssue
// ---------------------------------------------------------------------------

export interface ConfigIssue {
  key: string;
  tab: "agent" | "providers" | "media" | "usage";
  label: string;
}

async function getConfigIssues(): Promise<ConfigIssue[]> {
  const role = useAuthStore.getState().user?.role;
  if (role !== "admin") {
    return [];
  }

  const issues: ConfigIssue[] = [];

  const [{ providers }, configRes] = await Promise.all([
    API.getProviders(),
    API.getSystemConfig(),
  ]);

  const settings = configRes.settings;

  // 1. Check anthropic key
  if (!settings.anthropic_api_key?.is_set && !settings.anthropic_auth_token?.is_set) {
    issues.push({
      key: "anthropic",
      tab: "agent",
      label: "agent_api_key_not_configured",
    });
  }

  // 2. Check any provider supports each media type
  const readyProviders = providers.filter((p) => p.status === "ready");

  const hasMediaType = (type: string) =>
    readyProviders.some((p) => p.media_types.includes(type));

  if (!hasMediaType("video")) {
    issues.push({
      key: "no-video-provider",
      tab: "providers",
      label: "video_provider_not_configured",
    });
  }
  if (!hasMediaType("image")) {
    issues.push({
      key: "no-image-provider",
      tab: "providers",
      label: "image_provider_not_configured",
    });
  }
  if (!hasMediaType("text")) {
    issues.push({
      key: "no-text-provider",
      tab: "providers",
      label: "text_provider_not_configured",
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface ConfigStatusState {
  issues: ConfigIssue[];
  isComplete: boolean;
  loading: boolean;
  initialized: boolean;
  lastRole: string | null;
  fetch: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useConfigStatusStore = create<ConfigStatusState>((set, get) => ({
  issues: [],
  isComplete: true,
  loading: false,
  initialized: false,
  lastRole: null,

  fetch: async () => {
    const currentRole = useAuthStore.getState().user?.role ?? null;
    if (get().loading) return;
    if (get().initialized && get().lastRole === currentRole) return;
    await get().refresh();
  },

  refresh: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const issues = await getConfigIssues();
      set({
        issues,
        isComplete: issues.length === 0,
        loading: false,
        initialized: true,
        lastRole: useAuthStore.getState().user?.role ?? null,
      });
    } catch {
      set({
        issues: [],
        isComplete: true,
        loading: false,
        initialized: true,
        lastRole: useAuthStore.getState().user?.role ?? null,
      });
    }
  },
}));
