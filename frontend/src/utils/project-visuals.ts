import type {
  ProjectData,
  StoryboardSyncSettings,
  ToneConsoleSettings,
  VisualCaptureSettings,
} from "@/types";

export const DEFAULT_VISUAL_CAPTURE: VisualCaptureSettings = {
  enabled: true,
  use_previous_storyboard: true,
  reference_mode: "balanced",
  continuity_notes: "",
};

export const DEFAULT_TONE_CONSOLE: ToneConsoleSettings = {
  palette_mode: "story-led",
  saturation: 0,
  warmth: 0,
  contrast: 0,
  tone_notes: "",
};

export const DEFAULT_STORYBOARD_SYNC: StoryboardSyncSettings = {
  sync_story_beats: true,
  sync_camera_language: true,
  export_notes: "",
};

function clampSignedLevel(value: unknown, fallback: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(-2, Math.min(2, Math.round(numeric)));
}

export function normalizeVisualCapture(
  value?: Partial<VisualCaptureSettings> | null,
): VisualCaptureSettings {
  const referenceMode =
    value?.reference_mode === "composition" || value?.reference_mode === "tone"
      ? value.reference_mode
      : "balanced";
  return {
    enabled: value?.enabled ?? DEFAULT_VISUAL_CAPTURE.enabled,
    use_previous_storyboard:
      value?.use_previous_storyboard ?? DEFAULT_VISUAL_CAPTURE.use_previous_storyboard,
    reference_mode: referenceMode,
    continuity_notes: String(value?.continuity_notes ?? "").trim(),
  };
}

export function normalizeToneConsole(
  value?: Partial<ToneConsoleSettings> | null,
): ToneConsoleSettings {
  const paletteMode =
    value?.palette_mode === "editorial-warm" ||
    value?.palette_mode === "cool-cinematic" ||
    value?.palette_mode === "noir-contrast" ||
    value?.palette_mode === "dream-wash"
      ? value.palette_mode
      : "story-led";
  return {
    palette_mode: paletteMode,
    saturation: clampSignedLevel(value?.saturation, DEFAULT_TONE_CONSOLE.saturation),
    warmth: clampSignedLevel(value?.warmth, DEFAULT_TONE_CONSOLE.warmth),
    contrast: clampSignedLevel(value?.contrast, DEFAULT_TONE_CONSOLE.contrast),
    tone_notes: String(value?.tone_notes ?? "").trim(),
  };
}

export function normalizeStoryboardSync(
  value?: Partial<StoryboardSyncSettings> | null,
): StoryboardSyncSettings {
  return {
    sync_story_beats: value?.sync_story_beats ?? DEFAULT_STORYBOARD_SYNC.sync_story_beats,
    sync_camera_language:
      value?.sync_camera_language ?? DEFAULT_STORYBOARD_SYNC.sync_camera_language,
    export_notes: String(value?.export_notes ?? "").trim(),
  };
}

export function getProjectVisualCapture(
  projectData?: ProjectData | null,
): VisualCaptureSettings {
  return normalizeVisualCapture(projectData?.visual_capture);
}

export function getProjectToneConsole(
  projectData?: ProjectData | null,
): ToneConsoleSettings {
  return normalizeToneConsole(projectData?.tone_console);
}

export function getProjectStoryboardSync(
  projectData?: ProjectData | null,
): StoryboardSyncSettings {
  return normalizeStoryboardSync(projectData?.storyboard_sync);
}
