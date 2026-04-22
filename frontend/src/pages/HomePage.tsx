import type { ReactNode } from "react";
import {
  ArrowRight,
  BookOpenText,
  Boxes,
  Clapperboard,
  LibraryBig,
  PlayCircle,
  ServerCog,
  Sparkles,
  SwatchBook,
  Wand2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SiteLegalFooter } from "@/components/legal/SiteLegalFooter";
import { useAuthStore } from "@/stores/auth-store";

const HOME_COPY = {
  en: {
    nav: {
      home: "Home",
      novel: "Novel Workbench",
      studio: "Video Studio",
      assets: "Asset Library",
      pricing: "Pricing",
      contact: "Contact",
      cta: "Enter Studio",
    },
    hero: {
      eyebrow: "Editorial Architected AI",
      titleLead: "From a single spark,",
      titleAccent: "forge images that endure.",
      body:
        "Frametale is a narrative-to-video production studio for creators. Turn a loose idea into a novel structure, storyboard logic, asset system, and cinematic delivery inside one workflow.",
      primary: "Start Creating",
      secondary: "Watch Demo",
      steps: [
        {
          index: "01",
          title: "Capture the seed",
          body: "Turn one premise into a story world with clear structure and direction.",
        },
        {
          index: "02",
          title: "Build the narrative engine",
          body: "Generate novel drafts, character systems, and synchronized storyboard logic.",
        },
        {
          index: "03",
          title: "Render for screen",
          body: "Push the work into visual production, exports, and delivery-ready assets.",
        },
      ],
    },
    novel: {
      title: "AutoNovel",
      accent: "reshapes narrative scale",
      body:
        "More than text generation. Frametale analyzes pacing, character arcs, conflict, and structural tension so the novel layer can mature before visual production begins.",
      quote: '"Every line should carry emotional resonance."',
      engine: "AutoNovel Engine v4.0",
      link: "Explore the novel workspace",
      panelTitle: "Narrative desk",
      panelBody:
        "Worldbuilding notes, manuscript rhythm, and chapter intent stay visible in one editorial surface.",
      points: [
        {
          title: "Character psychology map",
          body: "Prototype role behavior from motivations, contradictions, and emotional pressure.",
        },
        {
          title: "Multi-line story evolution",
          body: "Explore alternate arcs and stable chapter structures before the manuscript hardens.",
        },
      ],
    },
    video: {
      title: "AutoVideo cinematic production",
      body:
        "From text to 4K visual sequences, Frametale compresses months of production iteration into a tighter creative loop.",
      mainLabel: "Main Engine",
      mainTitle: "Dynamic visual capture",
      mainBody:
        "Storyboard prompts, style references, and render output stay linked so motion language is grounded in the story source.",
      syncTitle: "Realtime storyboard sync",
      syncBody:
        "Mirror the novel's emotional beats into visual sequences and adjust the shot language before final export.",
      syncAction: "Open Video Studio",
      colorTitle: "Color direction studio",
      colorBody:
        "Move between restrained palettes, warm editorial toning, and stylized cinematic looks without losing continuity.",
      infraTitle: "Compute-backed delivery",
      infraBody:
        "Render-intensive work can stay inside the production pipeline instead of getting scattered across disconnected tools.",
    },
    workflow: {
      eyebrow: "Workflow and Assets",
      title: "Keep story, assets, and production state in one place.",
      body:
        "The studio surface is built to keep the narrative source, asset organization, and execution controls visible together so the team does not have to rebuild context on every step.",
      workflowTitle: "Creator workflow",
      workflowBody:
        "Projects, scripts, visual tasks, and exports stay on one routed workspace instead of moving between unrelated tools.",
      assetsTitle: "Asset library",
      assetsBody:
        "Generated stills, references, and source files remain attached to the project timeline so assets are reusable instead of disposable.",
      workflowAction: "Open creator home",
      assetsAction: "View pricing",
    },
    footer: {
      productTitle: "Product",
      studioTitle: "Studio",
      body:
        "Frametale is an AI-native narrative production studio for creators shaping fiction, story worlds, and visual output in one system.",
      updatesTitle: "Next steps",
      updatesBody:
        "Continue into the studio, review plan options, or contact the team about deployment and production support.",
      actions: {
        primary: "Enter Frametale",
        secondary: "Contact us",
      },
      product: [
        { label: "AI Studio", href: "/app/projects" },
        { label: "AutoNovel", href: "#autonovel" },
        { label: "AutoVideo", href: "#autovideo" },
        { label: "Pricing", href: "/pricing" },
      ],
      studio: [
        { label: "Workflow", href: "#workflow" },
        { label: "Asset Library", href: "#asset-library" },
        { label: "Render Center", href: "#autovideo" },
        { label: "Collaboration", href: "/contact" },
      ],
      iconLinks: [
        { label: "Novel", href: "#autonovel", icon: "novel" },
        { label: "Assets", href: "#asset-library", icon: "assets" },
        { label: "Contact", href: "/contact", icon: "contact" },
      ],
    },
  },
  zh: {
    nav: {
      home: "首页",
      novel: "小说工作台",
      studio: "视频工作室",
      assets: "资源库",
      pricing: "价格方案",
      contact: "联系我们",
      cta: "进入工作台",
    },
    hero: {
      eyebrow: "Editorial Architected AI",
      titleLead: "从一个灵感，",
      titleAccent: "铸就不朽影像",
      body:
        "Frametale 是一套把叙事推进到视频生产的创作工作室。你可以把松散的灵感收束成小说结构、分镜逻辑、资产系统和可交付的视觉成品，全程停留在同一套工作流里。",
      primary: "立即开始创作",
      secondary: "查看演示",
      steps: [
        {
          index: "01",
          title: "抓住故事种子",
          body: "先把一个前提、一个角色关系或一个世界观起点，变成可推进的叙事方向。",
        },
        {
          index: "02",
          title: "构建内容引擎",
          body: "同步生成小说结构、角色系统和分镜逻辑，不再分散在多个入口里。",
        },
        {
          index: "03",
          title: "进入视觉制作",
          body: "把成果推入视觉生产、导出和交付，让故事真正进入成片阶段。",
        },
      ],
    },
    novel: {
      title: "AutoNovel",
      accent: "重塑叙事维度",
      body:
        "它不只是文字生成。Frametale 会先分析节奏、角色弧光、冲突密度与结构张力，让小说层先成熟，再把稳定结果交给视觉生产。",
      quote: "“每一行文字都应该承载情绪的共鸣。”",
      engine: "AutoNovel Engine v4.0",
      link: "进入小说工作台",
      panelTitle: "Narrative desk",
      panelBody: "世界观笔记、章节节奏与写作意图，会被收进同一个 editorial 面板里。",
      points: [
        {
          title: "人物心理图谱",
          body: "围绕动机、矛盾与情绪压力建立角色行为逻辑，让长篇推进更稳。",
        },
        {
          title: "多线剧情推演",
          body: "在故事定稿前探索平行路径、章节结构与更稳定的长篇走向。",
        },
      ],
    },
    video: {
      title: "AutoVideo 电影级视觉生产",
      body:
        "从文本到 4K 视觉序列，Frametale 把原本按月计算的生产迭代压缩成更短的创作闭环。",
      mainLabel: "Main Engine",
      mainTitle: "动态视觉捕捉",
      mainBody:
        "让分镜提示词、风格参考与渲染结果保持联动，镜头语言不会再脱离故事源头。",
      syncTitle: "实时分镜同步",
      syncBody:
        "把小说的情绪节拍同步成画面序列，并在最终导出前微调镜头语言。",
      syncAction: "打开视频工作室",
      colorTitle: "色调控制台",
      colorBody:
        "在克制的出版感、暖色叙事氛围与风格化电影质感之间切换，而不丢失统一性。",
      infraTitle: "算力支撑的交付链路",
      infraBody:
        "让重渲染环节留在同一套生产系统里，而不是散落到彼此脱节的工具之间。",
    },
    workflow: {
      eyebrow: "Workflow and Assets",
      title: "把故事、资产和生产状态留在同一个场域里。",
      body:
        "工作台不是把功能堆在一起，而是让叙事源头、资产组织和执行控制同时可见，团队不需要在每个阶段重新找回上下文。",
      workflowTitle: "创作工作流",
      workflowBody:
        "项目、脚本、视觉任务和导出入口都留在同一个路由空间里，而不是在多个工具之间反复跳转。",
      assetsTitle: "资产资源库",
      assetsBody:
        "生成图、参考图和源文件都会留在项目脉络里，资产能复用，不再只是一次性产物。",
      workflowAction: "进入项目主页",
      assetsAction: "查看价格方案",
    },
    footer: {
      productTitle: "产品",
      studioTitle: "工作室",
      body:
        "Frametale 是一套面向创作者的 AI 叙事生产系统，把小说、故事世界、分镜与视觉输出收进同一个工作流。",
      updatesTitle: "下一步",
      updatesBody:
        "你可以直接进入工作台、查看价格方案，或者联系我们了解部署与生产支持。",
      actions: {
        primary: "进入 Frametale",
        secondary: "联系我们",
      },
      product: [
        { label: "AI Studio", href: "/app/projects" },
        { label: "AutoNovel", href: "#autonovel" },
        { label: "AutoVideo", href: "#autovideo" },
        { label: "价格方案", href: "/pricing" },
      ],
      studio: [
        { label: "工作流", href: "#workflow" },
        { label: "资产资源库", href: "#asset-library" },
        { label: "渲染中心", href: "#autovideo" },
        { label: "团队协作", href: "/contact" },
      ],
      iconLinks: [
        { label: "小说工作台", href: "#autonovel", icon: "novel" },
        { label: "资源库", href: "#asset-library", icon: "assets" },
        { label: "联系我们", href: "/contact", icon: "contact" },
      ],
    },
  },
} as const;

type HomeLocale = keyof typeof HOME_COPY;
type FooterItem = { label: string; href: string };
type FooterIconKind = "novel" | "assets" | "contact";

function useHomeCopy() {
  const { i18n } = useTranslation();
  const locale: HomeLocale =
    (i18n.resolvedLanguage ?? i18n.language ?? "").startsWith("zh") ? "zh" : "en";
  return HOME_COPY[locale];
}

export function HomePage() {
  const copy = useHomeCopy();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const studioHref = isAuthenticated ? "/app/projects" : "/login";
  const novelWorkspaceHref = isAuthenticated ? "/app/novel-workbench" : "/login";

  return (
    <div className="frametale-public-shell min-h-screen text-[var(--sf-text)]">
      <div className="landing-grid pointer-events-none" />
      <div className="landing-orb landing-orb-a" />
      <div className="landing-orb landing-orb-b" />

      <nav className="fixed left-0 top-0 z-50 w-full border-b border-[rgba(117,132,159,0.1)] bg-white/66 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/" className="rounded-[1rem] transition-transform hover:-translate-y-0.5">
            <BrandLogo alt="Frametale" className="h-12 w-auto max-w-[15rem]" />
          </Link>

          <div className="hidden items-center gap-10 md:flex">
            <SmartLink href="/" className="text-sm font-medium text-slate-500 transition-colors hover:text-[var(--sf-blue-strong)]">
              {copy.nav.home}
            </SmartLink>
            <SmartLink href="#autonovel" className="text-sm font-medium text-slate-500 transition-colors hover:text-[var(--sf-blue-strong)]">
              {copy.nav.novel}
            </SmartLink>
            <SmartLink href="#autovideo" className="text-sm font-medium text-slate-500 transition-colors hover:text-[var(--sf-blue-strong)]">
              {copy.nav.studio}
            </SmartLink>
            <SmartLink href="#asset-library" className="text-sm font-medium text-slate-500 transition-colors hover:text-[var(--sf-blue-strong)]">
              {copy.nav.assets}
            </SmartLink>
          </div>

          <div className="flex items-center gap-3">
            <SmartLink
              href="/pricing"
              className="frametale-secondary-button hidden rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 lg:inline-flex"
            >
              {copy.nav.pricing}
            </SmartLink>
            <SmartLink
              href="/contact"
              className="frametale-secondary-button hidden rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 lg:inline-flex"
            >
              {copy.nav.contact}
            </SmartLink>
            <SmartLink
              href={studioHref}
              className="frametale-primary-button inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition hover:-translate-y-0.5"
            >
              {copy.nav.cta}
            </SmartLink>
          </div>
        </div>
      </nav>

      <main className="px-6 pb-20 pt-28 lg:px-24">
        <header className="relative mx-auto flex min-h-[56rem] max-w-[1400px] flex-col justify-center overflow-hidden pb-20 pt-10">
          <div className="absolute right-0 top-0 hidden h-full w-1/2 opacity-30 lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(24,151,214,0.24),transparent_52%)]" />
          </div>

          <div className="relative z-10 max-w-4xl">
            <span className="frametale-kicker">{copy.hero.eyebrow}</span>
            <h1
              className="mt-8 text-5xl font-extrabold leading-[0.94] tracking-[-0.06em] text-[var(--sf-text)] md:text-7xl xl:text-[5.6rem]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {copy.hero.titleLead}
              <br />
              <span className="text-[var(--sf-blue)] italic">{copy.hero.titleAccent}</span>
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-9 text-[var(--sf-text-muted)] md:text-[1.45rem] md:leading-[2.35rem]">
              {copy.hero.body}
            </p>

            <div className="mt-12 flex flex-wrap gap-4">
              <SmartLink
                href={studioHref}
                className="frametale-primary-button inline-flex h-14 items-center justify-center rounded-[1rem] px-8 text-lg font-semibold transition hover:-translate-y-0.5"
              >
                {copy.hero.primary}
              </SmartLink>
              <SmartLink
                href="#autovideo"
                className="frametale-secondary-button inline-flex h-14 items-center justify-center gap-2 rounded-[1rem] px-8 text-lg font-semibold transition hover:-translate-y-0.5"
              >
                <PlayCircle className="h-5 w-5" />
                {copy.hero.secondary}
              </SmartLink>
            </div>
          </div>

          <div className="relative z-10 mt-20 grid grid-cols-1 gap-5 md:grid-cols-3">
            {copy.hero.steps.map((step) => (
              <StepCard key={step.index} index={step.index} title={step.title} body={step.body} />
            ))}
          </div>
        </header>

        <section
          id="autonovel"
          className="mx-auto max-w-[1400px] rounded-[2rem] bg-[rgba(246,249,253,0.68)] px-0 py-24"
        >
          <div className="grid gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
            <div className="px-0 lg:px-6">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-[rgba(117,132,159,0.16)] bg-[linear-gradient(180deg,rgba(235,246,253,0.92),rgba(230,235,244,0.92))] shadow-[0_20px_40px_rgba(23,27,42,0.04)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(24,151,214,0.22),transparent_40%),linear-gradient(180deg,transparent_18%,rgba(24,151,214,0.52)_100%)]" />
                <div className="absolute left-8 top-8 rounded-full border border-white/45 bg-white/66 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--sf-blue-strong)]">
                  {copy.novel.panelTitle}
                </div>
                <div className="absolute bottom-8 left-8 right-8 rounded-[1.3rem] border border-white/40 bg-white/68 p-6 backdrop-blur-md">
                  <p className="text-sm italic text-[var(--sf-text)]">{copy.novel.quote}</p>
                  <div className="mt-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--sf-blue-strong)]">
                    {copy.novel.engine}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[var(--sf-text-muted)]">{copy.novel.panelBody}</p>
                </div>
              </div>
            </div>

            <div className="px-0 lg:px-6">
              <h2
                className="text-5xl font-extrabold leading-[1.02] tracking-[-0.05em] text-[var(--sf-text)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {copy.novel.title}
                <br />
                <span className="text-[var(--sf-blue)]">{copy.novel.accent}</span>
              </h2>
              <p className="mt-8 max-w-2xl text-lg leading-9 text-[var(--sf-text-muted)]">{copy.novel.body}</p>

              <div className="mt-10 space-y-8">
                {copy.novel.points.map((point) => (
                  <FeaturePoint
                    key={point.title}
                    title={point.title}
                    body={point.body}
                    icon={<Wand2 className="h-5 w-5 text-[var(--sf-blue)]" />}
                  />
                ))}
              </div>

              <SmartLink
                href={novelWorkspaceHref}
                className="mt-12 inline-flex items-center gap-2 text-base font-semibold text-[var(--sf-blue-strong)] transition hover:gap-3"
              >
                {copy.novel.link}
                <ArrowRight className="h-4 w-4" />
              </SmartLink>
            </div>
          </div>
        </section>

        <section id="autovideo" className="mx-auto max-w-[1400px] py-24">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2
              className="text-5xl font-extrabold tracking-[-0.05em] text-[var(--sf-text)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {copy.video.title}
            </h2>
            <p className="mt-6 text-lg leading-9 text-[var(--sf-text-muted)]">{copy.video.body}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:auto-rows-[minmax(180px,1fr)] md:[grid-template-areas:'main_main_main_main_main_main_main_main_sync_sync_sync_sync''main_main_main_main_main_main_main_main_color_color_infra_infra''main_main_main_main_main_main_main_main_infra_infra_infra_infra']">
            <BentoCard className="min-h-[23rem] overflow-hidden md:[grid-area:main]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(24,151,214,0.2),transparent_32%),linear-gradient(180deg,rgba(15,27,55,0.06),rgba(15,27,55,0.18))]" />
              <div className="absolute left-8 top-8 rounded-full bg-[var(--sf-blue)] px-4 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white">
                {copy.video.mainLabel}
              </div>
              <div className="absolute bottom-0 left-0 w-full border-t border-white/35 bg-white/64 p-8 backdrop-blur-md">
                <h3 className="text-3xl font-black tracking-[-0.04em] text-[var(--sf-text)]">{copy.video.mainTitle}</h3>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--sf-text-muted)]">{copy.video.mainBody}</p>
              </div>
            </BentoCard>

            <BentoCard className="min-h-[20rem] bg-[linear-gradient(160deg,#0ea5e9_0%,#006591_100%)] text-white md:[grid-area:sync]">
              <div className="absolute right-6 top-6 opacity-15">
                <Clapperboard className="h-24 w-24" />
              </div>
              <div className="relative flex h-full flex-col justify-end">
                <h3 className="text-2xl font-black tracking-[-0.03em]">{copy.video.syncTitle}</h3>
                <p className="mt-4 text-sm leading-7 text-white/80">{copy.video.syncBody}</p>
                <SmartLink
                  href={studioHref}
                  className="mt-6 inline-flex h-12 items-center justify-center rounded-[1rem] bg-white px-4 text-sm font-semibold text-[var(--sf-blue-strong)] transition hover:bg-slate-100"
                >
                  {copy.video.syncAction}
                </SmartLink>
              </div>
            </BentoCard>

            <BentoCard className="min-h-[16rem] md:[grid-area:color]">
              <div className="flex h-full flex-col justify-between">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_16px_30px_rgba(23,38,69,0.08)]">
                  <SwatchBook className="h-5 w-5 text-[var(--sf-blue)]" />
                </div>
                <div>
                  <h4 className="text-xl font-bold tracking-[-0.03em] text-[var(--sf-text)]">{copy.video.colorTitle}</h4>
                  <p className="mt-3 text-sm leading-7 text-[var(--sf-text-muted)]">{copy.video.colorBody}</p>
                </div>
              </div>
            </BentoCard>

            <BentoCard className="min-h-[16rem] overflow-hidden md:[grid-area:infra]">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(238,243,249,0.72),rgba(223,231,242,0.96))]" />
              <div className="relative flex h-full items-center justify-center">
                <div className="w-full max-w-sm rounded-[1.5rem] border border-white/45 bg-white/62 p-8 text-center backdrop-blur-md">
                  <ServerCog className="mx-auto h-10 w-10 text-[var(--sf-blue)]" />
                  <h4 className="mt-4 text-xl font-bold tracking-[-0.03em] text-[var(--sf-text)]">{copy.video.infraTitle}</h4>
                  <p className="mt-3 text-sm leading-7 text-[var(--sf-text-muted)]">{copy.video.infraBody}</p>
                </div>
              </div>
            </BentoCard>
          </div>
        </section>

        <section
          id="workflow"
          className="mx-auto grid max-w-[1400px] gap-6 rounded-[2rem] border border-[rgba(117,132,159,0.16)] bg-white/84 px-8 py-10 shadow-[0_20px_50px_rgba(23,38,69,0.07)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
        >
          <div>
            <div className="frametale-kicker">{copy.workflow.eyebrow}</div>
            <h2
              className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.05em]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {copy.workflow.title}
            </h2>
            <p className="mt-6 max-w-2xl text-[15px] leading-8 text-[var(--sf-text-muted)] sm:text-[1rem]">
              {copy.workflow.body}
            </p>
          </div>

          <div className="grid gap-4">
            <article className="rounded-[1.7rem] border border-[rgba(117,132,159,0.14)] bg-[rgba(246,249,253,0.82)] p-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-900">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">{copy.workflow.workflowTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--sf-text-muted)]">{copy.workflow.workflowBody}</p>
              <SmartLink
                href={studioHref}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--sf-blue-strong)] transition hover:gap-3"
              >
                {copy.workflow.workflowAction}
                <ArrowRight className="h-4 w-4" />
              </SmartLink>
            </article>

            <article
              id="asset-library"
              className="rounded-[1.7rem] border border-[rgba(117,132,159,0.14)] bg-[rgba(246,249,253,0.82)] p-6"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(201,230,255,0.78)] text-[var(--sf-blue)]">
                <Boxes className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">{copy.workflow.assetsTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--sf-text-muted)]">{copy.workflow.assetsBody}</p>
              <SmartLink
                href="/pricing"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--sf-blue-strong)] transition hover:gap-3"
              >
                {copy.workflow.assetsAction}
                <ArrowRight className="h-4 w-4" />
              </SmartLink>
            </article>
          </div>
        </section>

        <footer className="mx-auto mt-8 max-w-[1400px] border-t border-[rgba(117,132,159,0.12)] bg-slate-50/80">
          <div className="px-8 py-16">
            <div className="mb-14 grid grid-cols-1 gap-12 md:grid-cols-12">
              <div className="md:col-span-4">
                <div className="mb-6">
                  <BrandLogo alt="Frametale" className="h-11 w-auto max-w-[14rem]" />
                </div>
                <p className="max-w-xs text-sm leading-7 text-slate-500">{copy.footer.body}</p>
                <div className="mt-8 flex gap-4">
                  {copy.footer.iconLinks.map((item) => (
                    <FooterIconLink key={item.label} href={item.href} label={item.label} kind={item.icon} />
                  ))}
                </div>
              </div>

              <FooterColumn title={copy.footer.productTitle} items={copy.footer.product} className="md:col-span-2" />
              <FooterColumn title={copy.footer.studioTitle} items={copy.footer.studio} className="md:col-span-2" />

              <div className="md:col-span-4">
                <h5 className="text-base font-bold text-slate-900">{copy.footer.updatesTitle}</h5>
                <p className="mt-4 text-sm leading-7 text-slate-500">{copy.footer.updatesBody}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <SmartLink
                    href={studioHref}
                    className="frametale-primary-button inline-flex rounded-[1rem] px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
                  >
                    {copy.footer.actions.primary}
                  </SmartLink>
                  <SmartLink
                    href="/contact"
                    className="frametale-secondary-button inline-flex rounded-[1rem] px-5 py-3 text-sm font-medium transition hover:-translate-y-0.5"
                  >
                    {copy.footer.actions.secondary}
                  </SmartLink>
                </div>
              </div>
            </div>

            <SiteLegalFooter
              className="bg-transparent"
              contentClassName="max-w-none px-0 py-8"
              textClassName="text-slate-400"
              brandClassName="text-slate-900"
              navClassName="text-slate-400"
            />
          </div>
        </footer>
      </main>
    </div>
  );
}

function SmartLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function StepCard({
  index,
  title,
  body,
}: {
  index: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[rgba(190,200,210,0.15)] bg-[rgba(243,242,255,0.58)] p-7 shadow-[0_20px_40px_rgba(23,27,42,0.04)]">
      <div className="flex items-center gap-5">
        <span className="text-4xl font-black text-[rgba(24,151,214,0.22)]">{index}</span>
        <p className="text-sm font-semibold leading-6 text-[var(--sf-text-muted)]">
          {title}
          <br />
          <span className="font-medium text-[var(--sf-text-soft)]">{body}</span>
        </p>
      </div>
    </div>
  );
}

function FeaturePoint({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(201,230,255,0.78)]">
        {icon}
      </div>
      <div>
        <h4 className="text-lg font-bold text-[var(--sf-text)]">{title}</h4>
        <p className="mt-2 text-sm leading-7 text-[var(--sf-text-muted)]">{body}</p>
      </div>
    </div>
  );
}

function BentoCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-[2rem] border border-[rgba(190,200,210,0.15)] bg-[rgba(255,255,255,0.84)] p-8 shadow-[0_20px_40px_rgba(23,27,42,0.04)] ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function FooterColumn({
  title,
  items,
  className,
}: {
  title: string;
  items: readonly FooterItem[];
  className?: string;
}) {
  return (
    <div className={className}>
      <h5 className="text-base font-bold text-slate-900">{title}</h5>
      <ul className="mt-6 space-y-4 text-sm text-slate-400">
        {items.map((item) => (
          <li key={item.label}>
            <SmartLink
              href={item.href}
              className="transition-colors hover:text-[var(--sf-blue-strong)]"
            >
              {item.label}
            </SmartLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterIconLink({
  href,
  label,
  kind,
}: {
  href: string;
  label: string;
  kind: FooterIconKind;
}) {
  const icon =
    kind === "novel" ? (
      <BookOpenText className="h-4 w-4" />
    ) : kind === "assets" ? (
      <LibraryBig className="h-4 w-4" />
    ) : (
      <Sparkles className="h-4 w-4" />
    );

  return (
    <SmartLink
      href={href}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/50 text-slate-500 transition-colors hover:bg-[var(--sf-blue)] hover:text-white"
    >
      <span className="sr-only">{label}</span>
      {icon}
    </SmartLink>
  );
}
