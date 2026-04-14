import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  Loader2,
  RefreshCw,
  Square,
} from "lucide-react";

import { API } from "@/api";
import { useAppStore } from "@/stores/app-store";
import type { NovelWorkbenchJob, NovelWorkbenchStatus } from "@/types";

const STYLE_OPTIONS = ["Photographic", "Anime", "3D Animation"] as const;

function RequirementChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
        ok ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
      }`}
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function JobStatusBadge({ status }: { status: NovelWorkbenchJob["status"] }) {
  const className =
    status === "succeeded"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "failed"
        ? "bg-rose-500/15 text-rose-300"
        : status === "cancelled"
          ? "bg-gray-700 text-gray-300"
          : "bg-amber-500/15 text-amber-300";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{status}</span>;
}

function formatTimestamp(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function NovelWorkbenchPage() {
  const [, navigate] = useLocation();
  const pushToast = useAppStore((s) => s.pushToast);

  const [status, setStatus] = useState<NovelWorkbenchStatus | null>(null);
  const [jobs, setJobs] = useState<NovelWorkbenchJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [title, setTitle] = useState("");
  const [projectName, setProjectName] = useState("");
  const [seedText, setSeedText] = useState("");
  const [style, setStyle] = useState<(typeof STYLE_OPTIONS)[number]>("Photographic");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [defaultDuration, setDefaultDuration] = useState<4 | 6 | 8>(4);

  const fetchAll = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) {
      setRefreshing(true);
    }
    try {
      const [statusResult, jobsResult] = await Promise.all([
        API.getNovelWorkbenchStatus(),
        API.listNovelWorkbenchJobs(),
      ]);
      setStatus(statusResult);
      setJobs(jobsResult.jobs);
    } catch (err) {
      pushToast((err as Error).message, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void fetchAll(false);
    const timer = window.setInterval(() => {
      void fetchAll(false);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [fetchAll]);

  useEffect(() => {
    if (jobs.length === 0) {
      setSelectedJobId(null);
      return;
    }
    if (!selectedJobId || !jobs.some((job) => job.job_id === selectedJobId)) {
      setSelectedJobId(jobs[0].job_id);
    }
  }, [jobs, selectedJobId]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.job_id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  const canSubmit = Boolean(
    status?.requirements.all_ready && title.trim() && seedText.trim() && !submitting,
  );

  const handleCreateJob = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const response = await API.createNovelWorkbenchJob({
        title: title.trim(),
        seed_text: seedText.trim(),
        project_name: projectName.trim() || undefined,
        style,
        aspect_ratio: aspectRatio,
        default_duration: defaultDuration,
      });
      pushToast("Novel pipeline started.", "success");
      setSelectedJobId(response.job.job_id);
      await fetchAll(false);
    } catch (err) {
      pushToast((err as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelJob = async () => {
    if (
      !selectedJob ||
      selectedJob.status === "succeeded" ||
      selectedJob.status === "failed" ||
      selectedJob.status === "cancelled"
    ) {
      return;
    }
    setCancelling(true);
    try {
      await API.cancelNovelWorkbenchJob(selectedJob.job_id);
      pushToast("Novel pipeline cancelled.", "warning");
      await fetchAll(false);
    } catch (err) {
      pushToast((err as Error).message, "error");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/60 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/app/projects")}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
            >
              <ChevronLeft className="h-4 w-4" />
              Projects
            </button>
            <div className="h-4 w-px bg-gray-700" />
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-400" />
              <div>
                <h1 className="text-lg font-semibold">Novel Workbench</h1>
                <p className="text-xs text-gray-500">
                  Run autonovel inside Storyforge and auto-import the finished manuscript as a video project.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void fetchAll(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-800"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading novel workbench...
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <RequirementChip label="Workspace root" ok={Boolean(status?.requirements.workspace_root_exists)} />
                    <RequirementChip label="autonovel repo" ok={Boolean(status?.requirements.autonovel_repo_exists)} />
                    <RequirementChip label="importer" ok={Boolean(status?.requirements.importer_exists)} />
                    <RequirementChip label="autonovel env" ok={Boolean(status?.requirements.autonovel_env_exists)} />
                    <RequirementChip label="git" ok={Boolean(status?.requirements.git_available)} />
                    <RequirementChip label="uv" ok={Boolean(status?.requirements.uv_available)} />
                  </div>
                  <div className="grid gap-3 text-sm text-gray-400 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Workspace Root</div>
                      <div className="mt-1 break-all font-mono text-xs text-gray-300">{status?.workspace_root}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">autonovel Source</div>
                      <div className="mt-1 break-all font-mono text-xs text-gray-300">{status?.autonovel_source_dir}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Importer Script</div>
                      <div className="mt-1 break-all font-mono text-xs text-gray-300">{status?.importer_script}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Env Source</div>
                      <div className="mt-1 break-all font-mono text-xs text-gray-300">{status?.autonovel_env_source}</div>
                    </div>
                  </div>
                </div>
                {!status?.requirements.all_ready && (
                  <div className="max-w-sm rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                    The workbench is not ready yet. Make sure the shared workspace, `autonovel`, `.env`, `git`, and `uv`
                    are all available to the Storyforge runtime.
                  </div>
                )}
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[420px,1fr]">
              <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
                <h2 className="text-base font-semibold">Start A Novel Pipeline</h2>
                <p className="mt-1 text-sm text-gray-500">
                  This writes `seed.txt`, clones a fresh autonovel workspace, runs the full pipeline, then auto-imports the
                  finished novel into Storyforge.
                </p>

                <form onSubmit={(event) => void handleCreateJob(event)} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="novel-title" className="mb-1 block text-sm text-gray-400">
                      Novel Title
                    </label>
                    <input
                      id="novel-title"
                      type="text"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="The Clockwork Orchard"
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="project-name" className="mb-1 block text-sm text-gray-400">
                      Target Storyforge Project ID
                    </label>
                    <input
                      id="project-name"
                      type="text"
                      value={projectName}
                      onChange={(event) => setProjectName(event.target.value)}
                      placeholder="Optional. Auto-generated when empty."
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="seed-text" className="mb-1 block text-sm text-gray-400">
                      Seed Text
                    </label>
                    <textarea
                      id="seed-text"
                      value={seedText}
                      onChange={(event) => setSeedText(event.target.value)}
                      rows={12}
                      placeholder="Paste the seed concept you want autonovel to expand into a full novel."
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      `autonovel` needs a real `seed.txt`. This page removes the manual file-edit step.
                    </p>
                  </div>

                  <fieldset>
                    <legend className="mb-1 block text-sm text-gray-400">Visual Style</legend>
                    <div className="flex gap-2">
                      {STYLE_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setStyle(option)}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                            style === option
                              ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                              : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="grid gap-4 md:grid-cols-2">
                    <fieldset>
                      <legend className="mb-1 block text-sm text-gray-400">Aspect Ratio</legend>
                      <div className="flex gap-2">
                        {(["9:16", "16:9"] as const).map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setAspectRatio(value)}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                              aspectRatio === value
                                ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                                : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend className="mb-1 block text-sm text-gray-400">Default Segment Duration</legend>
                      <div className="flex gap-2">
                        {([4, 6, 8] as const).map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setDefaultDuration(value)}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                              defaultDuration === value
                                ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                                : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                            }`}
                          >
                            {value}s
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                    {submitting ? "Starting..." : "Start Novel Pipeline"}
                  </button>
                </form>
              </section>

              <section className="grid gap-6 lg:grid-cols-[320px,1fr]">
                <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold">Jobs</h2>
                    <span className="text-xs text-gray-500">{jobs.length}</span>
                  </div>
                  <div className="space-y-3">
                    {jobs.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-800 px-4 py-10 text-center text-sm text-gray-500">
                        No novel jobs yet.
                      </div>
                    ) : (
                      jobs.map((job) => (
                        <button
                          key={job.job_id}
                          type="button"
                          onClick={() => setSelectedJobId(job.job_id)}
                          className={`w-full rounded-xl border p-3 text-left transition-colors ${
                            selectedJobId === job.job_id
                              ? "border-indigo-500 bg-indigo-500/10"
                              : "border-gray-800 bg-gray-950/40 hover:border-gray-700"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium text-gray-100">{job.title}</div>
                              <div className="mt-1 text-xs text-gray-500">{job.target_project_name}</div>
                            </div>
                            <JobStatusBadge status={job.status} />
                          </div>
                          <div className="mt-2 text-xs text-gray-400">{job.seed_excerpt}</div>
                          <div className="mt-3 text-[11px] uppercase tracking-wide text-gray-500">{job.stage}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
                  {selectedJob ? (
                    <div className="space-y-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold">{selectedJob.title}</h2>
                            <JobStatusBadge status={selectedJob.status} />
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            Stage: <span className="text-gray-300">{selectedJob.stage}</span> / Target project:{" "}
                            <span className="font-mono text-gray-300">{selectedJob.target_project_name}</span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {selectedJob.imported_project_name && (
                            <button
                              type="button"
                              onClick={() => navigate(`/app/projects/${selectedJob.imported_project_name}`)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 transition-colors hover:bg-emerald-500/20"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Open Project
                            </button>
                          )}
                          {selectedJob.status !== "succeeded" &&
                            selectedJob.status !== "failed" &&
                            selectedJob.status !== "cancelled" && (
                              <button
                                type="button"
                                onClick={() => void handleCancelJob()}
                                disabled={cancelling}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                                Cancel
                              </button>
                            )}
                        </div>
                      </div>

                      <div className="grid gap-3 text-sm text-gray-400 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-gray-500">Created</div>
                          <div className="mt-1 text-gray-200">{formatTimestamp(selectedJob.created_at)}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-gray-500">Started</div>
                          <div className="mt-1 text-gray-200">{formatTimestamp(selectedJob.started_at)}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-gray-500">Finished</div>
                          <div className="mt-1 text-gray-200">{formatTimestamp(selectedJob.finished_at)}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-gray-500">Output Ratio</div>
                          <div className="mt-1 text-gray-200">
                            {selectedJob.aspect_ratio} / {selectedJob.default_duration}s
                          </div>
                        </div>
                      </div>

                      {selectedJob.error_message && (
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                          {selectedJob.error_message}
                        </div>
                      )}

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-4">
                          <div className="text-xs uppercase tracking-wide text-gray-500">Seed</div>
                          <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-200">
                            {selectedJob.seed_text}
                          </pre>
                        </div>
                        <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-4">
                          <div className="text-xs uppercase tracking-wide text-gray-500">Workspace</div>
                          <div className="mt-2 break-all font-mono text-xs text-gray-300">{selectedJob.workspace_dir}</div>
                          <div className="mt-4 text-xs uppercase tracking-wide text-gray-500">Log File</div>
                          <div className="mt-2 break-all font-mono text-xs text-gray-300">{selectedJob.log_path}</div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-xs uppercase tracking-wide text-gray-500">Log Tail</div>
                          {selectedJob.status === "running" && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-300">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              live
                            </span>
                          )}
                        </div>
                        <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/30 p-3 font-mono text-xs text-gray-200">
                          {selectedJob.log_tail || "No logs yet."}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[20rem] items-center justify-center rounded-xl border border-dashed border-gray-800 text-sm text-gray-500">
                      Select a job to inspect details and logs.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
