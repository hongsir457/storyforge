import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import { API } from "@/api";
import { ArtifactShareActions, NovelWorkbenchPage } from "@/components/pages/NovelWorkbenchPage";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import type { NovelWorkbenchArtifactListResponse } from "@/types";

const STATUS_FIXTURE = {
  workspace_root: "C:/workbench",
  autonovel_source_dir: "C:/autonovel",
  importer_script: "C:/scripts/import.py",
  autonovel_env_source: "C:/env/.env",
  requirements: {
    workspace_root_exists: true,
    autonovel_repo_exists: true,
    importer_exists: true,
    autonovel_env_exists: true,
    git_available: true,
    uv_available: true,
    all_ready: true,
  },
  env_status: {
    required: {
      workspace_root_exists: true,
      autonovel_repo_exists: true,
      importer_exists: true,
      autonovel_env_exists: true,
      git_available: true,
      uv_available: true,
    },
    optional: {},
    missing_required: [],
    missing_optional: [],
  },
};

const JOBS_FIXTURE = [
  {
    job_id: "job-1",
    title: "Novel A",
    seed_text: "seed-a",
    seed_excerpt: "seed-a",
    writing_language: "English",
    style: "Cinematic",
    aspect_ratio: "16:9" as const,
    default_duration: 6 as const,
    target_project_name: "novel-a",
    imported_project_name: null,
    status: "succeeded" as const,
    stage: "export",
    error_message: null,
    workspace_dir: "C:/workbench/job-1",
    log_path: "C:/workbench/job-1/run.log",
    log_tail: "tail-a",
    created_at: "2026-04-23T10:00:00Z",
    updated_at: "2026-04-23T10:05:00Z",
    started_at: "2026-04-23T10:00:05Z",
    finished_at: "2026-04-23T10:05:00Z",
  },
  {
    job_id: "job-2",
    title: "Novel B",
    seed_text: "seed-b",
    seed_excerpt: "seed-b",
    writing_language: "English",
    style: "Epic",
    aspect_ratio: "16:9" as const,
    default_duration: 6 as const,
    target_project_name: "novel-b",
    imported_project_name: null,
    status: "succeeded" as const,
    stage: "export",
    error_message: null,
    workspace_dir: "C:/workbench/job-2",
    log_path: "C:/workbench/job-2/run.log",
    log_tail: "tail-b",
    created_at: "2026-04-23T11:00:00Z",
    updated_at: "2026-04-23T11:05:00Z",
    started_at: "2026-04-23T11:00:05Z",
    finished_at: "2026-04-23T11:05:00Z",
  },
];

const ARTIFACTS_FIXTURE: Record<"job-1" | "job-2", NovelWorkbenchArtifactListResponse> = {
  "job-1": {
    summary: {
      available_count: 2,
      chapter_count: 1,
      has_seed: true,
      has_outline: true,
      has_world: true,
      has_characters: true,
      has_canon: true,
      has_state: true,
      has_manuscript: true,
      has_pdf: true,
    },
    artifacts: [
      {
        path: "chapters/ch_24.md",
        label: "Chapter 24",
        group: "chapters" as const,
        kind: "markdown" as const,
        previewable: true,
        size_bytes: 8192,
        modified_at: "2026-04-23T10:04:00Z",
      },
      {
        path: "exports/book.pdf",
        label: "Book PDF",
        group: "export" as const,
        kind: "pdf" as const,
        previewable: false,
        size_bytes: 524288,
        modified_at: "2026-04-23T10:05:00Z",
      },
    ],
  },
  "job-2": {
    summary: {
      available_count: 1,
      chapter_count: 1,
      has_seed: true,
      has_outline: true,
      has_world: true,
      has_characters: true,
      has_canon: true,
      has_state: true,
      has_manuscript: true,
      has_pdf: false,
    },
    artifacts: [
      {
        path: "chapters/ch_99.md",
        label: "Chapter 99",
        group: "chapters" as const,
        kind: "markdown" as const,
        previewable: true,
        size_bytes: 4096,
        modified_at: "2026-04-23T11:04:00Z",
      },
    ],
  },
};

const SHARE_COPY_FIXTURE = {
  shareArtifact: "Share this artifact",
  shareToWechat: "WeChat",
  shareToX: "X / Twitter",
  shareLink: "Share link",
  copyShareLink: "Copy link",
  shareLinkCopied: "Share link copied.",
  wechatShareHint:
    "On mobile browsers this opens the system share sheet so you can send it to WeChat. On desktop, copy the link and forward it in WeChat.",
  shareSheetError: "Couldn't open the system share sheet.",
  twitterShareText: (artifactLabel: string, title: string) =>
    `Reading "${artifactLabel}" from ${title} on Frametale.`,
};

function renderPage(path = "/app/novel-workbench") {
  const location = memoryLocation({ path, record: true });
  return {
    ...render(
      <Router hook={location.hook}>
        <NovelWorkbenchPage />
      </Router>,
    ),
    location,
  };
}

function renderBrowserPage(path: string) {
  window.history.replaceState({}, "", path);
  return render(
    <Router>
      <NovelWorkbenchPage />
    </Router>,
  );
}

describe("NovelWorkbenchPage sharing", () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true);
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
    vi.spyOn(API, "getNovelWorkbenchStatus").mockResolvedValue(STATUS_FIXTURE);
    vi.spyOn(API, "listNovelWorkbenchJobs").mockResolvedValue({ jobs: JOBS_FIXTURE });
    vi.spyOn(API, "listNovelWorkbenchArtifacts").mockImplementation(async (jobId: string) => ARTIFACTS_FIXTURE[jobId as "job-1" | "job-2"]);
    vi.spyOn(API, "getNovelWorkbenchArtifactContent").mockImplementation(async (jobId: string, path: string) => {
      const artifact = ARTIFACTS_FIXTURE[jobId as "job-1" | "job-2"].artifacts.find((item) => item.path === path)!;
      return {
        artifact,
        content: `Preview for ${jobId} / ${path}`,
        truncated: false,
      };
    });
  });

  it("syncs the current job and artifact into the URL", async () => {
    const { location } = renderPage();

    await waitFor(() => {
      expect(API.listNovelWorkbenchArtifacts).toHaveBeenCalledWith("job-1");
      expect(API.getNovelWorkbenchArtifactContent).toHaveBeenCalledWith("job-1", "chapters/ch_24.md");
    });

    await waitFor(() => {
      const current = location.history?.at(-1) ?? "";
      expect(current).toContain("job=job-1");
      expect(current).toContain("artifact=chapters%2Fch_24.md");
    });
  });

  it("restores a shared job and artifact selection from the URL", async () => {
    renderBrowserPage("/app/novel-workbench?job=job-2&artifact=chapters%2Fch_99.md");

    await waitFor(() => {
      expect(API.listNovelWorkbenchArtifacts).toHaveBeenCalledWith("job-2");
      expect(API.getNovelWorkbenchArtifactContent).toHaveBeenCalledWith("job-2", "chapters/ch_99.md");
    });

    await waitFor(() => {
      expect(window.location.search).toContain("job=job-2");
    });
  });

  it("opens an X intent with a selection-preserving share URL", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <ArtifactShareActions
        artifact={ARTIFACTS_FIXTURE["job-1"].artifacts[0]}
        buildShareUrl={() => "http://localhost:3000/app/novel-workbench?job=job-1&artifact=chapters%2Fch_24.md"}
        downloadLabel="Download"
        downloading={false}
        job={JOBS_FIXTURE[0]}
        onDownload={vi.fn()}
        pushToast={vi.fn()}
        shareCopy={SHARE_COPY_FIXTURE}
      />,
    );

    const shareButton = document.querySelector('button[aria-label="share-x"]') as HTMLButtonElement;
    await user.click(shareButton);

    expect(openSpy).toHaveBeenCalledTimes(1);
    const intentUrl = new URL(openSpy.mock.calls[0][0] as string);
    expect(intentUrl.origin).toBe("https://twitter.com");
    expect(intentUrl.pathname).toBe("/intent/tweet");

    const sharedUrl = intentUrl.searchParams.get("url");
    expect(sharedUrl).toContain("/app/novel-workbench");
    expect(sharedUrl).toContain("job=job-1");
    expect(sharedUrl).toContain("artifact=chapters%2Fch_24.md");
  });

  it("falls back to copy link when native WeChat share is unavailable", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const pushToast = vi.fn();

    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <ArtifactShareActions
        artifact={ARTIFACTS_FIXTURE["job-1"].artifacts[0]}
        buildShareUrl={() => "http://localhost:3000/app/novel-workbench?job=job-1&artifact=chapters%2Fch_24.md"}
        downloadLabel="Download"
        downloading={false}
        job={JOBS_FIXTURE[0]}
        onDownload={vi.fn()}
        pushToast={pushToast}
        shareCopy={SHARE_COPY_FIXTURE}
      />,
    );

    const wechatButton = document.querySelector('button[aria-label="share-wechat"]') as HTMLButtonElement;
    await user.click(wechatButton);

    await waitFor(() => {
      expect(document.querySelector('button[aria-label="copy-share-link"]')).not.toBeNull();
    });
    const copyButton = document.querySelector('button[aria-label="copy-share-link"]') as HTMLButtonElement;
    await user.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining("job=job-1"));
    });
    expect(pushToast).toHaveBeenCalledWith("Share link copied.", "success");
  });
});
