import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Film, Palette, RefreshCw, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { API } from "@/api";
import { useAppStore } from "@/stores/app-store";
import { useTasksStore } from "@/stores/tasks-store";
import type { ProjectData, ToneConsoleSettings, VisualCaptureSettings } from "@/types";
import {
  getProjectStoryboardSync,
  getProjectToneConsole,
  getProjectVisualCapture,
} from "@/utils/project-visuals";

interface VisualSystemsPanelProps {
  projectName: string;
  projectData: ProjectData;
  refreshProject: () => Promise<void>;
}

const CAPTURE_MODE_OPTIONS: Array<VisualCaptureSettings["reference_mode"]> = [
  "balanced",
  "composition",
  "tone",
];

const PALETTE_MODE_OPTIONS: Array<ToneConsoleSettings["palette_mode"]> = [
  "story-led",
  "editorial-warm",
  "cool-cinematic",
  "noir-contrast",
  "dream-wash",
];

function clampSignedLevel(value: number): number {
  return Math.max(-2, Math.min(2, Math.round(value)));
}

function areSettingsEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function ToneSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const accentClass =
    value > 0
      ? "text-amber-700 bg-amber-100/80 border-amber-300/60"
      : value < 0
        ? "text-cyan-700 bg-cyan-100/80 border-cyan-300/60"
        : "text-[var(--sf-text-soft)] bg-white/80 border-[rgba(117,132,159,0.18)]";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-medium text-[var(--sf-text-soft)]">{label}</label>
        <span className={`inline-flex min-w-10 justify-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${accentClass}`}>
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <input
        type="range"
        min={-2}
        max={2}
        step={1}
        value={value}
        onChange={(event) => onChange(clampSignedLevel(Number(event.target.value)))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[rgba(117,132,159,0.16)] accent-[var(--sf-blue)]"
      />
    </div>
  );
}

export function VisualSystemsPanel({
  projectName,
  projectData,
  refreshProject,
}: VisualSystemsPanelProps) {
  const { t } = useTranslation("dashboard");
  const pushToast = useAppStore((s) => s.pushToast);
  const projectSync = useAppStore((s) => s.projectSync);
  const taskStats = useTasksStore((s) => s.stats);
  const tasksConnected = useTasksStore((s) => s.connected);

  const initialVisualCapture = useMemo(
    () => getProjectVisualCapture(projectData),
    [projectData],
  );
  const initialToneConsole = useMemo(
    () => getProjectToneConsole(projectData),
    [projectData],
  );
  const initialStoryboardSync = useMemo(
    () => getProjectStoryboardSync(projectData),
    [projectData],
  );

  const [visualCaptureDraft, setVisualCaptureDraft] = useState(initialVisualCapture);
  const [toneConsoleDraft, setToneConsoleDraft] = useState(initialToneConsole);
  const [storyboardSyncDraft, setStoryboardSyncDraft] = useState(initialStoryboardSync);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVisualCaptureDraft(initialVisualCapture);
  }, [initialVisualCapture]);

  useEffect(() => {
    setToneConsoleDraft(initialToneConsole);
  }, [initialToneConsole]);

  useEffect(() => {
    setStoryboardSyncDraft(initialStoryboardSync);
  }, [initialStoryboardSync]);

  const isDirty =
    !areSettingsEqual(visualCaptureDraft, initialVisualCapture) ||
    !areSettingsEqual(toneConsoleDraft, initialToneConsole) ||
    !areSettingsEqual(storyboardSyncDraft, initialStoryboardSync);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await API.updateProject(projectName, {
        visual_capture: visualCaptureDraft,
        tone_console: toneConsoleDraft,
        storyboard_sync: storyboardSyncDraft,
      } as Record<string, unknown>);
      await refreshProject();
      pushToast(t("saved"), "success");
    } catch (err) {
      pushToast(
        `${t("save_failed")}${err instanceof Error ? err.message : String(err)}`,
        "error",
      );
    } finally {
      setSaving(false);
    }
  }, [
    projectName,
    pushToast,
    refreshProject,
    saving,
    storyboardSyncDraft,
    t,
    toneConsoleDraft,
    visualCaptureDraft,
  ]);

  const lastSyncTime = projectSync.lastEventAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(projectSync.lastEventAt)
    : t("sync_last_event_waiting");

  const actionLabels = projectSync.lastActions.length
    ? projectSync.lastActions.map((action) =>
        t(`sync_action_${action}`, { defaultValue: action }),
      )
    : [t("sync_no_recent_actions")];

  return (
    <section className="rounded-[1.8rem] border border-[rgba(117,132,159,0.18)] bg-white/82 p-4 shadow-[0_18px_40px_rgba(23,38,69,0.06)] sm:p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--sf-text)]">{t("visual_systems_title")}</h3>
          <p className="max-w-3xl text-xs leading-5 text-[var(--sf-text-soft)]">
            {t("visual_systems_desc")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!isDirty || saving}
          className="frametale-primary-button inline-flex items-center gap-2 rounded-[1rem] px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} />
          {saving ? t("common:saving") : t("save_visual_systems")}
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-[1.4rem] border border-[rgba(117,132,159,0.16)] bg-[linear-gradient(180deg,rgba(17,25,39,0.98),rgba(28,39,57,0.94))] p-4 text-white shadow-[0_20px_42px_rgba(15,23,42,0.18)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200/80">Main Engine</div>
              <h4 className="mt-2 text-base font-semibold">{t("dynamic_visual_capture_title")}</h4>
              <p className="mt-2 text-xs leading-5 text-slate-300/92">{t("dynamic_visual_capture_desc")}</p>
            </div>
            <div className="rounded-full bg-white/10 p-2 text-sky-200">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>

          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setVisualCaptureDraft((current) => ({ ...current, enabled: true }))}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                visualCaptureDraft.enabled ? "bg-white text-slate-950" : "bg-white/8 text-slate-300 hover:bg-white/14"
              }`}
            >
              {t("enabled_label")}
            </button>
            <button
              type="button"
              onClick={() => setVisualCaptureDraft((current) => ({ ...current, enabled: false }))}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                !visualCaptureDraft.enabled ? "bg-white text-slate-950" : "bg-white/8 text-slate-300 hover:bg-white/14"
              }`}
            >
              {t("disabled_label")}
            </button>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-300">{t("capture_reference_mode")}</div>
              <div className="flex flex-wrap gap-2">
                {CAPTURE_MODE_OPTIONS.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setVisualCaptureDraft((current) => ({ ...current, reference_mode: mode }))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      visualCaptureDraft.reference_mode === mode
                        ? "border-white/50 bg-white text-slate-950"
                        : "border-white/12 bg-white/6 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {t(`capture_mode_${mode}`)}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-200">
              <input
                type="checkbox"
                checked={visualCaptureDraft.use_previous_storyboard}
                onChange={(event) =>
                  setVisualCaptureDraft((current) => ({
                    ...current,
                    use_previous_storyboard: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-white/20 bg-transparent text-[var(--sf-blue)] focus:ring-[var(--sf-blue)]"
              />
              <span>{t("capture_use_previous_storyboard")}</span>
            </label>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">{t("capture_continuity_notes")}</label>
              <textarea
                value={visualCaptureDraft.continuity_notes}
                onChange={(event) =>
                  setVisualCaptureDraft((current) => ({
                    ...current,
                    continuity_notes: event.target.value,
                  }))
                }
                rows={4}
                className="min-h-28 w-full rounded-[1rem] border border-white/10 bg-white/8 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-white/24"
                placeholder={t("capture_continuity_placeholder")}
              />
            </div>
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-[rgba(117,132,159,0.16)] bg-[linear-gradient(180deg,rgba(250,252,255,0.98),rgba(241,246,251,0.92))] p-4 shadow-[0_20px_42px_rgba(23,38,69,0.08)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--sf-blue-strong)]">Tone Console</div>
              <h4 className="mt-2 text-base font-semibold text-[var(--sf-text)]">{t("tone_console_title")}</h4>
              <p className="mt-2 text-xs leading-5 text-[var(--sf-text-soft)]">{t("tone_console_desc")}</p>
            </div>
            <div className="rounded-full bg-[rgba(24,151,214,0.1)] p-2 text-[var(--sf-blue)]">
              <Palette className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-[var(--sf-text-soft)]">{t("tone_palette_mode")}</div>
              <div className="flex flex-wrap gap-2">
                {PALETTE_MODE_OPTIONS.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setToneConsoleDraft((current) => ({ ...current, palette_mode: mode }))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      toneConsoleDraft.palette_mode === mode
                        ? "border-[rgba(24,151,214,0.3)] bg-[rgba(24,151,214,0.12)] text-[var(--sf-blue-strong)]"
                        : "border-[rgba(117,132,159,0.18)] bg-white/84 text-[var(--sf-text-soft)] hover:border-[rgba(24,151,214,0.22)] hover:text-[var(--sf-text)]"
                    }`}
                  >
                    {t(`tone_palette_${mode.replace(/-/g, "_")}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-[1rem] border border-[rgba(117,132,159,0.14)] bg-white/72 p-3">
              <ToneSlider
                label={t("tone_saturation")}
                value={toneConsoleDraft.saturation}
                onChange={(value) => setToneConsoleDraft((current) => ({ ...current, saturation: value }))}
              />
              <ToneSlider
                label={t("tone_warmth")}
                value={toneConsoleDraft.warmth}
                onChange={(value) => setToneConsoleDraft((current) => ({ ...current, warmth: value }))}
              />
              <ToneSlider
                label={t("tone_contrast")}
                value={toneConsoleDraft.contrast}
                onChange={(value) => setToneConsoleDraft((current) => ({ ...current, contrast: value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--sf-text-soft)]">{t("tone_notes")}</label>
              <textarea
                value={toneConsoleDraft.tone_notes}
                onChange={(event) =>
                  setToneConsoleDraft((current) => ({
                    ...current,
                    tone_notes: event.target.value,
                  }))
                }
                rows={4}
                className="frametale-input min-h-28 w-full rounded-[1rem] px-3 py-2 text-sm outline-none transition"
                placeholder={t("tone_notes_placeholder")}
              />
            </div>
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-[rgba(24,151,214,0.18)] bg-[linear-gradient(180deg,rgba(24,151,214,0.95),rgba(21,124,192,0.9))] p-4 text-white shadow-[0_20px_42px_rgba(10,94,149,0.22)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/90">Realtime Sync</div>
              <h4 className="mt-2 text-base font-semibold">{t("realtime_storyboard_sync_title")}</h4>
              <p className="mt-2 text-xs leading-5 text-cyan-50/92">{t("realtime_storyboard_sync_desc")}</p>
            </div>
            <div className="rounded-full bg-white/12 p-2 text-cyan-100">
              <Activity className="h-4 w-4" />
            </div>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1rem] border border-white/14 bg-white/12 p-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/78">{t("sync_stream_label")}</div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${projectSync.connected ? "bg-emerald-300" : "bg-rose-300"}`} />
                <span className="text-sm font-medium">
                  {projectSync.connected ? t("sync_connected") : t("sync_disconnected")}
                </span>
              </div>
              <p className="mt-2 text-xs text-cyan-50/88">
                {t("sync_last_event")} {lastSyncTime}
              </p>
            </div>
            <div className="rounded-[1rem] border border-white/14 bg-white/12 p-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/78">{t("sync_queue_label")}</div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${tasksConnected ? "bg-emerald-300" : "bg-amber-200"}`} />
                <span className="text-sm font-medium">
                  {tasksConnected ? t("sync_connected") : t("sync_disconnected")}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-[0.9rem] bg-white/12 px-2 py-2 text-center">
                  <div className="text-cyan-100/78">{t("queued_label")}</div>
                  <div className="mt-1 text-sm font-semibold">{taskStats.queued}</div>
                </div>
                <div className="rounded-[0.9rem] bg-white/12 px-2 py-2 text-center">
                  <div className="text-cyan-100/78">{t("running_label")}</div>
                  <div className="mt-1 text-sm font-semibold">{taskStats.running}</div>
                </div>
                <div className="rounded-[0.9rem] bg-white/12 px-2 py-2 text-center">
                  <div className="text-cyan-100/78">{t("completed_label")}</div>
                  <div className="mt-1 text-sm font-semibold">{taskStats.succeeded}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4 space-y-2">
            <div className="text-xs font-medium text-cyan-100/90">{t("sync_recent_actions")}</div>
            <div className="flex flex-wrap gap-2">
              {actionLabels.map((label, index) => (
                <span
                  key={`${label}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full border border-white/18 bg-white/12 px-3 py-1 text-xs text-white/92"
                >
                  <Film className="h-3 w-3" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs text-cyan-50">
              <input
                type="checkbox"
                checked={storyboardSyncDraft.sync_story_beats}
                onChange={(event) =>
                  setStoryboardSyncDraft((current) => ({
                    ...current,
                    sync_story_beats: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-white/20 bg-transparent text-white focus:ring-white"
              />
              <span>{t("sync_story_beats")}</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-cyan-50">
              <input
                type="checkbox"
                checked={storyboardSyncDraft.sync_camera_language}
                onChange={(event) =>
                  setStoryboardSyncDraft((current) => ({
                    ...current,
                    sync_camera_language: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-white/20 bg-transparent text-white focus:ring-white"
              />
              <span>{t("sync_camera_language")}</span>
            </label>

            <div className="space-y-2">
              <label className="text-xs font-medium text-cyan-100/90">{t("sync_export_notes")}</label>
              <textarea
                value={storyboardSyncDraft.export_notes}
                onChange={(event) =>
                  setStoryboardSyncDraft((current) => ({
                    ...current,
                    export_notes: event.target.value,
                  }))
                }
                rows={4}
                className="min-h-28 w-full rounded-[1rem] border border-white/14 bg-white/12 px-3 py-2 text-sm text-white outline-none transition placeholder:text-cyan-100/62 focus:border-white/24"
                placeholder={t("sync_export_placeholder")}
              />
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
