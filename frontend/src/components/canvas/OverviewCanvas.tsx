
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, RefreshCw, Trash2, Upload } from "lucide-react";
import type { ProjectData } from "@/types";
import { API } from "@/api";
import { useProjectsStore } from "@/stores/projects-store";
import { useAppStore } from "@/stores/app-store";
import { useCostStore } from "@/stores/cost-store";
import { PreviewableImageFrame } from "@/components/ui/PreviewableImageFrame";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatCost, totalBreakdown } from "@/utils/cost-format";

import { WelcomeCanvas } from "./WelcomeCanvas";

interface OverviewCanvasProps {
  projectName: string;
  projectData: ProjectData | null;
}

export function OverviewCanvas({ projectName, projectData }: OverviewCanvasProps) {
  const { t } = useTranslation("dashboard");
  const tRef = useRef(t);
  tRef.current = t;
  const styleImageFp = useProjectsStore(
    (s) => projectData?.style_image ? s.getAssetFingerprint(projectData.style_image) : null,
  );
  const projectTotals = useCostStore((s) => s.costData?.project_totals);
  const getEpisodeCost = useCostStore((s) => s.getEpisodeCost);
  const costLoading = useCostStore((s) => s.loading);
  const costError = useCostStore((s) => s.error);
  const debouncedFetch = useCostStore((s) => s.debouncedFetch);

  useEffect(() => {
    if (!projectName) return;
    debouncedFetch(projectName);
  }, [projectName, projectData?.episodes, debouncedFetch]);

  const [regenerating, setRegenerating] = useState(false);
  const [uploadingStyleImage, setUploadingStyleImage] = useState(false);
  const [deletingStyleImage, setDeletingStyleImage] = useState(false);
  const [savingStyleDescription, setSavingStyleDescription] = useState(false);
  const [styleDescriptionDraft, setStyleDescriptionDraft] = useState(
    projectData?.style_description ?? "",
  );
  const styleInputRef = useRef<HTMLInputElement>(null);

  const refreshProject = useCallback(
    async () => {
      const res = await API.getProject(projectName);
      useProjectsStore.getState().setCurrentProject(
        projectName,
        res.project,
        res.scripts ?? {},
        res.asset_fingerprints,
      );
    },
    [projectName],
  );

  useEffect(() => {
    setStyleDescriptionDraft(projectData?.style_description ?? "");
  }, [projectData?.style_description]);

  const handleUpload = useCallback(
    async (file: File) => {
      await API.uploadFile(projectName, "source", file);
      useAppStore.getState().pushToast(tRef.current("source_file_upload_success", { name: file.name }), "success");
    },
    [projectName],
  );

  const handleAnalyze = useCallback(async () => {
    await API.generateOverview(projectName);
    await refreshProject();
  }, [projectName, refreshProject]);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      await API.generateOverview(projectName);
      await refreshProject();
      useAppStore.getState().pushToast(tRef.current("project_overview_regenerated"), "success");
    } catch (err) {
      useAppStore
        .getState()
        .pushToast(`${tRef.current("regenerate_failed")}${(err as Error).message}`, "error");
    } finally {
      setRegenerating(false);
    }
  }, [projectName, refreshProject]);

  const handleStyleImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      setUploadingStyleImage(true);
      try {
        await API.uploadStyleImage(projectName, file);
        await refreshProject();
        useAppStore.getState().pushToast(tRef.current("style_image_updated"), "success");
      } catch (err) {
        useAppStore
          .getState()
          .pushToast(`${tRef.current("upload_failed")}${(err as Error).message}`, "error");
      } finally {
        setUploadingStyleImage(false);
      }
    },
    [projectName, refreshProject],
  );

  const handleDeleteStyleImage = useCallback(async () => {
    if (deletingStyleImage || !projectData?.style_image) return;
    if (!confirm(tRef.current("confirm_delete_style_image"))) return;

    setDeletingStyleImage(true);
    try {
      await API.deleteStyleImage(projectName);
      await refreshProject();
      useAppStore.getState().pushToast(tRef.current("style_image_deleted"), "success");
    } catch (err) {
      useAppStore
        .getState()
        .pushToast(`${tRef.current("delete_failed")}${(err as Error).message}`, "error");
    } finally {
      setDeletingStyleImage(false);
    }
  }, [deletingStyleImage, projectData?.style_image, projectName, refreshProject]);

  const handleSaveStyleDescription = useCallback(async () => {
    if (savingStyleDescription) return;
    setSavingStyleDescription(true);
    try {
      await API.updateStyleDescription(projectName, styleDescriptionDraft.trim());
      await refreshProject();
      useAppStore.getState().pushToast(tRef.current("style_desc_saved"), "success");
    } catch (err) {
      useAppStore
        .getState()
        .pushToast(`${tRef.current("save_failed")}${(err as Error).message}`, "error");
    } finally {
      setSavingStyleDescription(false);
    }
  }, [projectName, refreshProject, savingStyleDescription, styleDescriptionDraft]);

  if (!projectData) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--sf-text-soft)]">
        {t("loading_project_data")}
      </div>
    );
  }

  const status = projectData.status;
  const overview = projectData.overview;
  const styleImageUrl = projectData.style_image
    ? API.getFileUrl(projectName, projectData.style_image, styleImageFp)
    : null;
  const styleDescriptionDirty =
    styleDescriptionDraft !== (projectData.style_description ?? "");
  const showWelcome = !overview && (projectData.episodes?.length ?? 0) === 0;
  const projectStyleCard = (
    <section className="rounded-[1.8rem] border border-[rgba(117,132,159,0.18)] bg-white/82 p-4 shadow-[0_18px_40px_rgba(23,38,69,0.06)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--sf-text)]">{t("project_style_title")}</h3>
          <p className="max-w-2xl text-xs leading-5 text-[var(--sf-text-soft)]">
            {t("style_desc_hint")}
          </p>
        </div>
        <div className="inline-flex items-center rounded-full border border-[rgba(117,132,159,0.18)] bg-[rgba(24,151,214,0.08)] px-3 py-1 text-xs font-medium text-[var(--sf-blue-strong)]">
          {projectData.style || t("style_tag_unset")}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3">
          {styleImageUrl ? (
            <PreviewableImageFrame src={styleImageUrl} alt={t("visual_style_reference")}>
              <div className="overflow-hidden rounded-[1.2rem] border border-[rgba(117,132,159,0.18)] bg-white/90">
                <img
                  src={styleImageUrl}
                  alt={t("visual_style_reference")}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            </PreviewableImageFrame>
          ) : (
            <button
              type="button"
              onClick={() => styleInputRef.current?.click()}
              disabled={uploadingStyleImage}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-[1.2rem] border border-dashed border-[rgba(117,132,159,0.18)] bg-white/80 px-4 text-sm text-[var(--sf-text-soft)] transition-colors hover:border-[rgba(24,151,214,0.22)] hover:text-[var(--sf-text)] disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
            >
              <Upload className="h-4 w-4" />
              <span>{uploadingStyleImage ? t("uploading_style_image") : t("upload_style_reference")}</span>
              <span className="text-xs text-[var(--sf-text-soft)]">{t("supported_formats")}</span>
            </button>
          )}

          <div className="rounded-[1.2rem] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-3">
            <p className="text-xs font-medium text-[var(--sf-text-soft)]">{t("usage_guide")}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--sf-text-muted)]">
              {styleImageUrl
                ? t("style_usage_with_image")
                : t("style_usage_without_image")}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => styleInputRef.current?.click()}
                disabled={uploadingStyleImage}
                className="storyforge-secondary-button inline-flex items-center gap-1.5 rounded-[1rem] px-3 py-2 text-sm transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ImagePlus className="h-4 w-4" />
                {styleImageUrl ? t("replace_reference") : t("upload_reference")}
              </button>
              {styleImageUrl && (
                <button
                  type="button"
                  onClick={() => void handleDeleteStyleImage()}
                  disabled={deletingStyleImage}
                  className="inline-flex items-center gap-1.5 rounded-[1rem] border border-rose-300/55 bg-rose-100/72 px-3 py-2 text-sm text-rose-900 transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingStyleImage ? t("deleting_reference") : t("delete_reference")}
                </button>
              )}
            </div>
          </div>

          <input
            ref={styleInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            onChange={handleStyleImageChange}
            className="hidden"
            aria-label={t("upload_style_ref_aria")}
          />
        </div>

        <div className="rounded-[1.2rem] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="style-description-textarea" className="text-xs font-medium text-[var(--sf-text-soft)]">{t("style_description")}</label>
            <span className="text-[11px] text-[var(--sf-text-soft)]">
              {t("style_desc_char_count", { count: styleDescriptionDraft.trim().length })}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--sf-text-soft)]">
            {t("style_desc_auto_hint")}
          </p>

          <textarea
            id="style-description-textarea"
            value={styleDescriptionDraft}
            onChange={(e) => setStyleDescriptionDraft(e.target.value)}
            rows={8}
            className="storyforge-input mt-3 min-h-44 w-full rounded-[1rem] px-4 py-3 text-sm leading-relaxed outline-none transition"
            placeholder={t("style_desc_textarea_placeholder")}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-5 text-[var(--sf-text-soft)]">
              {styleImageUrl
                ? t("style_tip_with_image")
                : t("style_tip_without_image")}
            </p>
            {styleDescriptionDirty && (
              <button
                type="button"
                onClick={() => void handleSaveStyleDescription()}
                disabled={savingStyleDescription}
                className="storyforge-primary-button rounded-[1rem] px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingStyleDescription ? t("common:saving") : t("save_style_description")}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sf-text)]">{projectData.title}</h1>
          <p className="mt-1 text-sm text-[var(--sf-text-muted)]">
            {projectData.content_mode === "narration"
              ? t("narration_visuals_mode")
              : t("drama_animation_mode")}{" "}
            · {projectData.style || t("style_not_set")}
          </p>
        </div>

        {showWelcome ? (
          <WelcomeCanvas
            projectName={projectName}
            projectTitle={projectData.title}
            onUpload={handleUpload}
            onAnalyze={handleAnalyze}
          />
        ) : (
          <>
            {overview && (
              <div className="space-y-3 rounded-[1.6rem] border border-[rgba(117,132,159,0.18)] bg-white/80 p-4 shadow-[0_18px_40px_rgba(23,38,69,0.06)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--sf-text)]">{t("project_overview_title")}</h3>
                  <button
                    type="button"
                    onClick={() => void handleRegenerate()}
                    disabled={regenerating}
                    className="storyforge-secondary-button flex items-center gap-1 rounded-full px-3 py-1.5 text-xs transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                    title={t("regen_overview_title")}
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`}
                    />
                    <span>{regenerating ? t("regenerating_short") : t("regen_short")}</span>
                  </button>
                </div>
                <p className="text-sm text-[var(--sf-text-muted)]">{overview.synopsis}</p>
                <div className="flex gap-4 text-xs text-[var(--sf-text-soft)]">
                  <span>{t("genre_prefix")}{overview.genre}</span>
                  <span>{t("theme_prefix")}{overview.theme}</span>
                </div>
              </div>
            )}

            {status && (
              <div className="grid grid-cols-2 gap-3">
                {(["characters", "clues"] as const).map(
                  (key) => {
                    const cat = status[key] as
                      | { total: number; completed: number }
                      | undefined;
                    if (!cat) return null;
                    const pct =
                      cat.total > 0
                        ? Math.round((cat.completed / cat.total) * 100)
                        : 0;
                    const labels: Record<string, string> = {
                      characters: t("characters"),
                      clues: t("clues"),
                    };
                    return (
                      <div
                        key={key}
                        className="rounded-[1.2rem] border border-[rgba(117,132,159,0.18)] bg-white/80 p-3"
                      >
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-[var(--sf-text-soft)]">{labels[key]}</span>
                          <span className="text-[var(--sf-text-muted)]">
                            {cat.completed}/{cat.total}
                          </span>
                        </div>
                        <ProgressBar value={pct} />
                      </div>
                    );
                  },
                )}
              </div>
            )}

            {costLoading && (
              <div className="rounded-[1.4rem] border border-[rgba(117,132,159,0.18)] bg-white/80 p-4">
                <p className="animate-pulse text-sm text-[var(--sf-text-soft)]">{t("calculating_cost")}</p>
              </div>
            )}
            {costError && (
              <div className="rounded-[1.4rem] border border-rose-300/55 bg-rose-100/72 p-4">
                <p className="text-sm text-rose-900">{t("cost_estimate_failed")}{costError}</p>
              </div>
            )}

            {projectTotals && (
              <div className="rounded-[1.6rem] border border-[rgba(117,132,159,0.18)] bg-white/80 p-4 tabular-nums shadow-[0_18px_40px_rgba(23,38,69,0.06)]">
                <p className="mb-3 text-sm font-semibold text-[var(--sf-text)]">{t("project_total_cost")}</p>
                <dl className="flex flex-wrap items-start justify-between gap-6">
                  <div className="min-w-0">
                    <dt className="mb-1 text-[11px] text-[var(--sf-text-soft)]">{t("estimate")}</dt>
                    <dd className="text-sm text-[var(--sf-text-muted)]">
                      <span className="text-[var(--sf-text-soft)]">{t("storyboard")} </span>
                      <span className="text-[var(--sf-text)]">{formatCost(projectTotals.estimate.image)}</span>
                      <span className="ml-3 text-[var(--sf-text-soft)]">{t("video")} </span>
                      <span className="text-[var(--sf-text)]">{formatCost(projectTotals.estimate.video)}</span>
                      <span className="ml-3 text-[var(--sf-text-soft)]">{t("total")} </span>
                      <span className="font-semibold text-amber-400">{formatCost(totalBreakdown(projectTotals.estimate))}</span>
                    </dd>
                  </div>
                  <div role="separator" className="h-8 w-px bg-[rgba(117,132,159,0.18)]" />
                  <div className="min-w-0">
                    <dt className="mb-1 text-[11px] text-[var(--sf-text-soft)]">{t("actual")}</dt>
                    <dd className="text-sm text-[var(--sf-text-muted)]">
                      <span className="text-[var(--sf-text-soft)]">{t("storyboard")} </span>
                      <span className="text-[var(--sf-text)]">{formatCost(projectTotals.actual.image)}</span>
                      <span className="ml-3 text-[var(--sf-text-soft)]">{t("video")} </span>
                      <span className="text-[var(--sf-text)]">{formatCost(projectTotals.actual.video)}</span>
                      {projectTotals.actual.character_and_clue && (
                        <>
                          <span className="ml-3 text-[var(--sf-text-soft)]">{t("character_and_clue")} </span>
                          <span className="text-[var(--sf-text)]">{formatCost(projectTotals.actual.character_and_clue)}</span>
                        </>
                      )}
                      <span className="ml-3 text-[var(--sf-text-soft)]">{t("total")} </span>
                      <span className="font-semibold text-emerald-400">{formatCost(totalBreakdown(projectTotals.actual))}</span>
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--sf-text)]">{t("episodes_title")}</h3>
              {(projectData.episodes?.length ?? 0) === 0 ? (
                <p className="text-sm text-[var(--sf-text-soft)]">
                  {t("no_episodes_ai_hint")}
                </p>
              ) : (
                (projectData.episodes ?? []).map((ep) => {
                  const epCost = getEpisodeCost(ep.episode);
                  return (
                    <div
                      key={ep.episode}
                      className="flex flex-wrap items-center gap-3 rounded-[1.2rem] border border-[rgba(117,132,159,0.18)] bg-white/80 px-4 py-2.5 tabular-nums"
                    >
                      <span className="font-mono text-xs text-[var(--sf-text-soft)]">
                        E{ep.episode}
                      </span>
                      <span className="text-sm text-[var(--sf-text)]">{ep.title}</span>
                      <span className="text-xs text-[var(--sf-text-soft)]">
                        {t("segments_and_status", { count: ep.scenes_count ?? "?", status: ep.status ?? "draft" })}
                      </span>
                      {epCost && (
                        <span className="ml-auto flex min-w-0 flex-shrink flex-wrap gap-4 text-xs text-[var(--sf-text-muted)]">
                          <span>
                            <span className="text-[var(--sf-text-soft)]">{t("estimate")} </span>
                            <span className="text-[var(--sf-text-soft)]">{t("storyboard")} </span><span className="text-[var(--sf-text)]">{formatCost(epCost.totals.estimate.image)}</span>
                            <span className="ml-2 text-[var(--sf-text-soft)]">{t("video")} </span><span className="text-[var(--sf-text)]">{formatCost(epCost.totals.estimate.video)}</span>
                            <span className="ml-2 text-[var(--sf-text-soft)]">{t("total")} </span><span className="font-medium text-amber-400">{formatCost(totalBreakdown(epCost.totals.estimate))}</span>
                          </span>
                          <span className="text-[rgba(117,132,159,0.22)]">|</span>
                          <span>
                            <span className="text-[var(--sf-text-soft)]">{t("actual")} </span>
                            <span className="text-[var(--sf-text-soft)]">{t("storyboard")} </span><span className="text-[var(--sf-text)]">{formatCost(epCost.totals.actual.image)}</span>
                            <span className="ml-2 text-[var(--sf-text-soft)]">{t("video")} </span><span className="text-[var(--sf-text)]">{formatCost(epCost.totals.actual.video)}</span>
                            <span className="ml-2 text-[var(--sf-text-soft)]">{t("total")} </span><span className="font-medium text-emerald-400">{formatCost(totalBreakdown(epCost.totals.actual))}</span>
                          </span>
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {projectStyleCard}

        <div className="h-8" />
      </div>
    </div>
  );
}
