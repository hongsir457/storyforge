
import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Upload, FileText, Sparkles, Loader2, CheckCircle2, Plus } from "lucide-react";
import { API } from "@/api";
import { useAppStore } from "@/stores/app-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadPhase = "loading" | "idle" | "has_sources" | "uploading" | "analyzing" | "done";

interface WelcomeCanvasProps {
  projectName: string;
  projectTitle?: string;
  onUpload?: (file: File) => Promise<void>;
  onAnalyze?: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// WelcomeCanvas — shown when a project has no overview yet.
// Two entry states:
//   - idle: no source files → show drag-drop upload zone
//   - has_sources: source files exist → show file list + "开始分析" button
// Then: uploading → analyzing → done
// ---------------------------------------------------------------------------

export function WelcomeCanvas({
  projectName,
  projectTitle,
  onUpload,
  onAnalyze,
}: WelcomeCanvasProps) {
  const { t } = useTranslation("dashboard");
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<UploadPhase>("loading");
  const [sourceFiles, setSourceFiles] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceFilesVersion = useAppStore((s) => s.sourceFilesVersion);
  const displayProjectTitle = projectTitle?.trim() || projectName;

  // Check existing source files on mount and when sourceFilesVersion changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await API.listFiles(projectName);
        // Backend returns grouped object: { files: { source: [{name, size, url}, ...], ... } }
        const sourceGroup = res.files?.source ?? [];
        const sources = sourceGroup.map((f) => `source/${f.name}`);
        if (!cancelled) {
          setSourceFiles(sources);
          // Only update phase if we're in a state that should react to file list changes
          setPhase((prev) => {
            if (prev === "loading" || prev === "idle" || prev === "has_sources") {
              return sources.length > 0 ? "has_sources" : "idle";
            }
            return prev;
          });
        }
      } catch {
        if (!cancelled) setPhase((prev) => prev === "loading" ? "idle" : prev);
      }
    })();
    return () => { cancelled = true; };
  }, [projectName, sourceFilesVersion]);

  const processFile = useCallback(
    async (file: File) => {
      if (!onUpload) return;
      setFileName(file.name);
      setError(null);

      // Phase: Upload
      setPhase("uploading");
      try {
        await onUpload(file);
      } catch (err) {
        setError(`${t("upload_failed")}${(err as Error).message}`);
        setPhase(sourceFiles.length > 0 ? "has_sources" : "idle");
        return;
      }

      // Update source files list
      setSourceFiles((prev) => {
        const name = `source/${file.name}`;
        return prev.includes(name) ? prev : [...prev, name];
      });

      // Notify sidebar to refresh
      useAppStore.getState().invalidateSourceFiles();

      // Transition to has_sources so user can review or add more
      setPhase("has_sources");
    },
    [onUpload, sourceFiles.length, t],
  );

  const startAnalysis = useCallback(async () => {
    if (!onAnalyze) return;
    setError(null);
    setPhase("analyzing");
    try {
      await onAnalyze();
      setPhase("done");
    } catch (err) {
      setError(`${t("analysis_failed")}${(err as Error).message}`);
      setPhase("has_sources");
    }
  }, [onAnalyze, t]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".txt") || file.name.endsWith(".md"))) {
        processFile(file);
      }
    },
    [processFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile],
  );

  if (phase === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--sf-blue)]" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="max-w-lg text-center space-y-6">
        {/* Welcome heading */}
        <div>
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-[var(--sf-blue)]" />
          <h1 className="text-2xl font-bold text-[var(--sf-text)]">
            {t("welcome_to_project", { title: displayProjectTitle })}
          </h1>
          <p className="mt-2 text-sm text-[var(--sf-text-muted)]">
            {phase === "idle" && t("welcome_idle_desc")}
            {phase === "has_sources" && t("welcome_has_sources_desc")}
            {phase === "uploading" && t("uploading_file", { name: fileName })}
            {phase === "analyzing" && t("analyzing_content_desc")}
            {phase === "done" && t("analysis_complete_loading")}
          </p>
        </div>

        {/* ---- IDLE: No source files, show upload zone ---- */}
        {phase === "idle" && (
          <button
            type="button"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full cursor-pointer rounded-xl border-2 border-dashed p-12 transition-colors text-center ${
              isDragging
                ? "border-sky-400 bg-sky-100/60"
                : "border-[rgba(117,132,159,0.18)] bg-white/70 hover:border-[rgba(24,151,214,0.22)] hover:bg-white"
            }`}
          >
            <Upload
              className={`mx-auto h-8 w-8 ${isDragging ? "text-[var(--sf-blue)]" : "text-[var(--sf-text-soft)]"}`}
            />
            <p className="mt-3 text-sm text-[var(--sf-text)]">{t("drop_files_here")}</p>
            <p className="mt-1 text-xs text-[var(--sf-text-soft)]">
              {t("click_to_select_files")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              aria-label={t("upload_script_file_aria")}
              className="hidden"
              onChange={handleFileSelect}
            />
          </button>
        )}

        {/* ---- HAS_SOURCES: Source files exist, show list + analyze button ---- */}
        {phase === "has_sources" && (
          <div className="space-y-4">
            {/* Source file list */}
            <div className="rounded-[1.4rem] border border-[rgba(117,132,159,0.18)] bg-white/80 p-4 text-left shadow-[0_18px_40px_rgba(23,38,69,0.06)]">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-soft)]">
                {t("uploaded_source_files")}
              </p>
              <div className="space-y-1.5">
                {sourceFiles.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-[var(--sf-text)]">
                    <FileText className="h-4 w-4 shrink-0 text-[var(--sf-text-soft)]" />
                    <span className="truncate">{f.replace(/^source\//, "")}</span>
                  </div>
                ))}
              </div>
              {/* Add more files */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 flex items-center gap-1.5 text-xs text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-text)]"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("add_more_files")}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md"
                aria-label={t("upload_script_file_aria")}
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Drop zone (compact) */}
            <button
              type="button"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`w-full rounded-lg border border-dashed p-4 text-xs transition-colors ${
                isDragging
                  ? "border-sky-400 bg-sky-100/60 text-[var(--sf-blue)]"
                  : "border-[rgba(117,132,159,0.18)] bg-white/70 text-[var(--sf-text-soft)] hover:border-[rgba(24,151,214,0.22)]"
              }`}
            >
              {t("drop_more_files_here")}
            </button>

            {/* Analyze button */}
            <button
              type="button"
              onClick={startAnalysis}
            className="storyforge-primary-button w-full rounded-[1rem] px-6 py-3 text-sm font-medium transition hover:-translate-y-0.5"
          >
              <Sparkles className="inline-block h-4 w-4 mr-2 -mt-0.5" />
              {t("start_ai_analysis")}
            </button>
          </div>
        )}

        {/* ---- UPLOADING ---- */}
        {phase === "uploading" && (
          <div className="rounded-[1.4rem] border border-[rgba(117,132,159,0.18)] bg-white/80 p-12">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--sf-blue)]" />
            <p className="mt-3 text-sm text-[var(--sf-text)]">{t("uploading")}</p>
            <p className="mt-1 text-xs text-[var(--sf-text-soft)]">{fileName}</p>
          </div>
        )}

        {/* ---- ANALYZING ---- */}
        {phase === "analyzing" && (
          <div className="rounded-[1.4rem] border border-sky-200 bg-sky-50/80 p-12">
            <Sparkles className="mx-auto h-10 w-10 animate-pulse text-[var(--sf-blue)]" />
            <p className="mt-3 text-sm font-medium text-[var(--sf-blue-strong)]">{t("ai_analyzing")}</p>
            <p className="mt-1 text-xs text-[var(--sf-text-muted)]">{t("extracting_metadata_desc")}</p>
            <div className="mt-4 mx-auto h-1 w-48 overflow-hidden rounded-full bg-sky-100">
              <div className="animate-progress h-full rounded-full bg-[var(--sf-blue)]" />
            </div>
          </div>
        )}

        {/* ---- DONE ---- */}
        {phase === "done" && (
          <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50/80 p-12">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
            <p className="mt-3 text-sm text-emerald-800">{t("analysis_complete")}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="text-sm text-rose-700">{error}</p>
        )}

        {/* Quick tips — only in idle state */}
        {phase === "idle" && (
          <div className="text-left space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-soft)]">
              {t("what_happens_next")}
            </p>
            <div className="space-y-1.5 text-xs text-[var(--sf-text-muted)]">
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--sf-text-soft)]" />
                <span>{t("ai_will_analyze_desc")}</span>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--sf-blue)]" />
                <span>{t("overview_gen_desc")}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
