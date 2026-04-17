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
  "输入标题和 seed，明确故事起点。",
  "自动生成世界观、人物、章节与主线结构。",
  "持续起稿、评估、修订，直到产出长篇小说。",
  "完成后导回 Storyforge 项目，继续做分镜和视频。",
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
  const pushToast = useAppStore((state) => state.pushToast);

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
    } catch (error) {
      pushToast((error as Error).message, "error");
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
  const canSubmit = Boolean(status?.requirements.all_ready && title.trim() && seedText.trim() && !submitting);
  const latestSuccessfulJob = useMemo(
    () => jobs.find((job) => job.status === "succeeded") ?? null,
    [jobs],
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
    } catch (error) {
      pushToast((error as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelJob = async (job: NovelWorkbenchJob) => {
    if (!isActiveJob(job.status)) return;

    setCancellingJobId(job.job_id);
    try {
      await API.cancelNovelWorkbenchJob(job.job_id);
      pushToast("小说流水线已取消。", "warning");
      await fetchAll(false);
    } catch (error) {
      pushToast((error as Error).message, "error");
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
    } catch (error) {
      pushToast((error as Error).message, "error");
    } finally {
      setDeletingJobId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/60 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/app/projects")}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
            >
              <ChevronLeft className="h-4 w-4" />
              返回项目
            </button>
            <div className="h-4 w-px bg-gray-700" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                <h1 className="text-lg font-semibold">小说工坊</h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">先把 seed 扩成完整小说，再回到 Storyforge 继续做分镜与视频。</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void fetchAll(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-800"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            刷新
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            正在加载小说工坊...
          </div>
        ) : (
          <div className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
              <div className="rounded-[28px] border border-gray-800 bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(8,12,24,0.98))] p-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
                    <BookOpen className="h-3.5 w-3.5" />
                    Novel Starter
                  </div>
                  <h2 className="text-2xl font-semibold text-white">从一个 seed 启动完整长篇小说。</h2>
                  <p className="max-w-3xl text-sm leading-7 text-gray-400">
                    这里只负责生成小说本体。画幅、片段时长、视觉风格这些视频参数会在项目空间里继续接管，不再塞进小说入口。
                  </p>
                </div>

                <form onSubmit={(event) => void handleCreateJob(event)} className="mt-6 space-y-4">
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
                      className="w-full rounded-2xl border border-gray-700 bg-gray-800/80 px-4 py-3 text-sm text-gray-100 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="project-name" className="mb-1 block text-sm text-gray-400">
                      导入后的项目标识
                    </label>
                    <input
                      id="project-name"
                      type="text"
                      value={projectName}
                      onChange={(event) => setProjectName(event.target.value)}
                      placeholder="可选，留空时自动生成"
                      className="w-full rounded-2xl border border-gray-700 bg-gray-800/80 px-4 py-3 text-sm text-gray-100 outline-none focus:border-indigo-500"
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
                      placeholder="输入你想扩展成长篇小说的核心设定、人物关系、世界观或故事起点。"
                      className="w-full rounded-2xl border border-gray-700 bg-gray-800/80 px-4 py-3 text-sm text-gray-100 outline-none focus:border-indigo-500"
                    />
                    <p className="mt-2 text-xs text-gray-500">系统会把这段文字写入 seed.txt，并触发完整的 autonovel 流水线。</p>
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                    {submitting ? "启动中..." : "启动小说流水线"}
                  </button>
                </form>
              </div>

              <div className="space-y-6">
                <section
                  className={`rounded-[28px] border p-6 ${
                    status?.requirements.all_ready
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-rose-500/20 bg-rose-500/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {status?.requirements.all_ready ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-5 w-5 text-rose-300" />
                    )}
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold text-white">
                        {status?.requirements.all_ready ? "可以开始生成小说" : "当前还不能启动小说流水线"}
                      </h2>
                      <p className="text-sm leading-6 text-gray-300">
                        {status?.requirements.all_ready
                          ? "主流程依赖已经齐备。创建完成后会自动生成世界观、人物、章节与导入项目。"
                          : missingRequiredEnv.length > 0
                            ? `缺少必要配置：${missingRequiredEnv.join("、")}。请先补齐。`
                            : "请确认工作目录、autonovel 源码、导入脚本、git 和 uv 都已准备好。"}
                      </p>
                      {missingOptionalEnv.length > 0 && (
                        <p className="text-sm text-amber-200/85">
                          可选能力尚未齐备：{missingOptionalEnv.join("、")}。这不会阻止小说生成，但可能影响后续扩展环节。
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-800 bg-gray-900/60 p-6">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-gray-500">流水线会做什么</div>
                  <div className="mt-4 grid gap-3">
                    {WORKFLOW_STEPS.map((step, index) => (
                      <div key={step} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-gray-300">
                        <span className="mr-2 text-gray-500">{index + 1}.</span>
                        {step}
                      </div>
                    ))}
                  </div>
                </section>

                {latestSuccessfulJob && (
                  <section className="rounded-[28px] border border-gray-800 bg-gray-900/60 p-6">
                    <div className="text-[11px] uppercase tracking-[0.28em] text-gray-500">最近完成</div>
                    <h3 className="mt-3 text-lg font-semibold text-white">{latestSuccessfulJob.title}</h3>
                    <p className="mt-2 text-sm text-gray-400">
                      已于 {formatTimestamp(latestSuccessfulJob.finished_at)} 完成。
                      {latestSuccessfulJob.imported_project_name ? " 你可以直接回到项目空间继续做分镜和视频。" : ""}
                    </p>
                    {latestSuccessfulJob.imported_project_name && (
                      <button
                        type="button"
                        onClick={() => navigate(`/app/projects/${latestSuccessfulJob.imported_project_name}`)}
                        className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 transition-colors hover:bg-emerald-500/20"
                      >
                        <ExternalLink className="h-4 w-4" />
                        打开导入后的项目
                      </button>
                    )}
                  </section>
                )}
              </div>
            </section>

            <details className="rounded-[28px] border border-gray-800 bg-gray-900/40 p-6">
              <summary className="cursor-pointer list-none text-sm font-medium text-gray-200">
                查看运行环境与诊断
              </summary>
              <div className="mt-5 space-y-5">
                <div className="flex flex-wrap gap-2">
                  <RequirementChip label="工作目录" ok={Boolean(status?.requirements.workspace_root_exists)} />
                  <RequirementChip label="autonovel 仓库" ok={Boolean(status?.requirements.autonovel_repo_exists)} />
                  <RequirementChip label="导入脚本" ok={Boolean(status?.requirements.importer_exists)} />
                  <RequirementChip label="运行时环境" ok={Boolean(status?.requirements.autonovel_env_exists)} />
                  <RequirementChip label="git" ok={Boolean(status?.requirements.git_available)} />
                  <RequirementChip label="uv" ok={Boolean(status?.requirements.uv_available)} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
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

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">主流程依赖</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(status?.env_status?.required ?? {}).map(([key, ok]) => (
                        <RequirementChip key={key} label={key} ok={ok} />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">可选扩展</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(status?.env_status?.optional ?? {}).map(([key, ok]) => (
                        <RequirementChip key={key} label={key} ok={ok} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </details>

            <section className="grid gap-6 xl:grid-cols-[360px,1fr]">
              <div className="rounded-[28px] border border-gray-800 bg-gray-900/60 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">运行记录</h2>
                    <p className="mt-1 text-sm text-gray-500">每次生成都会保留 seed、日志和导入结果。</p>
                  </div>
                  <span className="text-xs text-gray-500">{jobs.length}</span>
                </div>

                <div className="space-y-3">
                  {jobs.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-800 px-4 py-10 text-center text-sm text-gray-500">
                      还没有运行记录。先从上面的表单发起第一条小说任务。
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
                          className={`rounded-2xl border p-4 transition-colors ${
                            selected ? "border-indigo-500 bg-indigo-500/10" : "border-gray-800 bg-gray-950/40"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedJobId((previous) => (previous === job.job_id ? null : job.job_id))}
                            className="block w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate font-medium text-gray-100">{job.title}</div>
                                <div className="mt-1 text-xs text-gray-500">{job.target_project_name}</div>
                              </div>
                              <JobStatusBadge status={job.status} />
                            </div>
                            <div className="mt-2 line-clamp-2 text-xs leading-5 text-gray-400">{job.seed_excerpt}</div>
                            <div className="mt-3 text-[11px] uppercase tracking-wide text-gray-500">{job.stage}</div>
                          </button>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedJobId((previous) => (previous === job.job_id ? null : job.job_id))}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-xs text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-800"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {selected ? "收起详情" : "查看详情"}
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
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-gray-800 bg-gray-900/60 p-5">
                {selectedJob ? (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-semibold">{selectedJob.title}</h2>
                          <JobStatusBadge status={selectedJob.status} />
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          当前阶段 <span className="text-gray-300">{selectedJob.stage}</span> · 导入目标{" "}
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
                            {cancellingJobId === selectedJob.job_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                            取消
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleDeleteJob(selectedJob)}
                            disabled={deletingJobId === selectedJob.job_id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingJobId === selectedJob.job_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
                      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                        {selectedJob.error_message}
                      </div>
                    )}

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-gray-800 bg-gray-950/50 p-4">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Seed</div>
                        <pre className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-200">
                          {selectedJob.seed_text}
                        </pre>
                      </div>
                      <div className="rounded-2xl border border-gray-800 bg-gray-950/50 p-4">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Workspace</div>
                        <div className="mt-2 break-all font-mono text-xs text-gray-300">{selectedJob.workspace_dir}</div>
                        <div className="mt-4 text-xs uppercase tracking-wide text-gray-500">Log File</div>
                        <div className="mt-2 break-all font-mono text-xs text-gray-300">{selectedJob.log_path}</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-800 bg-gray-950/50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Log Tail</div>
                        {selectedJob.status === "running" && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-300">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            实时刷新
                          </span>
                        )}
                      </div>
                      <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/30 p-3 font-mono text-xs text-gray-200">
                        {selectedJob.log_tail || "No logs yet."}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[22rem] items-center justify-center rounded-2xl border border-dashed border-gray-800 text-sm text-gray-500">
                    选择一条运行记录，查看 seed、产物目录和实时日志。
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
