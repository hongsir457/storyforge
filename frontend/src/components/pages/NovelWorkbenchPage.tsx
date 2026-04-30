import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  AlertCircle,
  Archive,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronLeft,
  Copy,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircle,
  Send,
  RefreshCw,
  ServerCog,
  Share2,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { API } from "@/api";
import { SiteLegalFooter } from "@/components/legal/SiteLegalFooter";
import { Popover } from "@/components/ui/Popover";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import type {
  NovelAssistantBrief,
  NovelAssistantStage,
  NovelWorkbenchArtifact,
  NovelWorkbenchArtifactContentResponse,
  NovelWorkbenchArtifactListResponse,
  NovelWorkbenchJob,
  NovelWorkbenchLogResponse,
  NovelWorkbenchStatus,
} from "@/types";
import { copyText } from "@/utils/clipboard";

const WORKBENCH_COPY = {
  en: {
    back: "Back to Projects",
    eyebrow: "Novel studio",
    title: "Novel Workbench",
    subtitle:
      "Grow a seed into a long-form manuscript here, then hand the result back to Frametale for storyboard and video production.",
    refresh: "Refresh",
    loading: "Loading novel workbench...",
    navPrimary: "Start novel",
    navReadiness: "Run readiness",
    navLatest: "Latest",
    navSnapshot: "Snapshot",
    navHistory: "History",
    navDiagnostics: "Diagnostics",
    navClose: "Hide panel",
    focusedTitle: "Start this novel",
    focusedBody: "Use the assistant to settle the idea, then run the novel pipeline from this form.",
    heroEyebrow: "Novel starter",
    heroTitle: "Start a full-length narrative from one seed.",
    heroBody:
      "This surface is only responsible for the novel itself. Visual format, shot rhythm, and production settings stay in the project workspace so the story entry point stays focused.",
    formTitle: "Novel title",
    titlePlaceholder: "Above the Mountain Gate",
    projectName: "Imported project slug",
    projectNamePlaceholder: "Optional. Auto-generated if left blank.",
    writingLanguage: "Writing language",
    writingLanguageZh: "Simplified Chinese",
    seedLabel: "Seed text",
    seedPlaceholder:
      "Describe the premise, the relationships, the world, or the inciting incident you want to expand into a long-form novel.",
    seedHint: "The system writes this text into seed.txt and launches the full autonovel pipeline.",
    submit: "Start novel pipeline",
    submitting: "Starting...",
    flowEyebrow: "Pipeline shape",
    flowTitle: "What this run will do",
    flowSteps: [
      "Capture the title and seed so the narrative starting point is explicit.",
      "Generate worldbuilding, character systems, chapter structure, and a stable long-form direction.",
      "Iterate until the workbench produces a finished manuscript and export package.",
      "Import the result back into Frametale so storyboard and video production can continue.",
    ],
    readyEyebrow: "Run readiness",
    readyTitle: "Ready to create a new novel run",
    blockedTitle: "The pipeline is not ready yet",
    readyBody:
      "Core dependencies are available. After creation, the workbench will generate the narrative structure and an importable Frametale project.",
    blockedBody: "Complete the missing required dependencies before starting a new novel run.",
    optionalBody: "Optional capabilities are still missing. They do not block the run, but they may limit later extensions.",
    latestEyebrow: "Latest completed run",
    latestAction: "Open imported project",
    latestEmpty: "Once a run finishes, its import target will appear here as the clearest next step.",
    pulseEyebrow: "Run snapshot",
    totalRuns: "Runs",
    activeRuns: "Active",
    successfulRuns: "Succeeded",
    artifactCount: "Artifacts",
    diagnosticsSummary: "Runtime prerequisites and diagnostics",
    diagnosticsToggle: "View runtime prerequisites and diagnostics",
    coreDependencies: "Core dependencies",
    optionalExtensions: "Optional extensions",
    workspaceRoot: "Workspace Root",
    autonovelSource: "autonovel Source",
    importerScript: "Importer Script",
    runtimeEnv: "Runtime Env",
    runHistoryEyebrow: "Run history",
    runHistoryTitle: "Every run preserves the seed, logs, artifacts, and import result.",
    runHistoryEmpty: "No runs yet. Start the first novel job from the composer above.",
    details: "View details",
    collapse: "Hide details",
    cancel: "Cancel",
    delete: "Delete",
    detailsEmpty: "Select a run to inspect the seed, workspace artifacts, and log stream.",
    stage: "Current stage",
    target: "Import target",
    openProject: "Open Project",
    deleteRecord: "Delete record",
    created: "Created",
    updated: "Updated",
    language: "Language",
    started: "Started",
    finished: "Finished",
    seedCard: "Seed",
    workspaceCard: "Workspace & Log",
    viewFullLog: "View full log",
    downloadLog: "Download log",
    downloadArtifact: "Download",
    shareArtifact: "Share this artifact",
    shareToWechat: "WeChat",
    shareToX: "X / Twitter",
    shareLink: "Share link",
    copyShareLink: "Copy link",
    shareLinkCopied: "Share link copied.",
    wechatShareHint:
      "On mobile browsers this opens the system share sheet so you can send it to WeChat. On desktop, copy the link and forward it in WeChat.",
    shareSheetError: "Couldn't open the system share sheet.",
    exportWorkspace: "Export workspace ZIP",
    workspacePath: "Workspace Path",
    logFile: "Log File",
    fullLog: "Full Log",
    logTail: "Log Tail",
    liveRefreshing: "Live refresh",
    noLogsYet: "No logs yet.",
    truncatedLog: "Only the first 250 KB is shown in preview. Download the full log for the complete file.",
    artifactsTitle: "Workspace Artifacts",
    artifactsLoading: "Syncing artifacts",
    artifactsEmpty: "No artifacts are ready to browse yet.",
    previewTitle: "Artifact Preview",
    loadingPreview: "Loading preview...",
    previewTruncated: "The preview is truncated. Download the full file for the complete contents.",
    previewUnsupported: "This file type is not available inline. Download it directly.",
    previewEmpty: "Choose a previewable artifact to inspect it here, or download the entire workspace.",
    groupLabels: {
      inputs: "Inputs",
      planning: "Planning",
      chapters: "Chapters",
      export: "Export",
    },
    requirementLabels: {
      workspace_root_exists: "Workspace root",
      autonovel_repo_exists: "autonovel repo",
      importer_exists: "Importer script",
      autonovel_env_exists: "Runtime env",
      git_available: "git",
      uv_available: "uv",
    },
    statusLabels: {
      queued: "Queued",
      running: "Running",
      succeeded: "Succeeded",
      failed: "Failed",
      cancelled: "Cancelled",
    },
    createdToast: "Novel pipeline started.",
    cancelledToast: "Novel pipeline cancelled.",
    deleteActiveWarning: "Cancel the active run before deleting its record.",
    deletedToast: "Run record deleted.",
    confirmDelete: (title: string) => `Delete the run record "${title}"?`,
    artifactsSummary: (files: number, chapters: number) => `${files} files · ${chapters} chapters`,
    latestSummary: (finishedAt: string) => `Finished at ${finishedAt}. Continue in the imported project when you are ready for storyboards and video.`,
    twitterShareText: (artifactLabel: string, title: string) =>
      `Reading "${artifactLabel}" from ${title} on Frametale.`,
  },
  zh: {
    back: "返回项目",
    eyebrow: "Novel studio",
    title: "小说工坊",
    subtitle: "在这里把 seed 扩写成长篇小说，再把结果交回 Frametale 继续做分镜与视频制作。",
    refresh: "刷新",
    loading: "正在加载小说工坊...",
    navPrimary: "启动小说",
    navReadiness: "运行准备",
    navLatest: "最近完成",
    navSnapshot: "Snapshot",
    navHistory: "历史记录",
    navDiagnostics: "诊断",
    navClose: "收起",
    focusedTitle: "启动当前小说",
    focusedBody: "先和写作助手把设想确认清楚，再从这里启动小说流水线。",
    heroEyebrow: "Novel starter",
    heroTitle: "从一个 seed 启动完整长篇叙事。",
    heroBody:
      "这里只负责生成小说本体。画幅、镜头节奏、视觉风格与制作参数都留在项目空间，不再堆进小说入口。",
    formTitle: "小说标题",
    titlePlaceholder: "山门之上",
    projectName: "导入后的项目标识",
    projectNamePlaceholder: "可选，留空时自动生成。",
    writingLanguage: "写作语言",
    writingLanguageZh: "简体中文",
    seedLabel: "Seed 文案",
    seedPlaceholder: "输入你想扩展成长篇小说的核心设定、人物关系、世界观或故事起点。",
    seedHint: "系统会把这段文字写入 seed.txt，并触发完整的 autonovel 流水线。",
    submit: "启动小说流水线",
    submitting: "启动中...",
    flowEyebrow: "Pipeline shape",
    flowTitle: "这次运行会完成什么",
    flowSteps: [
      "记录标题和 seed，让故事起点足够明确。",
      "自动生成世界观、人物体系、章节结构与稳定的长篇方向。",
      "持续迭代直到产出完整小说与可导入包。",
      "把结果导回 Frametale，继续推进分镜与视频制作。",
    ],
    readyEyebrow: "运行准备度",
    readyTitle: "可以启动新的小说任务",
    blockedTitle: "当前还不能启动小说流水线",
    readyBody: "主流程依赖已经齐备。创建完成后，系统会自动生成叙事结构，并准备可导入的 Frametale 项目。",
    blockedBody: "先补齐缺失的必要依赖，再启动新的小说任务。",
    optionalBody: "可选能力尚未齐备。它们不会阻止运行，但可能影响后续扩展环节。",
    latestEyebrow: "最近完成",
    latestAction: "打开导入后的项目",
    latestEmpty: "任务完成后，这里会显示最清晰的下一步入口，方便你直接回到项目空间继续制作。",
    pulseEyebrow: "Run snapshot",
    totalRuns: "运行数",
    activeRuns: "活跃中",
    successfulRuns: "已完成",
    artifactCount: "产物数",
    diagnosticsSummary: "运行依赖与诊断信息",
    diagnosticsToggle: "查看运行环境与诊断",
    coreDependencies: "主流程依赖",
    optionalExtensions: "可选扩展",
    workspaceRoot: "工作目录",
    autonovelSource: "autonovel 源码",
    importerScript: "导入脚本",
    runtimeEnv: "运行环境",
    runHistoryEyebrow: "运行记录",
    runHistoryTitle: "每次运行都会保留 seed、日志、产物和导入结果。",
    runHistoryEmpty: "还没有运行记录。先从上面的表单发起第一条小说任务。",
    details: "查看详情",
    collapse: "收起详情",
    cancel: "取消",
    delete: "删除",
    detailsEmpty: "选择一条运行记录，查看 seed、产物目录和实时日志。",
    stage: "当前阶段",
    target: "导入目标",
    openProject: "打开项目",
    deleteRecord: "删除记录",
    created: "创建时间",
    updated: "更新时间",
    language: "写作语言",
    started: "启动时间",
    finished: "完成时间",
    seedCard: "Seed",
    workspaceCard: "Workspace & Log",
    viewFullLog: "查看完整日志",
    downloadLog: "下载日志",
    downloadArtifact: "下载",
    exportWorkspace: "导出工作区 ZIP",
    workspacePath: "工作区路径",
    logFile: "日志文件",
    fullLog: "完整日志",
    logTail: "日志尾部",
    liveRefreshing: "实时刷新",
    noLogsYet: "暂无日志。",
    truncatedLog: "当前只预览前 250 KB 日志，完整内容请使用“下载日志”。",
    artifactsTitle: "工作区产物",
    artifactsLoading: "同步产物",
    artifactsEmpty: "暂无可展示的工作区产物。",
    previewTitle: "产物预览",
    loadingPreview: "正在加载预览...",
    previewTruncated: "预览已截断，完整文件请使用下载。",
    previewUnsupported: "这个文件暂不支持内联预览，请直接下载。",
    previewEmpty: "选择一个可预览的产物查看内容，或直接下载整个工作区。",
    groupLabels: {
      inputs: "输入",
      planning: "规划",
      chapters: "章节",
      export: "导出",
    },
    requirementLabels: {
      workspace_root_exists: "工作目录",
      autonovel_repo_exists: "autonovel 仓库",
      importer_exists: "导入脚本",
      autonovel_env_exists: "运行环境",
      git_available: "git",
      uv_available: "uv",
    },
    statusLabels: {
      queued: "排队中",
      running: "运行中",
      succeeded: "已完成",
      failed: "失败",
      cancelled: "已取消",
    },
    createdToast: "小说流水线已启动。",
    cancelledToast: "小说流水线已取消。",
    deleteActiveWarning: "请先取消运行中的任务，再删除记录。",
    deletedToast: "运行记录已删除。",
    confirmDelete: (title: string) => `确认删除运行记录「${title}」吗？`,
    artifactsSummary: (files: number, chapters: number) => `${files} 个文件 · ${chapters} 个章节`,
    latestSummary: (finishedAt: string) => `已于 ${finishedAt} 完成。现在最合理的下一步，是回到导入后的项目继续推进分镜和视频。`,
  },
} as const;

const WORKBENCH_SHARE_COPY = {
  en: {
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
  },
  zh: {
    shareArtifact: "分享这个文件",
    shareToWechat: "微信",
    shareToX: "X / 推特",
    shareLink: "分享链接",
    copyShareLink: "复制链接",
    shareLinkCopied: "已复制分享链接。",
    wechatShareHint: "在手机浏览器里会直接调起系统分享面板，可选择微信；桌面端请复制链接后发到微信。",
    shareSheetError: "无法打开系统分享面板。",
    twitterShareText: (artifactLabel: string, title: string) => `我正在 Frametale 里阅读《${title}》中的《${artifactLabel}》。`,
  },
} as const;

const NOVEL_ASSISTANT_STAGES: NovelAssistantStage[] = [
  "seed",
  "style",
  "world",
  "characters",
  "plot",
  "outline",
];

const NOVEL_ASSISTANT_STORAGE_KEY = "frametale:novel-workbench-assistant:v1";

const NOVEL_ASSISTANT_COPY = {
  en: {
    eyebrow: "Writing partner",
    title: "Shape the novel before the pipeline starts",
    body:
      "Work through the creative brief with AI, confirm each section, then turn the approved material into the seed that drives autonovel.",
    instructionLabel: "Direction for this pass",
    instructionPlaceholder:
      "Tell the assistant what to emphasize, change, avoid, or decide next.",
    generate: "Generate / refine",
    generating: "Generating...",
    confirm: "Confirm section",
    confirmed: "Confirmed",
    composeSeed: "Use confirmed brief as seed",
    clear: "Clear brief",
    progress: (done: number, total: number) => `${done}/${total} confirmed`,
    applyToast: "Creative brief copied into the seed field.",
    clearToast: "Creative brief cleared.",
    generatedToast: "Assistant draft updated.",
    inputPlaceholder: "Discuss the current step, ask for options, or tell the assistant what to change...",
    send: "Send",
    draftAction: "Draft this step",
    drafting: "Thinking...",
    assistantName: "Assistant",
    userName: "You",
    currentDraft: "Editable draft",
    draftHint: "The assistant updates this draft from the conversation. Edit it directly before confirming.",
    emptyDraft: "No draft yet. Start the conversation or ask the assistant to draft this step.",
    confirmAndContinue: "Confirm and continue",
    applyConfirmed: "Apply confirmed brief to Seed",
    stepLabel: "Current step",
    reset: "Reset assistant",
    readyToConfirm: "Ready to confirm",
    errorMessage: "The writing assistant could not respond.",
    draftInstruction: (stageLabel: string) => `Draft or refine the ${stageLabel} section now.`,
    introMessage:
      "Hi. I will guide this novel through Seed, Style, World, Characters, Plot, and Outline. Tell me your initial idea, or ask me to draft the current step.",
    confirmedMessage: (stageLabel: string, nextStageLabel?: string) =>
      nextStageLabel
        ? `${stageLabel} is confirmed. I have moved us to ${nextStageLabel}; tell me what you already know there, or ask me to draft it.`
        : `${stageLabel} is confirmed. All six sections are ready; apply the confirmed brief to the Seed field when you want to run the pipeline.`,
    stageDetails: {
      seed: {
        label: "Seed",
        guide: "Core premise, protagonist, conflict, stakes, and the question the novel must answer.",
      },
      style: {
        label: "Style",
        guide: "POV, tense, tone, rhythm, dialogue rules, image wells, and patterns to avoid.",
      },
      world: {
        label: "World",
        guide: "Rules, institutions, constraints, locations, power structures, and costs.",
      },
      characters: {
        label: "Characters",
        guide: "Desires, fears, contradictions, relationships, secrets, and arc pressure.",
      },
      plot: {
        label: "Plot",
        guide: "Act turns, escalation, midpoint, all-is-lost pressure, climax, and aftermath.",
      },
      outline: {
        label: "Outline",
        guide: "Chapter count, chapter beats, emotional movement, plants/payoffs, and target word counts.",
      },
    },
  },
  zh: {
    eyebrow: "写作伙伴",
    title: "先把小说设想定准，再启动流水线",
    body: "和 AI 逐步商讨创作简报，确认 seed、风格、世界观、人物、剧情和章节大纲，再把确认后的内容写入 seed。",
    instructionLabel: "本轮想让助手处理什么",
    instructionPlaceholder: "写下你想强化、修改、避开的方向，或让 AI 帮你补齐哪些决定。",
    generate: "生成 / 改写",
    generating: "生成中...",
    confirm: "确认本节",
    confirmed: "已确认",
    composeSeed: "用确认内容生成 Seed",
    clear: "清空简报",
    progress: (done: number, total: number) => `${done}/${total} 已确认`,
    applyToast: "已把创作简报写入 Seed 文稿。",
    clearToast: "创作简报已清空。",
    generatedToast: "助手草案已更新。",
    inputPlaceholder: "和助手讨论当前步骤，要求给选项、改方向，或直接让它起草...",
    send: "发送",
    draftAction: "起草本步",
    drafting: "思考中...",
    assistantName: "助手",
    userName: "你",
    currentDraft: "可编辑草案",
    draftHint: "助手会把对话结果沉淀到这里。你可以直接改完再确认。",
    emptyDraft: "还没有草案。先对话，或让助手起草当前步骤。",
    confirmAndContinue: "确认并进入下一步",
    applyConfirmed: "写入已确认 Seed",
    stepLabel: "当前步骤",
    reset: "重置助手",
    readyToConfirm: "可以确认",
    errorMessage: "写作助手暂时无法回复。",
    draftInstruction: (stageLabel: string) => `请现在起草或改写「${stageLabel}」这一节。`,
    introMessage:
      "你好，我会按 Seed、风格、世界观、人物、剧情、大纲六步陪你把小说设想定下来。你可以先说最初的灵感，也可以让我直接起草当前步骤。",
    confirmedMessage: (stageLabel: string, nextStageLabel?: string) =>
      nextStageLabel
        ? `「${stageLabel}」已确认。我已经切到「${nextStageLabel}」，你可以告诉我已知设想，或让我先起草。`
        : `「${stageLabel}」已确认。六个部分都准备好了，可以把已确认内容写入 Seed 并启动流水线。`,
    stageDetails: {
      seed: {
        label: "Seed",
        guide: "核心设定、主角、冲突、利害关系，以及整本小说必须回答的问题。",
      },
      style: {
        label: "风格",
        guide: "视角、时态、语气、节奏、对白规则、意象来源和需要避开的写法。",
      },
      world: {
        label: "世界观",
        guide: "规则、制度、限制、地点、权力结构，以及每条设定带来的代价。",
      },
      characters: {
        label: "人物",
        guide: "欲望、恐惧、矛盾、关系、秘密，以及推动人物变化的压力。",
      },
      plot: {
        label: "剧情",
        guide: "幕结构、升级路径、中点反转、低谷、高潮机制和结局余波。",
      },
      outline: {
        label: "大纲",
        guide: "章节数量、每章事件、情绪推进、伏笔回收和目标字数。",
      },
    },
  },
} as const;

type WorkbenchLocale = keyof typeof WORKBENCH_COPY;
type ToastTone = "info" | "success" | "error" | "warning";
type NovelWorkbenchPanel = "readiness" | "latest" | "snapshot" | "history" | "diagnostics";

interface ArtifactShareCopy {
  shareArtifact: string;
  shareToWechat: string;
  shareToX: string;
  shareLink: string;
  copyShareLink: string;
  shareLinkCopied: string;
  wechatShareHint: string;
  shareSheetError: string;
  twitterShareText: (artifactLabel: string, title: string) => string;
}

function useWorkbenchLocale(): WorkbenchLocale {
  const { i18n } = useTranslation();
  return (i18n.resolvedLanguage ?? i18n.language ?? "").startsWith("zh") ? "zh" : "en";
}

function useWorkbenchCopy() {
  return WORKBENCH_COPY[useWorkbenchLocale()];
}

function useWorkbenchShareCopy(locale: WorkbenchLocale): ArtifactShareCopy {
  return WORKBENCH_SHARE_COPY[locale];
}

function createEmptyNovelAssistantBrief(): NovelAssistantBrief {
  return {
    seed: "",
    style: "",
    world: "",
    characters: "",
    plot: "",
    outline: "",
  };
}

function createEmptyNovelAssistantConfirmed(): Record<NovelAssistantStage, boolean> {
  return {
    seed: false,
    style: false,
    world: false,
    characters: false,
    plot: false,
    outline: false,
  };
}

type NovelAssistantMessageRole = "assistant" | "user";

interface NovelAssistantLocalMessage {
  id: string;
  role: NovelAssistantMessageRole;
  content: string;
  stage?: NovelAssistantStage;
  readyToConfirm?: boolean;
  createdAt: string;
}

interface NovelAssistantLocalState {
  brief: NovelAssistantBrief;
  confirmed: Record<NovelAssistantStage, boolean>;
  activeStage: NovelAssistantStage;
  messages: NovelAssistantLocalMessage[];
}

function createNovelAssistantMessageId(): string {
  return `novel-assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createNovelAssistantMessage(
  role: NovelAssistantMessageRole,
  content: string,
  stage?: NovelAssistantStage,
  readyToConfirm = false,
): NovelAssistantLocalMessage {
  return {
    id: createNovelAssistantMessageId(),
    role,
    content,
    stage,
    readyToConfirm,
    createdAt: new Date().toISOString(),
  };
}

function createInitialNovelAssistantMessages(locale: WorkbenchLocale): NovelAssistantLocalMessage[] {
  return [
    createNovelAssistantMessage("assistant", NOVEL_ASSISTANT_COPY[locale].introMessage, "seed"),
  ];
}

function createEmptyNovelAssistantState(locale: WorkbenchLocale): NovelAssistantLocalState {
  return {
    brief: createEmptyNovelAssistantBrief(),
    confirmed: createEmptyNovelAssistantConfirmed(),
    activeStage: "seed",
    messages: createInitialNovelAssistantMessages(locale),
  };
}

function loadNovelAssistantState(locale: WorkbenchLocale): NovelAssistantLocalState {
  const fallback = {
    brief: createEmptyNovelAssistantBrief(),
    confirmed: createEmptyNovelAssistantConfirmed(),
    activeStage: "seed" as NovelAssistantStage,
    messages: createInitialNovelAssistantMessages(locale),
  };
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(NOVEL_ASSISTANT_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as {
      brief?: Partial<NovelAssistantBrief>;
      confirmed?: Partial<Record<NovelAssistantStage, boolean>>;
      activeStage?: NovelAssistantStage;
      messages?: Partial<NovelAssistantLocalMessage>[];
    };
    const brief = createEmptyNovelAssistantBrief();
    const confirmed = createEmptyNovelAssistantConfirmed();
    for (const stage of NOVEL_ASSISTANT_STAGES) {
      brief[stage] = typeof parsed.brief?.[stage] === "string" ? parsed.brief[stage] || "" : "";
      confirmed[stage] = Boolean(parsed.confirmed?.[stage]);
    }
    const activeStage = parsed.activeStage && NOVEL_ASSISTANT_STAGES.includes(parsed.activeStage)
      ? parsed.activeStage
      : "seed";
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages
          .filter((message): message is NovelAssistantLocalMessage =>
            Boolean(message)
            && (message.role === "assistant" || message.role === "user")
            && typeof message.content === "string"
            && typeof message.id === "string",
          )
          .slice(-60)
      : [];
    return {
      brief,
      confirmed,
      activeStage,
      messages: messages.length > 0 ? messages : fallback.messages,
    };
  } catch {
    return fallback;
  }
}

function saveNovelAssistantState(state: NovelAssistantLocalState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    NOVEL_ASSISTANT_STORAGE_KEY,
    JSON.stringify({
      brief: state.brief,
      confirmed: state.confirmed,
      activeStage: state.activeStage,
      messages: state.messages.slice(-60),
    }),
  );
}

function normalizeNovelAssistantSectionForSeed(value: string): string {
  let text = value.trim();
  const decisionsMatch = text.match(/^##\s+Decisions To Confirm\b/im);
  if (decisionsMatch?.index !== undefined) {
    text = text.slice(0, decisionsMatch.index).trim();
  }
  return text.replace(/^##\s+Draft\s*/i, "").trim();
}

function composeSeedFromNovelAssistantBrief(
  brief: NovelAssistantBrief,
  confirmed: Record<NovelAssistantStage, boolean>,
  locale: WorkbenchLocale,
  title: string,
  writingLanguage: string,
): string {
  const copy = NOVEL_ASSISTANT_COPY[locale];
  const lines = [
    `# ${title.trim() || (locale === "zh" ? "小说创作简报" : "Novel Creative Brief")}`,
    "",
    locale === "zh"
      ? `写作语言：${writingLanguage}`
      : `Writing language: ${writingLanguage}`,
  ];
  for (const stage of NOVEL_ASSISTANT_STAGES) {
    if (!confirmed[stage]) continue;
    const value = normalizeNovelAssistantSectionForSeed(brief[stage]);
    if (!value) continue;
    lines.push("", `## ${copy.stageDetails[stage].label}`, value);
  }
  return lines.join("\n").trim() + "\n";
}

function canUseNativeWeChatShare(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function XBrandIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.9 2H22l-6.76 7.72L23 22h-6.08l-4.76-6.9L6.12 22H3l7.23-8.27L1 2h6.23l4.3 6.24L18.9 2Zm-1.06 18h1.69L6.3 3.9H4.5l13.34 16.1Z" />
    </svg>
  );
}

interface NovelWritingAssistantPanelProps {
  locale: WorkbenchLocale;
  title: string;
  writingLanguage: string;
  onApplySeed: (seed: string) => void;
  pushToast: (text: string, tone?: ToastTone) => void;
}

function NovelWritingAssistantPanel({
  locale,
  title,
  writingLanguage,
  onApplySeed,
  pushToast,
}: NovelWritingAssistantPanelProps) {
  const assistantCopy = NOVEL_ASSISTANT_COPY[locale];
  const [assistantState, setAssistantState] = useState(() => loadNovelAssistantState(locale));
  const [localInput, setLocalInput] = useState("");
  const [sending, setSending] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveNovelAssistantState(assistantState);
  }, [assistantState]);

  useEffect(() => {
    const node = transcriptRef.current;
    if (!node) return;
    if (typeof node.scrollTo === "function") {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    } else {
      node.scrollTop = node.scrollHeight;
    }
  }, [assistantState.messages, sending]);

  const activeStage = assistantState.activeStage;
  const activeStageCopy = assistantCopy.stageDetails[activeStage];
  const confirmedCount = NOVEL_ASSISTANT_STAGES.filter((stage) => assistantState.confirmed[stage]).length;

  const updateStageDraft = useCallback((stage: NovelAssistantStage, value: string) => {
    setAssistantState((previous) => ({
      ...previous,
      brief: {
        ...previous.brief,
        [stage]: value,
      },
      confirmed: {
        ...previous.confirmed,
        [stage]: false,
      },
    }));
  }, []);

  const appendAssistantMessage = useCallback(
    (content: string, stage: NovelAssistantStage, readyToConfirm = false) => {
      setAssistantState((previous) => ({
        ...previous,
        messages: [
          ...previous.messages,
          createNovelAssistantMessage("assistant", content, stage, readyToConfirm),
        ].slice(-60),
      }));
    },
    [],
  );

  const sendAssistantMessage = useCallback(async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    const snapshot = assistantState;
    const userMessage = createNovelAssistantMessage("user", trimmed, snapshot.activeStage);
    const nextMessages = [...snapshot.messages, userMessage].slice(-60);
    setAssistantState((previous) => ({ ...previous, messages: nextMessages }));
    setLocalInput("");
    setSending(true);

    try {
      const response = await API.chatNovelWorkbenchAssistant({
        stage: snapshot.activeStage,
        title,
        writing_language: writingLanguage,
        message: trimmed,
        brief: snapshot.brief,
        confirmed: snapshot.confirmed,
        messages: nextMessages.map((item) => ({
          role: item.role,
          content: item.content,
        })),
      });
      const assistantMessage = createNovelAssistantMessage(
        "assistant",
        response.reply,
        response.stage,
        response.ready_to_confirm,
      );
      setAssistantState((previous) => ({
        ...previous,
        activeStage: response.stage,
        brief: response.draft
          ? {
              ...previous.brief,
              [response.stage]: response.draft,
            }
          : previous.brief,
        confirmed: response.draft
          ? {
              ...previous.confirmed,
              [response.stage]: false,
            }
          : previous.confirmed,
        messages: [...previous.messages, assistantMessage].slice(-60),
      }));
      pushToast(assistantCopy.generatedToast, "success");
    } catch (error) {
      pushToast((error as Error).message, "error");
      appendAssistantMessage(assistantCopy.errorMessage, snapshot.activeStage);
    } finally {
      setSending(false);
    }
  }, [
    appendAssistantMessage,
    assistantCopy.generatedToast,
    assistantCopy.errorMessage,
    assistantState,
    pushToast,
    sending,
    title,
    writingLanguage,
  ]);

  const handleDraftCurrentStage = useCallback(() => {
    void sendAssistantMessage(assistantCopy.draftInstruction(activeStageCopy.label));
  }, [activeStageCopy.label, assistantCopy, sendAssistantMessage]);

  const handleConfirm = useCallback(() => {
    const currentIndex = NOVEL_ASSISTANT_STAGES.indexOf(activeStage);
    const nextStage = NOVEL_ASSISTANT_STAGES
      .slice(currentIndex + 1)
      .find((stage) => !assistantState.confirmed[stage]);
    const confirmedText = assistantCopy.confirmedMessage(
      activeStageCopy.label,
      nextStage ? assistantCopy.stageDetails[nextStage].label : undefined,
    );
    setAssistantState((previous) => ({
      ...previous,
      brief: previous.brief,
      confirmed: {
        ...previous.confirmed,
        [activeStage]: true,
      },
      activeStage: nextStage ?? activeStage,
      messages: [
        ...previous.messages,
        createNovelAssistantMessage("assistant", confirmedText, nextStage ?? activeStage),
      ].slice(-60),
    }));
    onApplySeed(
      composeSeedFromNovelAssistantBrief(
        assistantState.brief,
        {
          ...assistantState.confirmed,
          [activeStage]: true,
        },
        locale,
        title,
        writingLanguage,
      ),
    );
    pushToast(assistantCopy.applyToast, "success");
  }, [
    activeStage,
    activeStageCopy.label,
    assistantCopy,
    assistantState.confirmed,
    assistantState.brief,
    locale,
    onApplySeed,
    pushToast,
    title,
    writingLanguage,
  ]);

  const handleClear = useCallback(() => {
    setAssistantState(createEmptyNovelAssistantState(locale));
    setLocalInput("");
    pushToast(assistantCopy.clearToast, "warning");
  }, [assistantCopy.clearToast, locale, pushToast]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendAssistantMessage(localInput);
    }
  }, [localInput, sendAssistantMessage]);

  return (
    <aside className="novel-assistant-panel flex max-h-[calc(100vh-3rem)] min-h-[40rem] flex-col overflow-hidden rounded-[2rem] border border-[rgba(117,132,159,0.18)] bg-white/92 shadow-[0_24px_70px_rgba(23,38,69,0.12)] xl:sticky xl:top-6">
      <div className="border-b border-[rgba(117,132,159,0.14)] bg-[rgba(248,250,253,0.92)] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--sf-text)]">
              <Bot className="h-4 w-4 text-[var(--sf-blue)]" />
              {assistantCopy.eyebrow}
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--sf-text-muted)]">{assistantCopy.body}</p>
          </div>
          <div className="shrink-0 rounded-full border border-[rgba(117,132,159,0.18)] bg-white px-3 py-1 text-xs font-medium text-[var(--sf-text)]">
            {assistantCopy.progress(confirmedCount, NOVEL_ASSISTANT_STAGES.length)}
          </div>
        </div>
      </div>

      <div ref={transcriptRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {assistantState.messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <article
              key={message.id}
              className={`rounded-2xl border px-3 py-2.5 ${
                isUser
                  ? "ml-8 border-sky-300/40 bg-sky-100/80"
                  : "mr-4 border-[rgba(117,132,159,0.18)] bg-white"
              }`}
            >
              <div className="mb-1 flex items-center gap-2 text-[11px] font-medium text-[var(--sf-text-soft)]">
                {isUser ? assistantCopy.userName : assistantCopy.assistantName}
                {message.stage && (
                  <span className="rounded-full bg-[rgba(117,132,159,0.1)] px-2 py-0.5">
                    {assistantCopy.stageDetails[message.stage].label}
                  </span>
                )}
              </div>
              <div className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--sf-text)]">
                {message.content}
              </div>
            </article>
          );
        })}
        {assistantState.brief[activeStage].trim() && (
          <article className="mr-4 rounded-2xl border border-emerald-300/50 bg-emerald-50/90 px-3 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 text-[11px] font-medium text-emerald-900">
                <span>{assistantCopy.currentDraft}</span>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[var(--sf-text-muted)]">
                  {activeStageCopy.label}
                </span>
                {assistantState.messages[assistantState.messages.length - 1]?.readyToConfirm && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
                    {assistantCopy.readyToConfirm}
                  </span>
                )}
              </div>
              <button
                type="button"
                aria-label="novel-assistant-confirm-stage"
                onClick={handleConfirm}
                disabled={!assistantState.brief[activeStage].trim()}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/70 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {assistantCopy.confirmAndContinue}
              </button>
            </div>
            <textarea
              aria-label="novel-assistant-draft"
              value={assistantState.brief[activeStage]}
              onChange={(event) => updateStageDraft(activeStage, event.target.value)}
              rows={8}
              className="frametale-input max-h-72 min-h-40 w-full resize-y rounded-2xl px-4 py-3 text-sm leading-6 outline-none transition"
            />
            <p className="mt-2 text-xs leading-5 text-emerald-900/70">{assistantCopy.draftHint}</p>
          </article>
        )}
        {sending && (
          <div className="mr-4 inline-flex items-center gap-2 rounded-2xl border border-[rgba(117,132,159,0.18)] bg-white px-3 py-2 text-sm text-[var(--sf-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--sf-blue)]" />
            {assistantCopy.drafting}
          </div>
        )}
      </div>

      <div className="border-t border-[rgba(117,132,159,0.14)] bg-[rgba(248,250,253,0.86)] px-4 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="novel-assistant-draft-current"
            onClick={handleDraftCurrentStage}
            disabled={sending}
            className="frametale-primary-button inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {sending ? assistantCopy.drafting : assistantCopy.draftAction}
          </button>
          <div className="min-w-0 flex-1 truncate text-xs text-[var(--sf-text-muted)]">
            {activeStageCopy.label} · {activeStageCopy.guide}
          </div>
        </div>

        <div className="flex items-end gap-2">
          <textarea
            value={localInput}
            onChange={(event) => setLocalInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder={assistantCopy.inputPlaceholder}
            className="frametale-input min-h-12 flex-1 resize-none rounded-2xl px-4 py-3 text-sm leading-5 outline-none transition"
          />
          <button
            type="button"
            aria-label="novel-assistant-send"
            onClick={() => void sendAssistantMessage(localInput)}
            disabled={sending || !localInput.trim()}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--sf-blue)] text-white shadow-[0_10px_24px_rgba(24,151,214,0.24)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            title={assistantCopy.send}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleClear}
          className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--sf-text-soft)] transition-colors hover:text-rose-700"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {assistantCopy.reset}
        </button>
      </div>
    </aside>
  );
}

interface ArtifactShareActionsProps {
  artifact: NovelWorkbenchArtifact;
  buildShareUrl: (jobId: string, artifactPath: string) => string;
  downloadLabel: string;
  downloading: boolean;
  job: NovelWorkbenchJob;
  onDownload: () => void;
  pushToast: (text: string, tone?: ToastTone) => void;
  shareCopy: ArtifactShareCopy;
}

export function ArtifactShareActions({
  artifact,
  buildShareUrl,
  downloadLabel,
  downloading,
  job,
  onDownload,
  pushToast,
  shareCopy,
}: ArtifactShareActionsProps) {
  const wechatButtonRef = useRef<HTMLButtonElement | null>(null);
  const [wechatPopoverOpen, setWechatPopoverOpen] = useState(false);

  const shareUrl = buildShareUrl(job.job_id, artifact.path);
  const shareText = shareCopy.twitterShareText(artifact.label, job.title);

  const handleShareToWechat = async () => {
    if (canUseNativeWeChatShare()) {
      try {
        await navigator.share({
          title: artifact.label,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        pushToast(shareCopy.shareSheetError, "error");
        setWechatPopoverOpen(true);
      }
    }

    setWechatPopoverOpen((open) => !open);
  };

  const handleCopyLink = async () => {
    try {
      await copyText(shareUrl);
      pushToast(shareCopy.shareLinkCopied, "success");
      setWechatPopoverOpen(false);
    } catch (error) {
      pushToast((error as Error).message, "error");
    }
  };

  const handleShareToX = () => {
    const params = new URLSearchParams({
      text: shareText,
      url: shareUrl,
    });
    window.open(`https://twitter.com/intent/tweet?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button
          ref={wechatButtonRef}
          type="button"
          onClick={() => void handleShareToWechat()}
          aria-label="share-wechat"
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/18 bg-emerald-500/8 px-2 py-1 text-xs text-emerald-700 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/12"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {shareCopy.shareToWechat}
        </button>
        <button
          type="button"
          onClick={handleShareToX}
          aria-label="share-x"
          className="inline-flex items-center gap-1 rounded-lg border border-[rgba(117,132,159,0.18)] bg-white px-2 py-1 text-xs text-[var(--sf-text)] transition-colors hover:border-[rgba(24,151,214,0.24)] hover:bg-[rgba(248,250,253,0.98)]"
        >
          <XBrandIcon />
          {shareCopy.shareToX}
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="inline-flex items-center gap-1 rounded-lg border border-[rgba(117,132,159,0.18)] bg-white px-2 py-1 text-xs text-[var(--sf-text)] transition-colors hover:border-[rgba(24,151,214,0.24)] hover:bg-[rgba(248,250,253,0.98)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {downloadLabel}
        </button>
      </div>

      <Popover
        open={wechatPopoverOpen}
        onClose={() => setWechatPopoverOpen(false)}
        anchorRef={wechatButtonRef}
        width="w-80"
        backgroundColor="rgba(255,255,255,0.98)"
        className="rounded-[1.4rem] border border-[rgba(117,132,159,0.18)] p-4 shadow-[0_24px_50px_rgba(23,38,69,0.14)]"
      >
        <div className="space-y-3 text-[var(--sf-text)]">
          <div>
            <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/18 bg-emerald-500/8 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-700">
              <Share2 className="h-3.5 w-3.5" />
              {shareCopy.shareArtifact}
            </div>
            <div className="mt-3 text-sm font-semibold text-[var(--sf-text)]">{artifact.label}</div>
            <div className="mt-2 text-xs leading-6 text-[var(--sf-text-muted)]">{shareCopy.wechatShareHint}</div>
          </div>

          <div className="rounded-[1rem] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--sf-text-soft)]">{shareCopy.shareLink}</div>
            <div className="mt-2 break-all font-mono text-[11px] leading-5 text-[var(--sf-text-soft)]">{shareUrl}</div>
          </div>

          <button
            type="button"
            onClick={() => void handleCopyLink()}
            aria-label="copy-share-link"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(117,132,159,0.18)] bg-white px-3 py-2 text-sm font-medium text-[var(--sf-text)] transition-colors hover:border-[rgba(24,151,214,0.24)] hover:bg-[rgba(248,250,253,0.98)]"
          >
            <Copy className="h-4 w-4" />
            {shareCopy.copyShareLink}
          </button>
        </div>
      </Popover>
    </>
  );
}

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

function JobStatusBadge({
  status,
  locale,
}: {
  status: NovelWorkbenchJob["status"];
  locale: WorkbenchLocale;
}) {
  const className =
    status === "succeeded"
      ? "bg-emerald-500/12 text-emerald-700"
      : status === "failed"
        ? "bg-rose-500/12 text-rose-700"
        : status === "cancelled"
          ? "bg-slate-200 text-slate-700"
          : "bg-amber-500/12 text-amber-700";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {WORKBENCH_COPY[locale].statusLabels[status]}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[rgba(117,132,159,0.18)] bg-white/82 p-4 shadow-[0_18px_40px_rgba(23,38,69,0.06)]">
      <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--sf-text-soft)]">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--sf-text)]">{value}</div>
      <div className="mt-1 text-sm text-[var(--sf-text-muted)]">{detail}</div>
    </div>
  );
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

function isHistoryJob(status: NovelWorkbenchJob["status"]): boolean {
  return !isActiveJob(status);
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export function NovelWorkbenchPage() {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const pushToast = useAppStore((state) => state.pushToast);
  const user = useAuthStore((state) => state.user);
  const locale = useWorkbenchLocale();
  const copy = useWorkbenchCopy();
  const shareCopy = useWorkbenchShareCopy(locale);
  const isAdmin = user?.role === "admin";
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const requestedJobId = searchParams.get("job");
  const requestedArtifactPath = searchParams.get("artifact");

  const [status, setStatus] = useState<NovelWorkbenchStatus | null>(null);
  const [jobs, setJobs] = useState<NovelWorkbenchJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(() => searchParams.get("job"));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [activeStatusPanel, setActiveStatusPanel] = useState<NovelWorkbenchPanel | null>(() =>
    searchParams.has("job") || searchParams.has("artifact") ? "history" : null,
  );

  const [title, setTitle] = useState("");
  const [projectName, setProjectName] = useState("");
  const [writingLanguage, setWritingLanguage] = useState("简体中文");
  const [seedText, setSeedText] = useState("");
  const [artifacts, setArtifacts] = useState<NovelWorkbenchArtifactListResponse | null>(null);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [selectedArtifactPath, setSelectedArtifactPath] = useState<string | null>(() => searchParams.get("artifact"));
  const [artifactPreview, setArtifactPreview] = useState<NovelWorkbenchArtifactContentResponse | null>(null);
  const [artifactPreviewLoading, setArtifactPreviewLoading] = useState(false);
  const [fullLog, setFullLog] = useState<NovelWorkbenchLogResponse | null>(null);
  const [fullLogLoading, setFullLogLoading] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

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
      if (!requestedJobId) {
        setSelectedJobId(null);
      }
      return;
    }
    if (requestedJobId && jobs.some((job) => job.job_id === requestedJobId)) {
      if (selectedJobId !== requestedJobId) {
        setSelectedJobId(requestedJobId);
      }
      return;
    }
    if (!selectedJobId || !jobs.some((job) => job.job_id === selectedJobId)) {
      setSelectedJobId(jobs[0].job_id);
    }
  }, [jobs, requestedJobId, selectedJobId]);

  const selectedJobRecord = useMemo(
    () => jobs.find((job) => job.job_id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );
  const selectedJob = activeStatusPanel === "history" && selectedJobRecord && !isHistoryJob(selectedJobRecord.status)
    ? null
    : selectedJobRecord;
  const activeSelectedJob = selectedJobRecord && isActiveJob(selectedJobRecord.status) ? selectedJobRecord : null;
  const selectedArtifact = useMemo(
    () => artifacts?.artifacts.find((artifact) => artifact.path === selectedArtifactPath) ?? null,
    [artifacts, selectedArtifactPath],
  );

  const missingRequiredEnv = status?.env_status?.missing_required ?? [];
  const missingOptionalEnv = status?.env_status?.missing_optional ?? [];
  const canSubmit = Boolean(status?.requirements.all_ready && title.trim() && seedText.trim() && !submitting);
  const latestSuccessfulJob = useMemo(
    () => jobs.find((job) => job.status === "succeeded") ?? null,
    [jobs],
  );
  const artifactGroups = useMemo(() => {
    if (!artifacts) return [];
    const grouped = new Map<string, NovelWorkbenchArtifact[]>();
    for (const artifact of artifacts.artifacts) {
      const bucket = grouped.get(artifact.group) ?? [];
      bucket.push(artifact);
      grouped.set(artifact.group, bucket);
    }
    return Array.from(grouped.entries());
  }, [artifacts]);
  const activeJobs = jobs.filter((job) => isActiveJob(job.status)).length;
  const successfulJobs = jobs.filter((job) => job.status === "succeeded").length;
  const historyJobs = jobs.filter((job) => isHistoryJob(job.status));
  const artifactCount = artifacts?.summary.available_count ?? 0;
  const statusNavItems: { id: NovelWorkbenchPanel; label: string; value: string; ok?: boolean }[] = [
    {
      id: "readiness",
      label: copy.navReadiness,
      value: status?.requirements.all_ready ? copy.readyTitle : copy.blockedTitle,
      ok: Boolean(status?.requirements.all_ready),
    },
    {
      id: "latest",
      label: copy.navLatest,
      value: latestSuccessfulJob?.title ?? copy.latestEmpty,
    },
    {
      id: "snapshot",
      label: copy.navSnapshot,
      value: `${jobs.length} / ${activeJobs} / ${successfulJobs}`,
    },
    {
      id: "history",
      label: copy.navHistory,
      value: `${historyJobs.length}`,
    },
    {
      id: "diagnostics",
      label: copy.navDiagnostics,
      value: status?.autonovel_env_mode ?? "-",
    },
  ];

  const handleLoadFullLog = useCallback(
    async (job: NovelWorkbenchJob) => {
      setFullLogLoading(true);
      try {
        const payload = await API.getNovelWorkbenchLog(job.job_id);
        setFullLog(payload);
      } catch (error) {
        pushToast((error as Error).message, "error");
      } finally {
        setFullLogLoading(false);
      }
    },
    [pushToast],
  );

  useEffect(() => {
    if (!selectedJobId) {
      setArtifacts(null);
      setArtifactsLoading(false);
      setSelectedArtifactPath(null);
      setArtifactPreview(null);
      setFullLog(null);
      return;
    }
    let cancelled = false;
    setArtifactsLoading(true);
    void API.listNovelWorkbenchArtifacts(selectedJobId)
      .then((listing) => {
        if (!cancelled) {
          setArtifacts(listing);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setArtifacts(null);
          pushToast((error as Error).message, "error");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setArtifactsLoading(false);
        }
      });
    setArtifactPreview(null);
    setFullLog(null);
    return () => {
      cancelled = true;
    };
  }, [pushToast, selectedJobId]);

  useEffect(() => {
    if (!artifacts) {
      return;
    }

    const previewablePath = artifacts?.artifacts.find((artifact) => artifact.previewable)?.path ?? null;
    if (!previewablePath) {
      if (selectedArtifactPath !== null) {
        setSelectedArtifactPath(null);
      }
      return;
    }
    const requestedPath =
      requestedArtifactPath && artifacts?.artifacts.some((artifact) => artifact.path === requestedArtifactPath)
        ? requestedArtifactPath
        : null;
    const nextPath = requestedPath ?? previewablePath;
    if (requestedPath && selectedArtifactPath !== requestedPath) {
      setSelectedArtifactPath(requestedPath);
      return;
    }
    if (!selectedArtifactPath || !artifacts?.artifacts.some((artifact) => artifact.path === selectedArtifactPath)) {
      setSelectedArtifactPath(nextPath);
    }
  }, [artifacts, requestedArtifactPath, selectedArtifactPath]);

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (selectedJobId) {
      params.set("job", selectedJobId);
    } else {
      params.delete("job");
    }
    if (selectedArtifactPath) {
      params.set("artifact", selectedArtifactPath);
    } else {
      params.delete("artifact");
    }

    const nextSearch = params.toString();
    const nextTarget = nextSearch ? `${location}?${nextSearch}` : location;
    const currentSearch = new URLSearchParams(search).toString();
    const currentTarget = currentSearch ? `${location}?${currentSearch}` : location;
    if (nextTarget !== currentTarget) {
      navigate(nextTarget, { replace: true });
    }
  }, [location, navigate, search, selectedArtifactPath, selectedJobId]);

  useEffect(() => {
    if (!selectedJobId || !selectedArtifactPath) {
      setArtifactPreview(null);
      setArtifactPreviewLoading(false);
      return;
    }

    const artifact = artifacts?.artifacts.find((item) => item.path === selectedArtifactPath);
    if (!artifact?.previewable) {
      setArtifactPreview(null);
      setArtifactPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setArtifactPreviewLoading(true);
    void API.getNovelWorkbenchArtifactContent(selectedJobId, selectedArtifactPath)
      .then((payload) => {
        if (!cancelled) {
          setArtifactPreview(payload);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setArtifactPreview(null);
          pushToast((error as Error).message, "error");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setArtifactPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [artifacts, pushToast, selectedArtifactPath, selectedJobId]);

  const handleCreateJob = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const response = await API.createNovelWorkbenchJob({
        title: title.trim(),
        seed_text: seedText.trim(),
        project_name: projectName.trim() || undefined,
        writing_language: writingLanguage,
      });
      pushToast(copy.createdToast, "success");
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
      pushToast(copy.cancelledToast, "warning");
      await fetchAll(false);
    } catch (error) {
      pushToast((error as Error).message, "error");
    } finally {
      setCancellingJobId(null);
    }
  };

  const handleDeleteJob = async (job: NovelWorkbenchJob) => {
    if (isActiveJob(job.status)) {
      pushToast(copy.deleteActiveWarning, "warning");
      return;
    }

    if (!window.confirm(copy.confirmDelete(job.title))) {
      return;
    }

    setDeletingJobId(job.job_id);
    try {
      await API.deleteNovelWorkbenchJob(job.job_id);
      pushToast(copy.deletedToast, "success");
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

  const handleDownloadArtifact = async (job: NovelWorkbenchJob, artifact: NovelWorkbenchArtifact) => {
    const key = `artifact:${artifact.path}`;
    setDownloadingKey(key);
    try {
      const blob = await API.downloadNovelWorkbenchArtifact(job.job_id, artifact.path);
      downloadBlob(blob, artifact.path.split("/").pop() || artifact.path);
    } catch (error) {
      pushToast((error as Error).message, "error");
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDownloadLog = async (job: NovelWorkbenchJob) => {
    setDownloadingKey("log");
    try {
      const blob = await API.downloadNovelWorkbenchLog(job.job_id);
      downloadBlob(blob, `${job.job_id}.log`);
    } catch (error) {
      pushToast((error as Error).message, "error");
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDownloadWorkspace = async (job: NovelWorkbenchJob) => {
    setDownloadingKey("workspace");
    try {
      const blob = await API.downloadNovelWorkbenchWorkspace(job.job_id);
      downloadBlob(blob, `${job.job_id}-workspace.zip`);
    } catch (error) {
      pushToast((error as Error).message, "error");
    } finally {
      setDownloadingKey(null);
    }
  };

  const buildArtifactShareUrl = useCallback(
    (jobId: string, artifactPath: string) => {
      const params = new URLSearchParams();
      params.set("job", jobId);
      params.set("artifact", artifactPath);
      const target = `/share/novel?${params.toString()}`;
      if (typeof window === "undefined") {
        return target;
      }
      return new URL(target, window.location.origin).toString();
    },
    [],
  );

  return (
    <div className="novel-workbench-page sf-editorial-page flex min-h-screen flex-col text-[var(--sf-text)]">
      <header className="novel-workbench-header px-6 pt-6">
        <div className="frametale-page-header mx-auto flex max-w-7xl flex-col gap-4 rounded-[2rem] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/app/projects")}
              className="frametale-secondary-button inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition hover:-translate-y-0.5"
            >
              <ChevronLeft className="h-4 w-4" />
              {copy.back}
            </button>
            <div className="h-8 w-px bg-[rgba(117,132,159,0.18)]" />
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/60 bg-sky-100 px-3 py-1 text-xs font-medium text-sky-900">
                <BookOpen className="h-3.5 w-3.5" />
                {copy.eyebrow}
              </div>
              <h1 className="mt-3 text-[1.85rem] font-semibold tracking-[-0.03em] text-[var(--sf-text)]">{copy.title}</h1>
              <p className="mt-1 max-w-3xl text-sm leading-7 text-[var(--sf-text-muted)]">{copy.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate("/app/admin")}
                className="frametale-secondary-button inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                title={locale === "zh" ? "全局配置" : "Global Config"}
                aria-label={locale === "zh" ? "全局配置" : "Global Config"}
              >
                <ServerCog className="h-4 w-4" />
                {locale === "zh" ? "全局配置" : "Global Config"}
              </button>
            )}

            <button
              type="button"
              onClick={() => void fetchAll(true)}
              className="frametale-secondary-button inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {copy.refresh}
            </button>
          </div>
        </div>
      </header>

      <main className="novel-workbench-main mx-auto max-w-7xl px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-[var(--sf-text-muted)]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-[var(--sf-blue)]" />
            {copy.loading}
          </div>
        ) : (
          <div className="space-y-5">
            <nav className="novel-status-strip rounded-[1.5rem] border border-[rgba(117,132,159,0.18)] bg-white/86 p-2 shadow-[0_18px_40px_rgba(23,38,69,0.06)]">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStatusPanel(null)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    activeStatusPanel === null
                      ? "bg-sky-100 text-sky-950"
                      : "text-[var(--sf-text-muted)] hover:bg-[rgba(248,250,253,0.96)] hover:text-[var(--sf-text)]"
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  {copy.navPrimary}
                </button>
                {statusNavItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveStatusPanel((current) => (current === item.id ? null : item.id))}
                    className={`inline-flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition ${
                      activeStatusPanel === item.id
                        ? "border-sky-300/60 bg-sky-100 text-sky-950"
                        : "border-transparent text-[var(--sf-text-muted)] hover:border-[rgba(117,132,159,0.18)] hover:bg-[rgba(248,250,253,0.96)] hover:text-[var(--sf-text)]"
                    }`}
                  >
                    {item.ok !== undefined && (
                      <span className={`h-2 w-2 rounded-full ${item.ok ? "bg-emerald-500" : "bg-amber-500"}`} />
                    )}
                    <span>{item.label}</span>
                    <span className="max-w-36 truncate rounded-full bg-white/70 px-2 py-0.5 text-xs text-[var(--sf-text-soft)]">
                      {item.value}
                    </span>
                  </button>
                ))}
              </div>
            </nav>

            {activeStatusPanel && activeStatusPanel !== "history" && (
              <section className="novel-status-panel rounded-[1.5rem] border border-[rgba(117,132,159,0.18)] bg-white/88 p-5 shadow-[0_18px_40px_rgba(23,38,69,0.06)]">
                {activeStatusPanel === "readiness" && (
                  <div className="flex items-start gap-3">
                    {status?.requirements.all_ready ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                    )}
                    <div>
                      <h3 className="text-base font-semibold text-[var(--sf-text)]">
                        {status?.requirements.all_ready ? copy.readyTitle : copy.blockedTitle}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--sf-text-muted)]">
                        {status?.requirements.all_ready
                          ? copy.readyBody
                          : missingRequiredEnv.length > 0
                            ? `${copy.blockedBody} ${missingRequiredEnv.join(" · ")}`
                            : copy.blockedBody}
                      </p>
                      {missingOptionalEnv.length > 0 && (
                        <p className="mt-2 text-sm leading-6 text-amber-700">
                          {copy.optionalBody} {missingOptionalEnv.join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {activeStatusPanel === "latest" && (
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-[var(--sf-text-soft)]">{copy.latestEyebrow}</div>
                    {latestSuccessfulJob ? (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-[var(--sf-text)]">{latestSuccessfulJob.title}</h3>
                          <p className="mt-1 text-sm leading-6 text-[var(--sf-text-muted)]">
                            {copy.latestSummary(formatTimestamp(latestSuccessfulJob.finished_at))}
                          </p>
                        </div>
                        {latestSuccessfulJob.imported_project_name && (
                          <button
                            type="button"
                            onClick={() => navigate(`/app/projects/${latestSuccessfulJob.imported_project_name}`)}
                            className="inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-900 transition hover:-translate-y-0.5"
                          >
                            <ExternalLink className="h-4 w-4" />
                            {copy.latestAction}
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-7 text-[var(--sf-text-muted)]">{copy.latestEmpty}</p>
                    )}
                  </div>
                )}

                {activeStatusPanel === "snapshot" && (
                  <div className="grid gap-3 md:grid-cols-4">
                    <MetricCard label={copy.totalRuns} value={String(jobs.length)} detail={copy.runHistoryTitle} />
                    <MetricCard label={copy.activeRuns} value={String(activeJobs)} detail={copy.statusLabels.running} />
                    <MetricCard label={copy.successfulRuns} value={String(successfulJobs)} detail={copy.statusLabels.succeeded} />
                    <MetricCard label={copy.artifactCount} value={String(artifactCount)} detail={copy.artifactsTitle} />
                  </div>
                )}

                {activeStatusPanel === "diagnostics" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <RequirementChip label={copy.requirementLabels.workspace_root_exists} ok={Boolean(status?.requirements.workspace_root_exists)} />
                      <RequirementChip label={copy.requirementLabels.autonovel_repo_exists} ok={Boolean(status?.requirements.autonovel_repo_exists)} />
                      <RequirementChip label={copy.requirementLabels.importer_exists} ok={Boolean(status?.requirements.importer_exists)} />
                      <RequirementChip label={copy.requirementLabels.autonovel_env_exists} ok={Boolean(status?.requirements.autonovel_env_exists)} />
                      <RequirementChip label={copy.requirementLabels.git_available} ok={Boolean(status?.requirements.git_available)} />
                      <RequirementChip label={copy.requirementLabels.uv_available} ok={Boolean(status?.requirements.uv_available)} />
                    </div>
                    <div className="grid gap-4 text-xs md:grid-cols-4">
                      <div>
                        <div className="uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.workspaceRoot}</div>
                        <div className="mt-2 break-all font-mono text-[var(--sf-text-muted)]">{status?.workspace_root}</div>
                      </div>
                      <div>
                        <div className="uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.autonovelSource}</div>
                        <div className="mt-2 break-all font-mono text-[var(--sf-text-muted)]">{status?.autonovel_source_dir}</div>
                      </div>
                      <div>
                        <div className="uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.importerScript}</div>
                        <div className="mt-2 break-all font-mono text-[var(--sf-text-muted)]">{status?.importer_script}</div>
                      </div>
                      <div>
                        <div className="uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.runtimeEnv}</div>
                        <div className="mt-2 break-all font-mono text-[var(--sf-text-muted)]">{status?.autonovel_env_source}</div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            <div className="novel-production-desk grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="min-w-0 space-y-6">
            <section className="grid gap-6">
              <div className="novel-launch-panel relative overflow-hidden rounded-[2rem] border border-[rgba(117,132,159,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,248,252,0.98))] p-6 shadow-[0_24px_60px_rgba(23,38,69,0.08)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(24,151,214,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(216,165,90,0.14),transparent_32%)]" />
                <div className="relative space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/60 bg-sky-100 px-3 py-1 text-xs font-medium text-sky-900">
                    <Sparkles className="h-3.5 w-3.5" />
                    {copy.navPrimary}
                  </div>

                  <div className="max-w-3xl space-y-3">
                    <h2 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--sf-text)]">
                      {copy.focusedTitle}
                    </h2>
                    <p className="max-w-2xl text-sm leading-6 text-[var(--sf-text-muted)]">{copy.focusedBody}</p>
                  </div>

                  <div className="grid gap-5">
                    <form onSubmit={(event) => void handleCreateJob(event)} className="novel-seed-form space-y-4 rounded-[1.7rem] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-5">
                      <label className="block">
                        <span className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">{copy.formTitle}</span>
                        <input
                          id="novel-title"
                          type="text"
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          placeholder={copy.titlePlaceholder}
                          className="frametale-input w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">{copy.projectName}</span>
                        <input
                          id="project-name"
                          type="text"
                          value={projectName}
                          onChange={(event) => setProjectName(event.target.value)}
                          placeholder={copy.projectNamePlaceholder}
                          className="frametale-input w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">{copy.writingLanguage}</span>
                        <select
                          id="writing-language"
                          value={writingLanguage}
                          onChange={(event) => setWritingLanguage(event.target.value)}
                          className="frametale-input w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition"
                        >
                          <option value="简体中文">{copy.writingLanguageZh}</option>
                          <option value="English">English</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">{copy.seedLabel}</span>
                        <textarea
                          id="seed-text"
                          value={seedText}
                          onChange={(event) => setSeedText(event.target.value)}
                          rows={18}
                          placeholder={copy.seedPlaceholder}
                          className="frametale-input w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition"
                        />
                      </label>

                      <p className="text-xs leading-6 text-[var(--sf-text-soft)]">{copy.seedHint}</p>

                      <button
                        type="submit"
                        disabled={!canSubmit}
                        className="frametale-primary-button inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                        {submitting ? copy.submitting : copy.submit}
                      </button>
                    </form>

                  </div>
                </div>
              </div>
            </section>
            {activeStatusPanel !== "history" && activeSelectedJob && (
              <section
                className="novel-active-run-card rounded-[32px] border border-[rgba(117,132,159,0.18)] bg-white/86 p-5 shadow-[0_18px_40px_rgba(23,38,69,0.06)]"
                data-testid="novel-workbench-selected-job-panel"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--sf-text)]">
                        {activeSelectedJob.title}
                      </h2>
                      <JobStatusBadge status={activeSelectedJob.status} locale={locale} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--sf-text-muted)]">
                      {copy.stage} <span className="text-[var(--sf-text)]">{activeSelectedJob.stage}</span> · {copy.target}{" "}
                      <span className="font-mono text-[var(--sf-text)]">{activeSelectedJob.target_project_name}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCancelJob(activeSelectedJob)}
                    disabled={cancellingJobId === activeSelectedJob.job_id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cancellingJobId === activeSelectedJob.job_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                    {copy.cancel}
                  </button>
                </div>
                <div className="mt-4 rounded-[24px] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.logTail}</div>
                    {activeSelectedJob.status === "running" && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-300">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {copy.liveRefreshing}
                      </span>
                    )}
                  </div>
                  <pre className="max-h-[24rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[rgba(117,132,159,0.18)] bg-[rgba(240,245,250,0.95)] p-3 font-mono text-xs text-[var(--sf-text)]">
                    {activeSelectedJob.log_tail || copy.noLogsYet}
                  </pre>
                </div>
              </section>
            )}
            {activeStatusPanel === "history" && (
            <section className="novel-history-section grid gap-6 xl:grid-cols-[340px,1fr]">
              <div
                className="rounded-[32px] border border-[rgba(117,132,159,0.18)] bg-white/86 p-5 shadow-[0_18px_40px_rgba(23,38,69,0.06)]"
                data-testid="novel-workbench-history-list"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--sf-text-soft)]">{copy.runHistoryEyebrow}</div>
                    <h2 className="mt-2 text-base font-semibold text-[var(--sf-text)]">{copy.runHistoryTitle}</h2>
                  </div>
                  <span className="text-xs text-[var(--sf-text-soft)]">{historyJobs.length}</span>
                </div>

                <div className="space-y-3">
                  {historyJobs.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-[rgba(117,132,159,0.22)] bg-[rgba(248,250,253,0.78)] px-4 py-10 text-center text-sm text-[var(--sf-text-muted)]">
                      {copy.runHistoryEmpty}
                    </div>
                  ) : (
                    historyJobs.map((job) => {
                      const selected = selectedJobId === job.job_id;
                      const jobIsActive = isActiveJob(job.status);
                      const cancelling = cancellingJobId === job.job_id;
                      const deleting = deletingJobId === job.job_id;

                      return (
                        <div
                          key={job.job_id}
                          className={`rounded-[24px] border p-4 transition-colors ${
                            selected
                              ? "border-sky-400/55 bg-sky-100/70"
                              : "border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedJobId((previous) => (previous === job.job_id ? null : job.job_id))}
                            className="block w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate font-medium text-[var(--sf-text)]">{job.title}</div>
                                <div className="mt-1 text-xs text-[var(--sf-text-soft)]">{job.target_project_name}</div>
                              </div>
                              <JobStatusBadge status={job.status} locale={locale} />
                            </div>
                            <div className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--sf-text-muted)]">{job.seed_excerpt}</div>
                            <div className="mt-3 text-[11px] uppercase tracking-wide text-[var(--sf-text-soft)]">{job.stage}</div>
                          </button>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedJobId((previous) => (previous === job.job_id ? null : job.job_id))}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(117,132,159,0.18)] bg-white px-2.5 py-1.5 text-xs text-[var(--sf-text)] transition-colors hover:border-[rgba(24,151,214,0.24)] hover:bg-[rgba(248,250,253,0.98)]"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {selected ? copy.collapse : copy.details}
                            </button>

                            {jobIsActive ? (
                              <button
                                type="button"
                                onClick={() => void handleCancelJob(job)}
                                disabled={cancelling}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                                {copy.cancel}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleDeleteJob(job)}
                                disabled={deleting}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(117,132,159,0.18)] bg-white px-2.5 py-1.5 text-xs text-[var(--sf-text)] transition-colors hover:border-[rgba(24,151,214,0.24)] hover:bg-[rgba(248,250,253,0.98)] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                {copy.delete}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div
                className="rounded-[32px] border border-[rgba(117,132,159,0.18)] bg-white/86 p-5 shadow-[0_18px_40px_rgba(23,38,69,0.06)]"
                data-testid="novel-workbench-history-detail"
              >
                {selectedJob ? (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--sf-text)]">{selectedJob.title}</h2>
                          <JobStatusBadge status={selectedJob.status} locale={locale} />
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--sf-text-muted)]">
                          {copy.stage} <span className="text-[var(--sf-text)]">{selectedJob.stage}</span> · {copy.target}{" "}
                          <span className="font-mono text-[var(--sf-text)]">{selectedJob.target_project_name}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {selectedJob.imported_project_name && (
                          <button
                            type="button"
                            onClick={() => navigate(`/app/projects/${selectedJob.imported_project_name}`)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-100 px-4 py-2 text-sm text-emerald-800 transition-colors hover:bg-emerald-200"
                          >
                            <ExternalLink className="h-4 w-4" />
                            {copy.openProject}
                          </button>
                        )}
                        {isActiveJob(selectedJob.status) ? (
                          <button
                            type="button"
                            onClick={() => void handleCancelJob(selectedJob)}
                            disabled={cancellingJobId === selectedJob.job_id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {cancellingJobId === selectedJob.job_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                            {copy.cancel}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleDeleteJob(selectedJob)}
                            disabled={deletingJobId === selectedJob.job_id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(117,132,159,0.18)] bg-white px-4 py-2 text-sm text-[var(--sf-text)] transition-colors hover:border-[rgba(24,151,214,0.24)] hover:bg-[rgba(248,250,253,0.98)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingJobId === selectedJob.job_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            {copy.deleteRecord}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm text-[var(--sf-text-muted)] md:grid-cols-2 xl:grid-cols-5">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.created}</div>
                        <div className="mt-1 text-[var(--sf-text)]">{formatTimestamp(selectedJob.created_at)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.updated}</div>
                        <div className="mt-1 text-[var(--sf-text)]">{formatTimestamp(selectedJob.updated_at)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.language}</div>
                        <div className="mt-1 text-[var(--sf-text)]">{selectedJob.writing_language}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.started}</div>
                        <div className="mt-1 text-[var(--sf-text)]">{formatTimestamp(selectedJob.started_at)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.finished}</div>
                        <div className="mt-1 text-[var(--sf-text)]">{formatTimestamp(selectedJob.finished_at)}</div>
                      </div>
                    </div>

                    {selectedJob.error_message && (
                      <div className="rounded-[24px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                        {selectedJob.error_message}
                      </div>
                    )}

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-[24px] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4">
                        <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.seedCard}</div>
                        <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--sf-text)]">
                          {selectedJob.seed_text}
                        </pre>
                      </div>

                      <div className="rounded-[24px] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.workspaceCard}</div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void handleLoadFullLog(selectedJob)}
                              disabled={fullLogLoading}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(117,132,159,0.18)] bg-white px-3 py-2 text-xs text-[var(--sf-text)] transition-colors hover:border-[rgba(24,151,214,0.24)] hover:bg-[rgba(248,250,253,0.98)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {fullLogLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                              {copy.viewFullLog}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDownloadLog(selectedJob)}
                              disabled={downloadingKey === "log"}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(117,132,159,0.18)] bg-white px-3 py-2 text-xs text-[var(--sf-text)] transition-colors hover:border-[rgba(24,151,214,0.24)] hover:bg-[rgba(248,250,253,0.98)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {downloadingKey === "log" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                              {copy.downloadLog}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDownloadWorkspace(selectedJob)}
                              disabled={downloadingKey === "workspace"}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300/60 bg-sky-100 px-3 py-2 text-xs text-sky-800 transition-colors hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {downloadingKey === "workspace" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                              {copy.exportWorkspace}
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.workspacePath}</div>
                        <div className="mt-2 break-all font-mono text-xs text-[var(--sf-text-muted)]">{selectedJob.workspace_dir}</div>
                        <div className="mt-4 text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.logFile}</div>
                        <div className="mt-2 break-all font-mono text-xs text-[var(--sf-text-muted)]">{selectedJob.log_path}</div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">
                          {fullLog ? copy.fullLog : copy.logTail}
                        </div>
                        <div className="flex items-center gap-3">
                          {fullLog && (
                            <span className="text-xs text-[var(--sf-text-soft)]">
                              {formatFileSize(fullLog.size_bytes)} · {formatTimestamp(fullLog.modified_at)}
                            </span>
                          )}
                          {selectedJob.status === "running" && !fullLog && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-300">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {copy.liveRefreshing}
                            </span>
                          )}
                        </div>
                      </div>
                      <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[rgba(117,132,159,0.18)] bg-[rgba(240,245,250,0.95)] p-3 font-mono text-xs text-[var(--sf-text)]">
                        {fullLog?.content || selectedJob.log_tail || copy.noLogsYet}
                      </pre>
                      {fullLog?.truncated && (
                        <div className="mt-3 text-xs text-amber-300">{copy.truncatedLog}</div>
                      )}
                    </div>

                    <div className="rounded-[24px] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">{copy.artifactsTitle}</div>
                          <div className="mt-1 text-sm text-[var(--sf-text-muted)]">
                            {artifacts
                              ? copy.artifactsSummary(artifacts.summary.available_count, artifacts.summary.chapter_count)
                              : copy.artifactsLoading}
                          </div>
                        </div>
                        {artifactsLoading && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-300">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {copy.artifactsLoading}
                          </span>
                        )}
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
                        <div className="space-y-4">
                          {artifactGroups.length > 0 ? (
                            artifactGroups.map(([group, groupArtifacts]) => (
                              <div key={group} className="rounded-[24px] border border-[rgba(117,132,159,0.18)] bg-white/82 p-3">
                                <div className="mb-2 text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">
                                  {copy.groupLabels[group as keyof typeof copy.groupLabels] ?? group}
                                </div>
                                <div className="space-y-2">
                                  {groupArtifacts.map((artifact) => (
                                    <div
                                      key={artifact.path}
                                      className={`rounded-xl border px-3 py-2 ${
                                        selectedArtifactPath === artifact.path
                                          ? "border-sky-500/40 bg-sky-500/10"
                                          : "border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)]"
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (artifact.previewable) {
                                              setSelectedArtifactPath(artifact.path);
                                            }
                                          }}
                                          className="min-w-0 text-left"
                                        >
                                          <div className="truncate text-sm font-medium text-[var(--sf-text)]">{artifact.label}</div>
                                          <div className="mt-1 truncate font-mono text-[11px] text-[var(--sf-text-soft)]">
                                            {artifact.path}
                                          </div>
                                          <div className="mt-1 text-[11px] text-[var(--sf-text-muted)]">
                                            {formatFileSize(artifact.size_bytes)} · {formatTimestamp(artifact.modified_at)}
                                          </div>
                                        </button>
                                        <ArtifactShareActions
                                          artifact={artifact}
                                          buildShareUrl={buildArtifactShareUrl}
                                          downloadLabel={copy.downloadArtifact}
                                          downloading={downloadingKey === `artifact:${artifact.path}`}
                                          job={selectedJob}
                                          onDownload={() => void handleDownloadArtifact(selectedJob, artifact)}
                                          pushToast={pushToast}
                                          shareCopy={shareCopy}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-[24px] border border-dashed border-[rgba(117,132,159,0.22)] bg-[rgba(248,250,253,0.78)] px-4 py-10 text-sm text-[var(--sf-text-muted)]">
                              {copy.artifactsEmpty}
                            </div>
                          )}
                        </div>

                        <div className="rounded-[24px] border border-[rgba(117,132,159,0.18)] bg-white/82 p-4">
                          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--sf-text-soft)]">
                            <FileText className="h-3.5 w-3.5" />
                            {copy.previewTitle}
                          </div>
                          {selectedArtifact ? (
                            <div className="space-y-3">
                              <div>
                                <div className="text-sm font-medium text-[var(--sf-text)]">{selectedArtifact.label}</div>
                                <div className="mt-1 break-all font-mono text-[11px] text-[var(--sf-text-soft)]">
                                  {selectedArtifact.path}
                                </div>
                              </div>
                              {artifactPreviewLoading ? (
                                <div className="flex items-center gap-2 rounded-xl border border-[rgba(117,132,159,0.18)] bg-[rgba(240,245,250,0.95)] px-4 py-8 text-sm text-[var(--sf-text-muted)]">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  {copy.loadingPreview}
                                </div>
                              ) : artifactPreview ? (
                                <>
                                  <pre className="max-h-[38rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[rgba(117,132,159,0.18)] bg-[rgba(240,245,250,0.95)] p-3 font-mono text-xs text-[var(--sf-text)]">
                                    {artifactPreview.content}
                                  </pre>
                                  {artifactPreview.truncated && (
                                    <div className="text-xs text-amber-300">{copy.previewTruncated}</div>
                                  )}
                                </>
                              ) : (
                                <div className="rounded-xl border border-dashed border-[rgba(117,132,159,0.22)] bg-[rgba(248,250,253,0.78)] px-4 py-10 text-sm text-[var(--sf-text-muted)]">
                                  {copy.previewUnsupported}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-[rgba(117,132,159,0.22)] bg-[rgba(248,250,253,0.78)] px-4 py-10 text-sm text-[var(--sf-text-muted)]">
                              {copy.previewEmpty}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[24rem] items-center justify-center rounded-[24px] border border-dashed border-[rgba(117,132,159,0.22)] bg-[rgba(248,250,253,0.78)] text-sm text-[var(--sf-text-muted)]">
                    {copy.detailsEmpty}
                  </div>
                )}
              </div>
            </section>
            )}
            </div>

            <NovelWritingAssistantPanel
              locale={locale}
              title={title}
              writingLanguage={writingLanguage}
              onApplySeed={setSeedText}
              pushToast={pushToast}
            />
            </div>
          </div>
        )}
      </main>

      <SiteLegalFooter className="bg-transparent" contentClassName="max-w-7xl px-6 py-5" />
    </div>
  );
}
