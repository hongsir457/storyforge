export interface NovelWorkbenchRequirements {
  workspace_root_exists: boolean;
  autonovel_repo_exists: boolean;
  importer_exists: boolean;
  autonovel_env_exists: boolean;
  git_available: boolean;
  uv_available: boolean;
  all_ready: boolean;
}

export interface NovelWorkbenchEnvStatus {
  required: Record<string, boolean>;
  optional: Record<string, boolean>;
  missing_required: string[];
  missing_optional: string[];
}

export interface NovelWorkbenchStatus {
  workspace_root: string;
  autonovel_source_dir: string;
  importer_script: string;
  autonovel_env_source: string;
  autonovel_env_mode?: "file" | "generated" | "missing";
  env_status?: NovelWorkbenchEnvStatus;
  requirements: NovelWorkbenchRequirements;
}

export type NovelWorkbenchArtifactGroup =
  | "inputs"
  | "planning"
  | "chapters"
  | "export";

export type NovelWorkbenchArtifactKind =
  | "markdown"
  | "text"
  | "json"
  | "pdf"
  | "epub"
  | "binary";

export interface NovelWorkbenchArtifact {
  path: string;
  label: string;
  group: NovelWorkbenchArtifactGroup;
  kind: NovelWorkbenchArtifactKind;
  previewable: boolean;
  size_bytes: number;
  modified_at: string;
}

export interface NovelWorkbenchArtifactSummary {
  available_count: number;
  chapter_count: number;
  has_seed: boolean;
  has_outline: boolean;
  has_world: boolean;
  has_characters: boolean;
  has_canon: boolean;
  has_state: boolean;
  has_manuscript: boolean;
  has_pdf: boolean;
}

export interface NovelWorkbenchArtifactListResponse {
  summary: NovelWorkbenchArtifactSummary;
  artifacts: NovelWorkbenchArtifact[];
}

export interface NovelWorkbenchArtifactContentResponse {
  artifact: NovelWorkbenchArtifact;
  content: string;
  truncated: boolean;
}

export interface NovelWorkbenchLogResponse {
  path: string;
  content: string;
  truncated: boolean;
  size_bytes: number;
  modified_at: string;
}

export type NovelWorkbenchJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface NovelWorkbenchJob {
  job_id: string;
  title: string;
  seed_text: string;
  seed_excerpt: string;
  writing_language: string;
  style: string;
  aspect_ratio: "9:16" | "16:9";
  default_duration: 4 | 6 | 8;
  target_project_name: string;
  imported_project_name: string | null;
  status: NovelWorkbenchJobStatus;
  stage: string;
  error_message: string | null;
  workspace_dir: string;
  log_path: string;
  log_tail: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}
