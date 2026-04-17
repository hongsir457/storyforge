/**
 * API 璋冪敤灏佽 (TypeScript)
 *
 * Typed API layer for all backend endpoints.
 * Import: import { API } from '@/api';
 */

import type {
  ProjectData,
  ProjectSummary,
  ImportConflictPolicy,
  ImportProjectResponse,
  ExportDiagnostics,
  ImportFailureDiagnostics,
  EpisodeScript,
  TaskItem,
  TaskStats,
  SessionMeta,
  AssistantSnapshot,
  SkillInfo,
  ProjectOverview,
  ProjectChangeBatchPayload,
  ProjectEventSnapshotPayload,
  GetSystemConfigResponse,
  SystemConfigPatch,
  ApiKeyInfo,
  CreateApiKeyResponse,
  ProviderInfo,
  ProviderConfigDetail,
  ProviderTestResult,
  ProviderCredential,
  UsageStatsResponse,
  CustomProviderInfo,
  CustomProviderModelInfo,
  CustomProviderCreateRequest,
  CustomProviderModelInput,
  DiscoveredModel,
  CostEstimateResponse,
  NovelWorkbenchArtifactContentResponse,
  NovelWorkbenchArtifactListResponse,
  NovelWorkbenchJob,
  NovelWorkbenchStatus,
} from "@/types";
import type { GridGeneration } from "@/types/grid";
import { getToken, clearToken } from "@/utils/auth";
import i18n from "./i18n";

// ==================== Helper types ====================

/** Version metadata returned by the versions API. */
export interface VersionInfo {
  version: number;
  filename: string;
  created_at: string;
  file_size: number;
  is_current: boolean;
  file_url?: string;
  prompt?: string;
  restored_from?: number;
}

/** Options for {@link API.openTaskStream}. */
export interface TaskStreamOptions {
  projectName?: string;
  lastEventId?: number | string;
  onSnapshot?: (payload: TaskStreamSnapshotPayload, event: MessageEvent) => void;
  onTask?: (payload: TaskStreamTaskPayload, event: MessageEvent) => void;
  onError?: (event: Event) => void;
}

export interface TaskStreamSnapshotPayload {
  tasks: TaskItem[];
  stats: TaskStats;
}

export interface TaskStreamTaskPayload {
  action: "created" | "updated";
  task: TaskItem;
  stats: TaskStats;
}

export interface ProjectEventStreamOptions {
  projectName: string;
  onSnapshot?: (payload: ProjectEventSnapshotPayload, event: MessageEvent) => void;
  onChanges?: (payload: ProjectChangeBatchPayload, event: MessageEvent) => void;
  onError?: (event: Event) => void;
}

/** Filters for {@link API.listTasks} and {@link API.listProjectTasks}. */
export interface TaskListFilters {
  projectName?: string;
  status?: string;
  taskType?: string;
  source?: string;
  page?: number;
  pageSize?: number;
}

/** Filters for {@link API.getUsageStats} and {@link API.getUsageCalls}. */
export interface UsageStatsFilters {
  projectName?: string;
  startDate?: string;
  endDate?: string;
}

export interface UsageCallsFilters {
  projectName?: string;
  callType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

/** Generic success response used by many endpoints. */
export interface SuccessResponse {
  success: boolean;
  message?: string;
  email_delivery?: "sent" | "debug_logged" | "unavailable" | "failed";
}

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  display_name: string;
  role: string;
  is_active: boolean;
  is_email_verified: boolean;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface RegisterResponse {
  success: boolean;
  email: string;
  verification_required: boolean;
  email_delivery: "sent" | "debug_logged" | "unavailable" | "failed";
}

/** Draft metadata returned by listDrafts. */
export interface DraftInfo {
  episode: number;
  step: number;
  filename: string;
  modified_at: string;
}

function normalizeDiagnosticsBucket(value: unknown): { code: string; message: string; location?: string }[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(
      (item): item is { code: string; message: string; location?: string } =>
        Boolean(item)
        && typeof item === "object"
        && typeof (item as { code?: unknown }).code === "string"
        && typeof (item as { message?: unknown }).message === "string"
    )
    .map((item) => ({
      code: item.code,
      message: item.message,
      ...(typeof item.location === "string" ? { location: item.location } : {}),
    }));
}

function normalizeImportFailureDiagnostics(value: unknown): ImportFailureDiagnostics {
  const payload = (value && typeof value === "object") ? value as Record<string, unknown> : {};
  return {
    blocking: normalizeDiagnosticsBucket(payload.blocking),
    auto_fixable: normalizeDiagnosticsBucket(payload.auto_fixable),
    warnings: normalizeDiagnosticsBucket(payload.warnings),
  };
}

function normalizeExportDiagnostics(value: unknown): ExportDiagnostics {
  const payload = (value && typeof value === "object") ? value as Record<string, unknown> : {};
  return {
    blocking: normalizeDiagnosticsBucket(payload.blocking),
    auto_fixed: normalizeDiagnosticsBucket(payload.auto_fixed),
    warnings: normalizeDiagnosticsBucket(payload.warnings),
  };
}

// ==================== API class ====================

const API_BASE = "/api/v1";

/**
 * 妫€鏌?fetch 鍝嶅簲鐘舵€侊紝鎶涘嚭鍖呭惈鍚庣閿欒淇℃伅鐨?Error銆?
 * 鐢ㄤ簬涓嶇粡杩?API.request() 鐨勮嚜瀹氫箟 fetch 璋冪敤銆?
 */
interface RequestOptions extends RequestInit {
  redirectOnUnauthorized?: boolean;
}

async function throwIfNotOk(
  response: Response,
  fallbackMsg: string,
  { redirectOnUnauthorized = true }: Pick<RequestOptions, "redirectOnUnauthorized"> = {},
): Promise<void> {
  if (!response.ok) {
    handleUnauthorized(response, redirectOnUnauthorized);
    const error = await response
      .json()
      .catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || fallbackMsg);
  }
}

function handleUnauthorized(response: Response, redirectOnUnauthorized = true): void {
  if (response.status !== 401) return;

  clearToken();
  if (redirectOnUnauthorized) {
    globalThis.location.href = "/login";
  }
  throw new Error("Authentication expired, please log in again");
}

/** 注入 Authorization 与语言头 */
function withAuth(options: RequestInit = {}): RequestInit {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // Add Accept-Language header based on current i18n language
  headers.set("Accept-Language", i18n.language || "zh");
  return { ...options, headers };
}

/** 涓?URL 杩藉姞 token query param锛堢敤浜?EventSource锛?*/
function withAuthQuery(url: string): string {
  const token = getToken();
  if (!token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

class API {
  /**
   * 閫氱敤璇锋眰鏂规硶
   */
  static async request<T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const { redirectOnUnauthorized = true, ...requestInit } = options;
    const defaultOptions: RequestInit = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const response = await fetch(url, withAuth({ ...defaultOptions, ...requestInit }));

    if (!response.ok) {
      handleUnauthorized(response, redirectOnUnauthorized);
      const error = await response
        .json()
        .catch(() => ({ detail: response.statusText }));
      let message = "璇锋眰澶辫触";
      if (typeof error.detail === "string") {
        message = error.detail;
      } else if (Array.isArray(error.detail) && error.detail.length > 0) {
        message = error.detail.map((e: string | { msg?: string }) => (typeof e === "string" ? e : e?.msg)).filter(Boolean).join("; ") || message;
      }
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return response.json();
  }

  // ==================== 绯荤粺閰嶇疆 ====================

  static async publicRequest<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("Accept-Language", i18n.language || "zh");

    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(typeof error.detail === "string" ? error.detail : response.statusText);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return response.json();
  }

  static async login(identifier: string, password: string): Promise<AuthTokenResponse> {
    const body = new URLSearchParams({
      username: identifier,
      password,
      grant_type: "password",
    });

    const response = await fetch(`${API_BASE}/auth/token`, {
      method: "POST",
      headers: {
        "Accept-Language": i18n.language || "zh",
      },
      body,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(typeof error.detail === "string" ? error.detail : response.statusText);
    }

    return response.json();
  }

  static async getMe(): Promise<AuthUser> {
    return this.request("/auth/me", { redirectOnUnauthorized: false });
  }

  static async register(payload: {
    username: string;
    email: string;
    password: string;
    display_name?: string;
  }): Promise<RegisterResponse> {
    return this.publicRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  static async requestEmailVerification(email: string): Promise<SuccessResponse> {
    return this.publicRequest("/auth/verify-email/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  static async confirmEmailVerification(email: string, code: string): Promise<AuthTokenResponse> {
    return this.publicRequest("/auth/verify-email/confirm", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
  }

  static async forgotPassword(email: string): Promise<SuccessResponse> {
    return this.publicRequest("/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  static async resetPassword(email: string, code: string, newPassword: string): Promise<SuccessResponse> {
    return this.publicRequest("/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ email, code, new_password: newPassword }),
    });
  }

  static async updateProfile(payload: { display_name: string }): Promise<AuthUser> {
    return this.request("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  static async changePassword(currentPassword: string, newPassword: string): Promise<SuccessResponse> {
    return this.request("/auth/password/change", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }

  static async getSystemConfig(): Promise<GetSystemConfigResponse> {
    return this.request("/system/config");
  }

  static async updateSystemConfig(
    patch: SystemConfigPatch,
  ): Promise<GetSystemConfigResponse> {
    return this.request("/system/config", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }


  // ==================== 椤圭洰绠＄悊 ====================

  static async listProjects(): Promise<{ projects: ProjectSummary[] }> {
    return this.request("/projects");
  }

  static async createProject(
    title: string,
    style: string = "",
    contentMode: string = "narration",
    aspectRatio: string = "9:16",
    defaultDuration: number | null = null,
    generationMode: "single" | "grid" = "single",
  ): Promise<{ success: boolean; name: string; project: ProjectData }> {
    return this.request("/projects", {
      method: "POST",
      body: JSON.stringify({
        title,
        style,
        content_mode: contentMode,
        aspect_ratio: aspectRatio,
        default_duration: defaultDuration,
        generation_mode: generationMode,
      }),
    });
  }

  static async getProject(
    name: string
  ): Promise<{
    project: ProjectData;
    scripts: Record<string, EpisodeScript>;
    asset_fingerprints?: Record<string, number>;
  }> {
    return this.request(`/projects/${encodeURIComponent(name)}`);
  }

  static async updateProject(
    name: string,
    updates: Partial<ProjectData>
  ): Promise<{ success: boolean; project: ProjectData }> {
    if ("content_mode" in updates) {
      throw new Error("Project mode cannot be changed after creation");
    }
    return this.request(`/projects/${encodeURIComponent(name)}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  static async deleteProject(name: string): Promise<SuccessResponse> {
    return this.request(`/projects/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  }

  static async getNovelWorkbenchStatus(): Promise<NovelWorkbenchStatus> {
    return this.request("/novel-workbench/status");
  }

  static async listNovelWorkbenchJobs(): Promise<{ jobs: NovelWorkbenchJob[] }> {
    return this.request("/novel-workbench/jobs");
  }

  static async getNovelWorkbenchJob(jobId: string): Promise<{ job: NovelWorkbenchJob }> {
    return this.request(`/novel-workbench/jobs/${encodeURIComponent(jobId)}`);
  }

  static async createNovelWorkbenchJob(payload: {
    title: string;
    seed_text: string;
    project_name?: string;
    style?: string;
    aspect_ratio?: "9:16" | "16:9";
    default_duration?: 4 | 6 | 8;
  }): Promise<{ success: boolean; job: NovelWorkbenchJob }> {
    return this.request("/novel-workbench/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  static async cancelNovelWorkbenchJob(jobId: string): Promise<{ success: boolean; job: NovelWorkbenchJob }> {
    return this.request(`/novel-workbench/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
    });
  }

  static async deleteNovelWorkbenchJob(jobId: string): Promise<{ success: boolean; job: NovelWorkbenchJob }> {
    return this.request(`/novel-workbench/jobs/${encodeURIComponent(jobId)}`, {
      method: "DELETE",
    });
  }

  static async listNovelWorkbenchArtifacts(jobId: string): Promise<NovelWorkbenchArtifactListResponse> {
    return this.request(`/novel-workbench/jobs/${encodeURIComponent(jobId)}/artifacts`);
  }

  static async getNovelWorkbenchArtifactContent(
    jobId: string,
    path: string,
  ): Promise<NovelWorkbenchArtifactContentResponse> {
    return this.request(
      `/novel-workbench/jobs/${encodeURIComponent(jobId)}/artifacts/content?path=${encodeURIComponent(path)}`,
    );
  }

  static async downloadNovelWorkbenchArtifact(jobId: string, path: string): Promise<Blob> {
    const response = await fetch(
      `${API_BASE}/novel-workbench/jobs/${encodeURIComponent(jobId)}/artifacts/download?path=${encodeURIComponent(path)}`,
      withAuth(),
    );
    await throwIfNotOk(response, "Failed to download novel artifact");
    return response.blob();
  }

  static async requestExportToken(
    projectName: string,
    scope: "full" | "current" = "full"
  ): Promise<{ download_token: string; expires_in: number; diagnostics: ExportDiagnostics }> {
    const payload = await this.request<{
      download_token: string;
      expires_in: number;
      diagnostics?: unknown;
    }>(
      `/projects/${encodeURIComponent(projectName)}/export/token?scope=${encodeURIComponent(scope)}`,
      {
        method: "POST",
      }
    );
    return {
      download_token: payload.download_token,
      expires_in: payload.expires_in,
      diagnostics: normalizeExportDiagnostics(payload.diagnostics),
    };
  }

  static getExportDownloadUrl(
    projectName: string,
    downloadToken: string,
    scope: "full" | "current" = "full"
  ): string {
    return `${API_BASE}/projects/${encodeURIComponent(projectName)}/export?download_token=${encodeURIComponent(downloadToken)}&scope=${encodeURIComponent(scope)}`;
  }

  /** 鏋勯€犲壀鏄犺崏绋夸笅杞?URL */
  static getJianyingDraftDownloadUrl(
    projectName: string,
    episode: number,
    draftPath: string,
    downloadToken: string,
    jianyingVersion: string = "6",
  ): string {
    return `${API_BASE}/projects/${encodeURIComponent(projectName)}/export/jianying-draft?episode=${encodeURIComponent(episode)}&draft_path=${encodeURIComponent(draftPath)}&download_token=${encodeURIComponent(downloadToken)}&jianying_version=${encodeURIComponent(jianyingVersion)}`;
  }

  static async importProject(
    file: File,
    conflictPolicy: ImportConflictPolicy = "prompt"
  ): Promise<ImportProjectResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("conflict_policy", conflictPolicy);

    const response = await fetch(
      `${API_BASE}/projects/import`,
      withAuth({
        method: "POST",
        body: formData,
      })
    );

    if (!response.ok) {
      handleUnauthorized(response);

      const payload = await response
        .json()
        .catch(() => ({ detail: response.statusText, errors: [], warnings: [] }));
      const error = new Error(
        typeof payload.detail === "string" ? payload.detail : "瀵煎叆澶辫触"
      ) as Error & {
        status?: number;
        detail?: string;
        errors?: string[];
        warnings?: string[];
        conflict_project_name?: string;
        diagnostics?: ImportFailureDiagnostics;
      };
      error.status = response.status;
      error.detail = typeof payload.detail === "string" ? payload.detail : "瀵煎叆澶辫触";
      error.errors = Array.isArray(payload.errors) ? payload.errors : [];
      error.warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
      if (typeof payload.conflict_project_name === "string") {
        error.conflict_project_name = payload.conflict_project_name;
      }
      error.diagnostics = normalizeImportFailureDiagnostics(payload.diagnostics);
      throw error;
    }

    const payload = await response.json();
    return {
      ...payload,
      diagnostics: {
        auto_fixed: normalizeDiagnosticsBucket(payload?.diagnostics?.auto_fixed),
        warnings: normalizeDiagnosticsBucket(payload?.diagnostics?.warnings),
      },
    };
  }

  // ==================== 瑙掕壊绠＄悊 ====================

  static async addCharacter(
    projectName: string,
    name: string,
    description: string,
    voiceStyle: string = ""
  ): Promise<SuccessResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/characters`,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          voice_style: voiceStyle,
        }),
      }
    );
  }

  static async updateCharacter(
    projectName: string,
    charName: string,
    updates: Record<string, unknown>
  ): Promise<SuccessResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/characters/${encodeURIComponent(charName)}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      }
    );
  }

  static async deleteCharacter(
    projectName: string,
    charName: string
  ): Promise<SuccessResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/characters/${encodeURIComponent(charName)}`,
      {
        method: "DELETE",
      }
    );
  }

  // ==================== 绾跨储绠＄悊 ====================

  static async addClue(
    projectName: string,
    name: string,
    clueType: string,
    description: string,
    importance: string = "major"
  ): Promise<SuccessResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/clues`,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          clue_type: clueType,
          description,
          importance,
        }),
      }
    );
  }

  static async updateClue(
    projectName: string,
    clueName: string,
    updates: Record<string, unknown>
  ): Promise<SuccessResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/clues/${encodeURIComponent(clueName)}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      }
    );
  }

  static async deleteClue(
    projectName: string,
    clueName: string
  ): Promise<SuccessResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/clues/${encodeURIComponent(clueName)}`,
      {
        method: "DELETE",
      }
    );
  }

  // ==================== 鍦烘櫙绠＄悊 ====================

  static async getScript(
    projectName: string,
    scriptFile: string
  ): Promise<EpisodeScript> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/scripts/${encodeURIComponent(scriptFile)}`
    );
  }

  static async updateScene(
    projectName: string,
    sceneId: string,
    scriptFile: string,
    updates: Record<string, unknown>
  ): Promise<SuccessResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/scenes/${encodeURIComponent(sceneId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ script_file: scriptFile, updates }),
      }
    );
  }

  // ==================== 鐗囨绠＄悊锛堣涔︽ā寮忥級 ====================

  static async updateSegment(
    projectName: string,
    segmentId: string,
    updates: Record<string, unknown>
  ): Promise<SuccessResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/segments/${encodeURIComponent(segmentId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      }
    );
  }

  // ==================== 鏂囦欢绠＄悊 ====================

  static async uploadFile(
    projectName: string,
    uploadType: string,
    file: File,
    name: string | null = null
  ): Promise<{ success: boolean; path: string; url: string }> {
    const formData = new FormData();
    formData.append("file", file);

    let url = `/projects/${encodeURIComponent(projectName)}/upload/${uploadType}`;
    if (name) {
      url += `?name=${encodeURIComponent(name)}`;
    }

    const response = await fetch(`${API_BASE}${url}`, withAuth({
      method: "POST",
      body: formData,
    }));

    await throwIfNotOk(response, "涓婁紶澶辫触");

    return response.json();
  }

  static async listFiles(
    projectName: string
  ): Promise<{ files: Record<string, { name: string; size: number; url: string }[]> }> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/files`
    );
  }

  static getFileUrl(
    projectName: string,
    path: string,
    cacheBust?: number | string | null
  ): string {
    const base = `${API_BASE}/files/${encodeURIComponent(projectName)}/${path}`;
    if (cacheBust == null || cacheBust === "") {
      return base;
    }

    return `${base}?v=${encodeURIComponent(String(cacheBust))}`;
  }

  // ==================== Source 鏂囦欢绠＄悊 ====================

  /**
   * 鑾峰彇 source 鏂囦欢鍐呭
   */
  static async getSourceContent(
    projectName: string,
    filename: string
  ): Promise<string> {
    const response = await fetch(
      `${API_BASE}/projects/${encodeURIComponent(projectName)}/source/${encodeURIComponent(filename)}`,
      withAuth()
    );
    await throwIfNotOk(response, "鑾峰彇鏂囦欢鍐呭澶辫触");
    return response.text();
  }

  /**
   * 淇濆瓨 source 鏂囦欢锛堟柊寤烘垨鏇存柊锛?
   */
  static async saveSourceFile(
    projectName: string,
    filename: string,
    content: string
  ): Promise<SuccessResponse> {
    const response = await fetch(
      `${API_BASE}/projects/${encodeURIComponent(projectName)}/source/${encodeURIComponent(filename)}`,
      withAuth({
        method: "PUT",
        headers: { "Content-Type": "text/plain" },
        body: content,
      })
    );
    await throwIfNotOk(response, "淇濆瓨鏂囦欢澶辫触");
    return response.json();
  }

  /**
   * 鍒犻櫎 source 鏂囦欢
   */
  static async deleteSourceFile(
    projectName: string,
    filename: string
  ): Promise<SuccessResponse> {
    const response = await fetch(
      `${API_BASE}/projects/${encodeURIComponent(projectName)}/source/${encodeURIComponent(filename)}`,
      withAuth({
        method: "DELETE",
      })
    );
    await throwIfNotOk(response, "鍒犻櫎鏂囦欢澶辫触");
    return response.json();
  }

  // ==================== 鑽夌鏂囦欢绠＄悊 ====================

  /**
   * 鑾峰彇椤圭洰鐨勬墍鏈夎崏绋?
   */
  static async listDrafts(
    projectName: string
  ): Promise<{ drafts: DraftInfo[] }> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/drafts`
    );
  }

  /**
   * 鑾峰彇鑽夌鍐呭
   */
  static async getDraftContent(
    projectName: string,
    episode: number,
    stepNum: number
  ): Promise<string> {
    const response = await fetch(
      `${API_BASE}/projects/${encodeURIComponent(projectName)}/drafts/${episode}/step${stepNum}`,
      withAuth()
    );
    await throwIfNotOk(response, "鑾峰彇鑽夌鍐呭澶辫触");
    return response.text();
  }

  /**
   * 淇濆瓨鑽夌鍐呭
   */
  static async saveDraft(
    projectName: string,
    episode: number,
    stepNum: number,
    content: string
  ): Promise<SuccessResponse> {
    const response = await fetch(
      `${API_BASE}/projects/${encodeURIComponent(projectName)}/drafts/${episode}/step${stepNum}`,
      withAuth({
        method: "PUT",
        headers: { "Content-Type": "text/plain" },
        body: content,
      })
    );
    await throwIfNotOk(response, "淇濆瓨鑽夌澶辫触");
    return response.json();
  }

  /**
   * 鍒犻櫎鑽夌
   */
  static async deleteDraft(
    projectName: string,
    episode: number,
    stepNum: number
  ): Promise<SuccessResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/drafts/${episode}/step${stepNum}`,
      { method: "DELETE" }
    );
  }

  // ==================== 椤圭洰姒傝堪绠＄悊 ====================

  /**
   * 浣跨敤 AI 鐢熸垚椤圭洰姒傝堪
   */
  static async generateOverview(
    projectName: string
  ): Promise<{ success: boolean; overview: ProjectOverview }> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/generate-overview`,
      {
        method: "POST",
      }
    );
  }

  /**
   * 鏇存柊椤圭洰姒傝堪锛堟墜鍔ㄧ紪杈戯級
   */
  static async updateOverview(
    projectName: string,
    updates: Partial<ProjectOverview>
  ): Promise<SuccessResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/overview`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      }
    );
  }

  // ==================== 鐢熸垚 API ====================

  /**
   * 鐢熸垚鍒嗛暅鍥?
   * @param projectName - 椤圭洰鍚嶇О
   * @param segmentId - 鐗囨/鍦烘櫙 ID
   * @param prompt - 鍥剧墖鐢熸垚 prompt锛堟敮鎸佸瓧绗︿覆鎴栫粨鏋勫寲瀵硅薄锛?
   * @param scriptFile - 鍓ф湰鏂囦欢鍚?
   */
  static async generateStoryboard(
    projectName: string,
    segmentId: string,
    prompt: string | Record<string, unknown>,
    scriptFile: string
  ): Promise<{ success: boolean; task_id: string; message: string }> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/generate/storyboard/${encodeURIComponent(segmentId)}`,
      {
        method: "POST",
        body: JSON.stringify({ prompt, script_file: scriptFile }),
      }
    );
  }

  /**
   * 鐢熸垚瑙嗛
   * @param projectName - 椤圭洰鍚嶇О
   * @param segmentId - 鐗囨/鍦烘櫙 ID
   * @param prompt - 瑙嗛鐢熸垚 prompt锛堟敮鎸佸瓧绗︿覆鎴栫粨鏋勫寲瀵硅薄锛?
   * @param scriptFile - 鍓ф湰鏂囦欢鍚?
   * @param durationSeconds - 鏃堕暱锛堢锛?
   */
  static async generateVideo(
    projectName: string,
    segmentId: string,
    prompt: string | Record<string, unknown>,
    scriptFile: string,
    durationSeconds: number = 4
  ): Promise<{ success: boolean; task_id: string; message: string }> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/generate/video/${encodeURIComponent(segmentId)}`,
      {
        method: "POST",
        body: JSON.stringify({
          prompt,
          script_file: scriptFile,
          duration_seconds: durationSeconds,
        }),
      }
    );
  }

  /**
   * 鐢熸垚瑙掕壊璁捐鍥?
   * @param projectName - 椤圭洰鍚嶇О
   * @param charName - 瑙掕壊鍚嶇О
   * @param prompt - 瑙掕壊鎻忚堪 prompt
   */
  static async generateCharacter(
    projectName: string,
    charName: string,
    prompt: string
  ): Promise<{
    success: boolean;
    task_id: string;
    message: string;
  }> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/generate/character/${encodeURIComponent(charName)}`,
      {
        method: "POST",
        body: JSON.stringify({ prompt }),
      }
    );
  }

  /**
   * 鐢熸垚绾跨储璁捐鍥?
   * @param projectName - 椤圭洰鍚嶇О
   * @param clueName - 绾跨储鍚嶇О
   * @param prompt - 绾跨储鎻忚堪 prompt
   */
  static async generateClue(
    projectName: string,
    clueName: string,
    prompt: string
  ): Promise<{
    success: boolean;
    task_id: string;
    message: string;
  }> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/generate/clue/${encodeURIComponent(clueName)}`,
      {
        method: "POST",
        body: JSON.stringify({ prompt }),
      }
    );
  }

  // ==================== 浠诲姟闃熷垪 API ====================

  static async getTask(taskId: string): Promise<TaskItem> {
    return this.request(`/tasks/${encodeURIComponent(taskId)}`);
  }

  static async listTasks(
    filters: TaskListFilters = {}
  ): Promise<{ items: TaskItem[]; total: number; page: number; page_size: number }> {
    const params = new URLSearchParams();
    if (filters.projectName) params.append("project_name", filters.projectName);
    if (filters.status) params.append("status", filters.status);
    if (filters.taskType) params.append("task_type", filters.taskType);
    if (filters.source) params.append("source", filters.source);
    if (filters.page) params.append("page", String(filters.page));
    if (filters.pageSize) params.append("page_size", String(filters.pageSize));
    const query = params.toString();
    return this.request(`/tasks${query ? "?" + query : ""}`);
  }

  static async listProjectTasks(
    projectName: string,
    filters: Omit<TaskListFilters, "projectName"> = {}
  ): Promise<{ items: TaskItem[]; total: number; page: number; page_size: number }> {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.taskType) params.append("task_type", filters.taskType);
    if (filters.source) params.append("source", filters.source);
    if (filters.page) params.append("page", String(filters.page));
    if (filters.pageSize) params.append("page_size", String(filters.pageSize));
    const query = params.toString();
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/tasks${query ? "?" + query : ""}`
    );
  }

  static async getTaskStats(
    projectName: string | null = null
  ): Promise<TaskStats> {
    const params = new URLSearchParams();
    if (projectName) params.append("project_name", projectName);
    const query = params.toString();
    return this.request(`/tasks/stats${query ? "?" + query : ""}`);
  }

  // ==================== 浠诲姟鍙栨秷 API ====================

  static async cancelPreview(
    taskId: string
  ): Promise<{ task: { task_id: string; task_type: string; resource_id: string }; cascaded: { task_id: string; task_type: string; resource_id: string }[] }> {
    return this.request(`/tasks/${encodeURIComponent(taskId)}/cancel-preview`);
  }

  static async cancelTask(
    taskId: string
  ): Promise<{ cancelled: TaskItem[]; skipped_running: TaskItem[] }> {
    return this.request(`/tasks/${encodeURIComponent(taskId)}/cancel`, {
      method: "POST",
    });
  }

  static async cancelAllPreview(
    projectName: string
  ): Promise<{ queued_count: number }> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/tasks/cancel-all-preview`
    );
  }

  static async cancelAllQueued(
    projectName: string
  ): Promise<{ cancelled_count: number; skipped_running_count: number }> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/tasks/cancel-all`,
      { method: "POST" }
    );
  }

  static openTaskStream(options: TaskStreamOptions = {}): EventSource {
    const params = new URLSearchParams();
    if (options.projectName)
      params.append("project_name", options.projectName);
    const parsedLastEventId = Number(options.lastEventId);
    if (Number.isFinite(parsedLastEventId) && parsedLastEventId > 0) {
      params.append("last_event_id", String(parsedLastEventId));
    }

    const query = params.toString();
    const url = withAuthQuery(`${API_BASE}/tasks/stream${query ? "?" + query : ""}`);
    const source = new EventSource(url);

    const parsePayload = (event: MessageEvent): unknown | null => {
      try {
        return JSON.parse(event.data || "{}");
      } catch (err) {
        console.error("瑙ｆ瀽 SSE 鏁版嵁澶辫触:", err, event.data);
        return null;
      }
    };

    source.addEventListener("snapshot", (event) => {
      const payload = parsePayload(event as MessageEvent);
      if (payload && typeof options.onSnapshot === "function") {
        options.onSnapshot(
          payload as TaskStreamSnapshotPayload,
          event as MessageEvent
        );
      }
    });

    source.addEventListener("task", (event) => {
      const payload = parsePayload(event as MessageEvent);
      if (payload && typeof options.onTask === "function") {
        options.onTask(
          payload as TaskStreamTaskPayload,
          event as MessageEvent
        );
      }
    });

    source.onerror = (event: Event) => {
      if (typeof options.onError === "function") {
        options.onError(event);
      }
    };

    return source;
  }

  static openProjectEventStream(options: ProjectEventStreamOptions): EventSource {
    const url = withAuthQuery(
      `${API_BASE}/projects/${encodeURIComponent(options.projectName)}/events/stream`
    );
    const source = new EventSource(url);

    const parsePayload = (event: MessageEvent): unknown | null => {
      try {
        return JSON.parse(event.data || "{}");
      } catch (err) {
        console.error("瑙ｆ瀽椤圭洰浜嬩欢 SSE 鏁版嵁澶辫触:", err, event.data);
        return null;
      }
    };

    const createHandler = (
      callback?: (payload: any, event: MessageEvent) => void
    ) => {
      return (event: Event) => {
        if (typeof callback !== "function") return;
        const payload = parsePayload(event as MessageEvent);
        if (payload) {
          callback(payload, event as MessageEvent);
        }
      };
    };

    source.addEventListener("snapshot", createHandler(options.onSnapshot));
    source.addEventListener("changes", createHandler(options.onChanges));

    source.onerror = (event: Event) => {
      if (typeof options.onError === "function") {
        options.onError(event);
      }
    };

    return source;
  }

  // ==================== 鐗堟湰绠＄悊 API ====================

  /**
   * 鑾峰彇璧勬簮鐗堟湰鍒楄〃
   * @param projectName - 椤圭洰鍚嶇О
   * @param resourceType - 璧勬簮绫诲瀷 (storyboards, videos, characters, clues)
   * @param resourceId - 璧勬簮 ID
   */
  static async getVersions(
    projectName: string,
    resourceType: string,
    resourceId: string
  ): Promise<{
    resource_type: string;
    resource_id: string;
    current_version: number;
    versions: VersionInfo[];
  }> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/versions/${encodeURIComponent(resourceType)}/${encodeURIComponent(resourceId)}`
    );
  }

  /**
   * 杩樺師鍒版寚瀹氱増鏈?
   * @param projectName - 椤圭洰鍚嶇О
   * @param resourceType - 璧勬簮绫诲瀷
   * @param resourceId - 璧勬簮 ID
   * @param version - 瑕佽繕鍘熺殑鐗堟湰鍙?
   */
  static async restoreVersion(
    projectName: string,
    resourceType: string,
    resourceId: string,
    version: number
  ): Promise<SuccessResponse & { file_path?: string; asset_fingerprints?: Record<string, number> }> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/versions/${encodeURIComponent(resourceType)}/${encodeURIComponent(resourceId)}/restore/${version}`,
      {
        method: "POST",
      }
    );
  }

  // ==================== 椋庢牸鍙傝€冨浘 API ====================

  /**
   * 涓婁紶椋庢牸鍙傝€冨浘
   * @param projectName - 椤圭洰鍚嶇О
   * @param file - 鍥剧墖鏂囦欢
   * @returns 鍖呭惈 style_image, style_description, url 鐨勭粨鏋?
   */
  static async uploadStyleImage(
    projectName: string,
    file: File
  ): Promise<{
    success: boolean;
    style_image: string;
    style_description: string;
    url: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${API_BASE}/projects/${encodeURIComponent(projectName)}/style-image`,
      withAuth({
        method: "POST",
        body: formData,
      })
    );

    await throwIfNotOk(response, "涓婁紶澶辫触");

    return response.json();
  }

  /**
   * 鍒犻櫎椋庢牸鍙傝€冨浘
   * @param projectName - 椤圭洰鍚嶇О
   */
  static async deleteStyleImage(
    projectName: string
  ): Promise<SuccessResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/style-image`,
      {
        method: "DELETE",
      }
    );
  }

  /**
   * 鏇存柊椋庢牸鎻忚堪
   * @param projectName - 椤圭洰鍚嶇О
   * @param styleDescription - 椋庢牸鎻忚堪
   */
  static async updateStyleDescription(
    projectName: string,
    styleDescription: string
  ): Promise<SuccessResponse> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/style-description`,
      {
        method: "PATCH",
        body: JSON.stringify({ style_description: styleDescription }),
      }
    );
  }

  // ==================== 鍔╂墜浼氳瘽 API ====================

  /** Build the project-scoped assistant base path. */
  private static assistantBase(projectName: string): string {
    return `/projects/${encodeURIComponent(projectName)}/assistant`;
  }

  static async listAssistantSessions(
    projectName: string,
    status: string | null = null
  ): Promise<{ sessions: SessionMeta[] }> {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    const query = params.toString();
    return this.request(
      `${this.assistantBase(projectName)}/sessions${query ? "?" + query : ""}`
    );
  }

  static async getAssistantSession(
    projectName: string,
    sessionId: string
  ): Promise<{ session: SessionMeta }> {
    return this.request(
      `${this.assistantBase(projectName)}/sessions/${encodeURIComponent(sessionId)}`
    );
  }

  static async getAssistantSnapshot(
    projectName: string,
    sessionId: string
  ): Promise<AssistantSnapshot> {
    return this.request(
      `${this.assistantBase(projectName)}/sessions/${encodeURIComponent(sessionId)}/snapshot`
    );
  }

  static async sendAssistantMessage(
    projectName: string,
    content: string,
    sessionId?: string | null,
    images?: Array<{ data: string; media_type: string }>
  ): Promise<{ session_id: string; status: string }> {
    return this.request(`${this.assistantBase(projectName)}/sessions/send`, {
      method: "POST",
      body: JSON.stringify({
        content,
        session_id: sessionId || undefined,
        images: images || [],
      }),
    });
  }

  static async interruptAssistantSession(
    projectName: string,
    sessionId: string
  ): Promise<SuccessResponse> {
    return this.request(
      `${this.assistantBase(projectName)}/sessions/${encodeURIComponent(sessionId)}/interrupt`,
      {
        method: "POST",
      }
    );
  }

  static async answerAssistantQuestion(
    projectName: string,
    sessionId: string,
    questionId: string,
    answers: Record<string, string>
  ): Promise<SuccessResponse> {
    return this.request(
      `${this.assistantBase(projectName)}/sessions/${encodeURIComponent(sessionId)}/questions/${encodeURIComponent(questionId)}/answer`,
      {
        method: "POST",
        body: JSON.stringify({ answers }),
      }
    );
  }

  static getAssistantStreamUrl(projectName: string, sessionId: string): string {
    return withAuthQuery(`${API_BASE}${this.assistantBase(projectName)}/sessions/${encodeURIComponent(sessionId)}/stream`);
  }

  static async listAssistantSkills(
    projectName: string
  ): Promise<{ skills: SkillInfo[] }> {
    return this.request(
      `${this.assistantBase(projectName)}/skills`
    );
  }

  static async deleteAssistantSession(
    projectName: string,
    sessionId: string
  ): Promise<SuccessResponse> {
    return this.request(
      `${this.assistantBase(projectName)}/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "DELETE",
      }
    );
  }

  // ==================== 璐圭敤缁熻 API ====================

  /**
   * 鑾峰彇缁熻鎽樿
   * @param filters - 绛涢€夋潯浠?
   */
  static async getUsageStats(
    filters: UsageStatsFilters = {}
  ): Promise<Record<string, unknown>> {
    const params = new URLSearchParams();
    if (filters.projectName)
      params.append("project_name", filters.projectName);
    if (filters.startDate) params.append("start_date", filters.startDate);
    if (filters.endDate) params.append("end_date", filters.endDate);
    const query = params.toString();
    return this.request(`/usage/stats${query ? "?" + query : ""}`);
  }

  /**
   * 鑾峰彇璋冪敤璁板綍鍒楄〃
   * @param filters - 绛涢€夋潯浠?
   */
  static async getUsageCalls(
    filters: UsageCallsFilters = {}
  ): Promise<Record<string, unknown>> {
    const params = new URLSearchParams();
    if (filters.projectName)
      params.append("project_name", filters.projectName);
    if (filters.callType) params.append("call_type", filters.callType);
    if (filters.status) params.append("status", filters.status);
    if (filters.startDate) params.append("start_date", filters.startDate);
    if (filters.endDate) params.append("end_date", filters.endDate);
    if (filters.page) params.append("page", String(filters.page));
    if (filters.pageSize) params.append("page_size", String(filters.pageSize));
    const query = params.toString();
    return this.request(`/usage/calls${query ? "?" + query : ""}`);
  }

  /**
   * 鑾峰彇鏈夎皟鐢ㄨ褰曠殑椤圭洰鍒楄〃
   */
  static async getUsageProjects(): Promise<{ projects: string[] }> {
    return this.request("/usage/projects");
  }

  // ==================== API Key 绠＄悊 API ====================

  /** 鍒楀嚭鎵€鏈?API Key锛堜笉鍚畬鏁?key锛夈€?*/
  static async listApiKeys(): Promise<ApiKeyInfo[]> {
    return this.request("/api-keys");
  }

  /** 鍒涘缓鏂?API Key锛岃繑鍥炲惈瀹屾暣 key 鐨勫搷搴旓紙浠呮涓€娆★級銆?*/
  static async createApiKey(name: string, expiresDays?: number): Promise<CreateApiKeyResponse> {
    return this.request("/api-keys", {
      method: "POST",
      body: JSON.stringify({ name, expires_days: expiresDays ?? null }),
    });
  }

  /** 鍒犻櫎锛堝悐閿€锛夋寚瀹?API Key銆?*/
  static async deleteApiKey(keyId: number): Promise<void> {
    return this.request(`/api-keys/${keyId}`, { method: "DELETE" });
  }

  // ==================== Provider 绠＄悊 API ====================

  /** 鑾峰彇鎵€鏈?provider 鍒楄〃鍙婄姸鎬併€?*/
  static async getProviders(): Promise<{ providers: ProviderInfo[] }> {
    return this.request("/providers");
  }

  /** 鑾峰彇鎸囧畾 provider 鐨勯厤缃鎯咃紙鍚瓧娈靛垪琛級銆?*/
  static async getProviderConfig(id: string): Promise<ProviderConfigDetail> {
    return this.request(`/providers/${encodeURIComponent(id)}/config`);
  }

  /** 鏇存柊鎸囧畾 provider 鐨勯厤缃瓧娈点€?*/
  static async patchProviderConfig(
    id: string,
    patch: Record<string, string | null>
  ): Promise<void> {
    return this.request(`/providers/${encodeURIComponent(id)}/config`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }

  /** 娴嬭瘯鎸囧畾 provider 鐨勮繛鎺ャ€?*/
  static async testProviderConnection(id: string, credentialId?: number): Promise<ProviderTestResult> {
    const params = credentialId != null ? `?credential_id=${credentialId}` : "";
    return this.request(`/providers/${encodeURIComponent(id)}/test${params}`, {
      method: "POST",
    });
  }

  // ==================== Provider 鍑瘉绠＄悊 API ====================

  static async listCredentials(providerId: string): Promise<{ credentials: ProviderCredential[] }> {
    return this.request(`/providers/${encodeURIComponent(providerId)}/credentials`);
  }

  static async createCredential(
    providerId: string,
    data: { name: string; api_key?: string; base_url?: string },
  ): Promise<ProviderCredential> {
    return this.request(`/providers/${encodeURIComponent(providerId)}/credentials`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  static async updateCredential(
    providerId: string,
    credId: number,
    data: { name?: string; api_key?: string; base_url?: string },
  ): Promise<void> {
    return this.request(
      `/providers/${encodeURIComponent(providerId)}/credentials/${credId}`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  static async deleteCredential(providerId: string, credId: number): Promise<void> {
    return this.request(
      `/providers/${encodeURIComponent(providerId)}/credentials/${credId}`,
      { method: "DELETE" },
    );
  }

  static async activateCredential(providerId: string, credId: number): Promise<void> {
    return this.request(
      `/providers/${encodeURIComponent(providerId)}/credentials/${credId}/activate`,
      { method: "POST" },
    );
  }

  static async uploadVertexCredential(name: string, file: File): Promise<ProviderCredential> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(
      `${API_BASE}/providers/gemini-vertex/credentials/upload?name=${encodeURIComponent(name)}`,
      withAuth({ method: "POST", body: formData }),
    );
    await throwIfNotOk(response, "涓婁紶鍑瘉澶辫触");
    return response.json();
  }

  // ==================== 鑷畾涔変緵搴斿晢 API ====================

  static async listCustomProviders(): Promise<{ providers: CustomProviderInfo[] }> {
    return this.request("/custom-providers");
  }

  static async createCustomProvider(data: CustomProviderCreateRequest): Promise<CustomProviderInfo> {
    return this.request("/custom-providers", { method: "POST", body: JSON.stringify(data) });
  }

  static async getCustomProvider(id: number): Promise<CustomProviderInfo> {
    return this.request(`/custom-providers/${id}`);
  }

  static async updateCustomProvider(id: number, data: Partial<Omit<CustomProviderCreateRequest, "api_format" | "models">>): Promise<void> {
    return this.request(`/custom-providers/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  static async fullUpdateCustomProvider(id: number, data: { display_name: string; base_url: string; api_key?: string; models: CustomProviderModelInput[] }): Promise<CustomProviderInfo> {
    return this.request(`/custom-providers/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }

  static async deleteCustomProvider(id: number): Promise<void> {
    return this.request(`/custom-providers/${id}`, { method: "DELETE" });
  }

  static async replaceCustomProviderModels(id: number, models: CustomProviderModelInput[]): Promise<CustomProviderModelInfo[]> {
    return this.request(`/custom-providers/${id}/models`, { method: "PUT", body: JSON.stringify({ models }) });
  }

  static async discoverModels(data: { api_format: string; base_url: string; api_key: string }): Promise<{ models: DiscoveredModel[] }> {
    return this.request("/custom-providers/discover", { method: "POST", body: JSON.stringify(data) });
  }

  static async testCustomConnection(data: { api_format: string; base_url: string; api_key: string }): Promise<{ success: boolean; message: string }> {
    return this.request("/custom-providers/test", { method: "POST", body: JSON.stringify(data) });
  }

  static async testCustomConnectionById(id: number): Promise<{ success: boolean; message: string }> {
    return this.request(`/custom-providers/${id}/test`, { method: "POST" });
  }

  // ==================== 鐢ㄩ噺缁熻锛堟寜 provider 鍒嗙粍锛堿PI ====================

  /**
   * 鑾峰彇鎸?provider 鍒嗙粍鐨勭敤閲忕粺璁°€?
   * @param params - 鍙€夌瓫閫夛細provider銆乻tart銆乪nd锛圛SO 鏃ユ湡瀛楃涓诧級
   */
  static async getUsageStatsGrouped(
    params: { provider?: string; start?: string; end?: string } = {}
  ): Promise<UsageStatsResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append("group_by", "provider");
    if (params.provider) searchParams.append("provider", params.provider);
    if (params.start) searchParams.append("start_date", params.start);
    if (params.end) searchParams.append("end_date", params.end);
    return this.request(`/usage/stats?${searchParams.toString()}`);
  }

  // ==================== 璐圭敤浼扮畻 API ====================

  /**
   * 鑾峰彇椤圭洰璐圭敤浼扮畻銆?
   * @param projectName - 椤圭洰鍚嶇О
   */
  static async getCostEstimate(projectName: string): Promise<CostEstimateResponse> {
    return this.request(`/projects/${encodeURIComponent(projectName)}/cost-estimate`);
  }

  // ==================== Grid 鍥剧敓瑙嗛 API ====================

  /**
   * 鐢熸垚 Grid 鍥惧儚锛堝鍦烘櫙缃戞牸锛?
   * @param projectName - 椤圭洰鍚嶇О
   * @param episode - 鍓ч泦缂栧彿
   * @param scriptFile - 鍓ф湰鏂囦欢鍚?
   * @param sceneIds - 鍙€夛紝鎸囧畾鍦烘櫙 ID 鍒楄〃
   */
  static async generateGrid(
    projectName: string,
    episode: number,
    scriptFile: string,
    sceneIds?: string[]
  ): Promise<{ success: boolean; grid_ids: string[]; task_ids: string[]; message: string }> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/generate/grid/${episode}`,
      { method: "POST", body: JSON.stringify({ script_file: scriptFile, scene_ids: sceneIds }) }
    );
  }

  /**
   * 鍒楀嚭椤圭洰鎵€鏈?Grid 璁板綍
   * @param projectName - 椤圭洰鍚嶇О
   */
  static async listGrids(projectName: string): Promise<GridGeneration[]> {
    return this.request(`/projects/${encodeURIComponent(projectName)}/grids`);
  }

  /**
   * 鑾峰彇鍗曚釜 Grid 璇︽儏
   * @param projectName - 椤圭洰鍚嶇О
   * @param gridId - Grid ID
   */
  static async getGrid(projectName: string, gridId: string): Promise<GridGeneration> {
    return this.request(`/projects/${encodeURIComponent(projectName)}/grids/${encodeURIComponent(gridId)}`);
  }

  /**
   * 閲嶆柊鐢熸垚 Grid 鍥惧儚
   * @param projectName - 椤圭洰鍚嶇О
   * @param gridId - Grid ID
   */
  static async regenerateGrid(
    projectName: string,
    gridId: string
  ): Promise<{ success: boolean; task_id: string }> {
    return this.request(
      `/projects/${encodeURIComponent(projectName)}/grids/${encodeURIComponent(gridId)}/regenerate`,
      { method: "POST" }
    );
  }
}

export { API };

