import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Square,
  Trash2,
} from "lucide-react";

import { API } from "@/api";
import { useAppStore } from "@/stores/app-store";
import type { NovelWorkbenchJob, NovelWorkbenchStatus } from "@/types";

const WORKFLOW_STEPS = [
  "1. 输入 seed 设定或故事起点",
  "2. autonovel 自动生成世界观、角色与提纲",
  "3. 连续起草章节并自动评估修订",
  "4. 完成后自动导回 Storyforge 继续做分镜和视频",
];

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

function isActiveJob(status: NovelWorkbenchJob["status"]): boolean {
  return status === "queued" || status === "running";
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
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [projectName, setProjectName] = useState("");
  const [seedText, setSeedText] = useState("");

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
  const missingRequiredEnv = status?.env_status?.missing_required ?? [];
  const missingOptionalEnv = status?.env_status?.missing_optional ?? [];
  const runtimeEnvLabel = status?.autonovel_env_mode === "file"
    ? "运行时环境文件"
    : status?.autonovel_env_mode === "generated"
      ? "运行时环境已生成"
      : "运行时环境缺失";

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
      });
      pushToast("小说流水线已启动。", "success");
      setSelectedJobId(response.job.job_id);
      await fetchAll(false);
    } catch (err) {
      pushToast((err as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelJob = async (job: NovelWorkbenchJob) => {
    if (!isActiveJob(job.status)) {
      return;
    }

    setCancellingJobId(job.job_id);
    try {
      await API.cancelNovelWorkbenchJob(job.job_id);
      pushToast("小说流水线已取消。", "warning");
      await fetchAll(false);
    } catch (err) {
      pushToast((err as Error).message, "error");
    } finally {
      setCancellingJobId(null);
    }
  };

  const handleDeleteJob = async (job: NovelWorkbenchJob) => {
    if (isActiveJob(job.status)) {
      pushToast("请先取消运行中的任务，再删除记录。", "warning");
      return;
    }

    if (!window.confirm(`确认删除运行记录「${job.title}」吗？`)) {
      return;
    }

    setDeletingJobId(job.job_id);
    try {
      await API.deleteNovelWorkbenchJob(job.job_id);
      pushToast("运行记录已删除。", "success");
      if (selectedJobId === job.job_id) {
        setSelectedJobId(null);
      }
      await fetchAll(false);
    } catch (err) {
      pushToast((err as Error).message, "error");
    } finally {
      setDeletingJobId(null);
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
              项目列表
            </button>
            <div className="h-4 w-px bg-gray-700" />
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-400" />
              <div>
                <h1 className="text-lg font-semibold">小说工坊</h1>
                <p className="text-xs text-gray-500">
                  从 seed 自动生成长篇小说，并在完成后导入 Storyforge 项目继续制作分镜与视频。
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
            刷新状态
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            正在加载小说工坊...
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <RequirementChip label="工作区目录" ok={Boolean(status?.requirements.workspace_root_exists)} />
                    <RequirementChip label="autonovel 仓库" ok={Boolean(status?.requirements.autonovel_repo_exists)} />
                    <RequirementChip label="导入脚本" ok={Boolean(status?.requirements.importer_exists)} />
                    <RequirementChip label={runtimeEnvLabel} ok={Boolean(status?.requirements.autonovel_env_exists)} />
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
                      <div className="text-xs uppercase tracking-wide text-gray-500">Runtime Env</div>
                      <div className="mt-1 break-all font-mono text-xs text-gray-300">{status?.autonovel_env_source}</div>
                    </div>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-white/8 bg-black/20 p-4">
                      <div className="text-xs uppercase tracking-wide text-gray-500">主流程依赖</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(status?.env_status?.required ?? {}).map(([key, ok]) => (
                          <RequirementChip key={key} label={key} ok={ok} />
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-black/20 p-4">
                      <div className="text-xs uppercase tracking-wide text-gray-500">可选扩展</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(status?.env_status?.optional ?? {}).map(([key, ok]) => (
                          <RequirementChip key={key} label={key} ok={ok} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {!status?.requirements.all_ready && (
                  <div className="max-w-sm rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                    当前还不能启动小说流水线。
                    {missingRequiredEnv.length > 0
                      ? ` 缺少必要配置：${missingRequiredEnv.join(", ")}。`
                      : " 请确认工作区、autonovel、导入脚本、git 和 uv 都可用。"}
                  </div>
                )}
                {status?.requirements.all_ready && missingOptionalEnv.length > 0 && (
                  <div className="max-w-sm rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                    小说主流程已经可用。若后续还要继续生成封面或有声书，请补齐：{missingOptionalEnv.join(", ")}。
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {WORKFLOW_STEPS.map((step) => (
                <div key={step} className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4 text-sm text-slate-300">
                  {step}
                </div>
              ))}
            </section>

            <div className="grid gap-6 xl:grid-cols-[420px,1fr]">
              <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
                <h2 className="text-base font-semibold">启动小说流水线</h2>
                <p className="mt-1 text-sm text-gray-500">
                  这里只负责生成小说。视觉风格、画幅比例、片段时长这类视频默认值已经改为后端自动填充，不再需要在小说入口手动设置。
                </p>

                <form onSubmit={(event) => void handleCreateJob(event)} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="novel-title" className="mb-1 block text-sm text-gray-400">
                      小说标题
                    </label>
                    <input
                      id="novel-title"
                      type="text"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="山门之上"
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="project-name" className="mb-1 block text-sm text-gray-400">
                      Storyforge 项目标识
                    </label>
                    <input
                      id="project-name"
                      type="text"
                      value={projectName}
                      onChange={(event) => setProjectName(event.target.value)}
                      placeholder="可选，留空时自动生成"
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="seed-text" className="mb-1 block text-sm text-gray-400">
                      Seed 文案
                    </label>
                    <textarea
                      id="seed-text"
                      value={seedText}
                      onChange={(event) => setSeedText(event.target.value)}
                      rows={12}
                      placeholder="输入你希望扩展成长篇小说的核心概念、人物关系、世界观或故事起点。"
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      这里会自动写入 `seed.txt` 并启动完整的 autonovel 流水线。
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                    {submitting ? "启动中..." : "启动小说流水线"}
                  </button>
                </form>
              </section>

              <section className="grid gap-6 lg:grid-cols-[380px,1fr]">
                <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold">运行记录</h2>
                    <span className="text-xs text-gray-500">{jobs.length}</span>
                  </div>
                  <div className="space-y-3">
                    {jobs.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-800 px-4 py-10 text-center text-sm text-gray-500">
                        还没有小说任务。
                      </div>
                    ) : (
                      jobs.map((job) => {
                        const selected = selectedJobId === job.job_id;
                        const jobIsActive = isActiveJob(job.status);
                        const cancelling = cancellingJobId === job.job_id;
                        const deleting = deletingJobId === job.job_id;

                        return (
                          <div
                            key={job.job_id}
                            className={`rounded-xl border p-3 transition-colors ${
                              selected
                                ? "border-indigo-500 bg-indigo-500/10"
                                : "border-gray-800 bg-gray-950/40"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedJobId((prev) => (prev === job.job_id ? null : job.job_id))}
                              className="block w-full text-left"
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

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedJobId((prev) => (prev === job.job_id ? null : job.job_id))}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-xs text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-800"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                {selected ? "收起日志" : "查看日志"}
                              </button>

                              {jobIsActive ? (
                                <button
                                  type="button"
                                  onClick={() => void handleCancelJob(job)}
                                  disabled={cancelling}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                                  取消
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteJob(job)}
                                  disabled={deleting}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-xs text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                  删除
                                </button>
                              )}
                            </div>

                            {selected && (
                              <div className="mt-4 space-y-3 border-t border-white/8 pt-4">
                                <div className="grid gap-3 text-xs text-gray-400 sm:grid-cols-2">
                                  <div>
                                    <div className="uppercase tracking-wide text-gray-500">Created</div>
                                    <div className="mt-1 text-gray-200">{formatTimestamp(job.created_at)}</div>
                                  </div>
                                  <div>
                                    <div className="uppercase tracking-wide text-gray-500">Updated</div>
                                    <div className="mt-1 text-gray-200">{formatTimestamp(job.updated_at)}</div>
                                  </div>
                                  <div>
                                    <div className="uppercase tracking-wide text-gray-500">Started</div>
                                    <div className="mt-1 text-gray-200">{formatTimestamp(job.started_at)}</div>
                                  </div>
                                  <div>
                                    <div className="uppercase tracking-wide text-gray-500">Finished</div>
                                    <div className="mt-1 text-gray-200">{formatTimestamp(job.finished_at)}</div>
                                  </div>
                                </div>

                                {job.error_message && (
                                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                                    {job.error_message}
                                  </div>
                                )}

                                <div className="rounded-xl border border-gray-800 bg-black/25 p-3">
                                  <div className="mb-2 flex items-center justify-between">
                                    <div className="text-[11px] uppercase tracking-wide text-gray-500">Log Tail</div>
                                    {job.status === "running" && (
                                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        每 3 秒刷新
                                      </span>
                                    )}
                                  </div>
                                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/30 p-3 font-mono text-[11px] text-gray-200">
                                    {job.log_tail || "No logs yet."}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
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
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.imported_project_name && (
                            <button
                              type="button"
                              onClick={() => navigate(`/app/projects/${selectedJob.imported_project_name}`)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 transition-colors hover:bg-emerald-500/20"
                            >
                              <ExternalLink className="h-4 w-4" />
                              打开项目
                            </button>
                          )}
                          {isActiveJob(selectedJob.status) ? (
                            <button
                              type="button"
                              onClick={() => void handleCancelJob(selectedJob)}
                              disabled={cancellingJobId === selectedJob.job_id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {cancellingJobId === selectedJob.job_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                              取消
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleDeleteJob(selectedJob)}
                              disabled={deletingJobId === selectedJob.job_id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingJobId === selectedJob.job_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              删除记录
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
                          <div className="text-xs uppercase tracking-wide text-gray-500">Updated</div>
                          <div className="mt-1 text-gray-200">{formatTimestamp(selectedJob.updated_at)}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-gray-500">Started</div>
                          <div className="mt-1 text-gray-200">{formatTimestamp(selectedJob.started_at)}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-gray-500">Finished</div>
                          <div className="mt-1 text-gray-200">{formatTimestamp(selectedJob.finished_at)}</div>
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
                        <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/30 p-3 font-mono text-xs text-gray-200">
                          {selectedJob.log_tail || "No logs yet."}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[20rem] items-center justify-center rounded-xl border border-dashed border-gray-800 text-sm text-gray-500">
                      选择一条运行记录查看种子文案、工作目录和完整日志。
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
