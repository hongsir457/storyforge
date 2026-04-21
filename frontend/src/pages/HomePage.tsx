import type { ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  BookOpenText,
  Clapperboard,
  LibraryBig,
  PlayCircle,
  Search,
  ServerCog,
  Sparkles,
  SwatchBook,
  Wand2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuthStore } from "@/stores/auth-store";

const HOME_COPY = {
  en: {
    nav: {
      home: "Home",
      novel: "Novel Workbench",
      studio: "Video Studio",
      assets: "Asset Library",
      cta: "Enter Studio",
      searchLabel: "Search",
      notificationsLabel: "Notifications",
    },
    hero: {
      eyebrow: "Editorial Architected AI",
      titleLead: "From a single spark,",
      titleAccent: "forge images that endure.",
      body:
        "A story-to-video production studio for creators. Turn fragmented inspiration into narrative structure, long-form fiction, storyboards, and cinematic visual output inside one Storyforge workflow.",
      primary: "Start Creating",
      secondary: "Watch Demo",
      steps: [
        {
          index: "01",
          title: "Capture the seed",
          body: "Turn one premise into a story world with structure and direction.",
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
        "More than text generation. Storyforge analyzes pacing, character arcs, conflict, and structural tension so the novel layer can mature before visual production begins.",
      quote: '"Every line should carry emotional resonance."',
      engine: "AutoNovel Engine v4.0",
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
      link: "Explore the narrative pipeline",
      panelTitle: "Narrative desk",
      panelBody: "Worldbuilding notes, manuscript rhythm, and chapter intent stay visible in one editorial surface.",
    },
    video: {
      title: "AutoVideo cinematic production",
      body: "From text to 4K visual sequences, Storyforge compresses months of production iteration into a tighter creative loop.",
      mainLabel: "Main Engine",
      mainTitle: "Dynamic visual capture",
      mainBody: "Storyboard prompts, style references, and render output stay linked so motion language is grounded in the story source.",
      syncTitle: "Realtime storyboard sync",
      syncBody: "Mirror the novel's emotional beats into visual sequences and adjust the shot language before final export.",
      syncAction: "Try Director Mode",
      colorTitle: "Color direction studio",
      colorBody: "Move between restrained palettes, warm editorial toning, and stylized cinematic looks without losing continuity.",
      infraTitle: "Compute-backed delivery",
      infraBody: "Render-intensive work can stay in the production pipeline instead of getting pushed out to disconnected tools.",
    },
    footer: {
      productTitle: "Product",
      studioTitle: "Studio",
      subscribeHeader: "Get product updates",
      body: "Storyforge is an AI-native narrative production studio for creators shaping fiction, story worlds, and visual output in one system.",
      product: ["AI Studio", "AutoNovel", "AutoVideo", "Pricing"],
      studio: ["Workflow", "Assets", "Render Center", "Collaboration"],
      subscribeBody: "Receive releases, production notes, and design updates from the Storyforge team.",
      subscribePlaceholder: "Your email address",
      subscribeAction: "Subscribe",
      legal: ["Pricing", "API", "Legal"],
      copyright: "© 2026 Storyforge AI. Editorial Architected.",
    },
  },
  zh: {
    nav: {
      home: "首页",
      novel: "小说工作台",
      studio: "视频工作室",
      assets: "资源库",
      cta: "进入工作台",
      searchLabel: "搜索",
      notificationsLabel: "通知",
    },
    hero: {
      eyebrow: "Editorial Architected AI",
      titleLead: "从一个灵感，",
      titleAccent: "铸就不朽影像",
      body:
        "面向创作者的小说与视频自动生成工作台。把碎片化的灵感推进成故事结构、长篇叙事、分镜语言与电影级视觉输出，全部收进同一套 Storyforge 流程。",
      primary: "立即开启创作",
      secondary: "观看演示视频",
      steps: [
        {
          index: "01",
          title: "捕捉灵感种子",
          body: "从一个设定出发，先把世界观与叙事方向搭稳。",
        },
        {
          index: "02",
          title: "构建内容引擎",
          body: "同步生成小说结构、角色系统与分镜逻辑。",
        },
        {
          index: "03",
          title: "推进视觉制作",
          body: "把作品送进视觉生产、导出与可交付资产链路。",
        },
      ],
    },
    novel: {
      title: "AutoNovel",
      accent: "重塑叙事维度",
      body:
        "不只是文字生成。Storyforge 会先分析节奏、人物弧光、冲突密度与结构张力，让小说层先成熟，再把成果稳定交给视觉生产。",
      quote: "“每一行文字都应该承载情绪的共鸣。”",
      engine: "AutoNovel Engine v4.0",
      points: [
        {
          title: "人物心理图谱",
          body: "围绕动机、矛盾与情绪压力建立角色行为逻辑。",
        },
        {
          title: "多线剧情推演",
          body: "在故事定稿前探索平行路径、章节结构与更稳定的长篇方向。",
        },
      ],
      link: "查看叙事引擎细节",
      panelTitle: "Narrative desk",
      panelBody: "世界观笔记、章节节奏与写作意图会被收在同一个编辑面板里。",
    },
    video: {
      title: "AutoVideo 电影级视觉生产",
      body: "从文字脚本到 4K 视觉序列，Storyforge 把原本按月计算的生产迭代压缩成更短的创作闭环。",
      mainLabel: "Main Engine",
      mainTitle: "动态视觉捕捉",
      mainBody: "让分镜提示词、风格参考与渲染结果保持联动，镜头语言才不会脱离故事源头。",
      syncTitle: "实时分镜同步",
      syncBody: "把小说的情绪节拍同步为画面序列，并在最终导出前微调镜头语言。",
      syncAction: "尝试导演模式",
      colorTitle: "色调控制台",
      colorBody: "在克制的出版感、暖色叙事氛围与风格化电影质感之间切换，而不丢失统一性。",
      infraTitle: "算力支持生产链路",
      infraBody: "让重渲染环节留在同一套生产系统里，而不是散落到互不相干的工具之间。",
    },
    footer: {
      productTitle: "产品",
      studioTitle: "工作室",
      subscribeHeader: "订阅我们的最新动态",
      body: "叙影工厂是一套面向创作者的 AI 叙事生产系统，把小说、故事世界、分镜与视觉输出收进同一个工作流。",
      product: ["AI Studio", "AutoNovel", "AutoVideo", "定价"],
      studio: ["工作流", "资产库", "渲染中心", "团队协作"],
      subscribeBody: "接收 Storyforge 的版本动态、生产笔记与设计更新。",
      subscribePlaceholder: "您的电子邮箱",
      subscribeAction: "订阅",
      legal: ["Pricing", "API", "Legal"],
      copyright: "© 2026 Storyforge AI. Editorial Architected.",
    },
  },
} as const;

type HomeLocale = keyof typeof HOME_COPY;

function useHomeCopy() {
  const { i18n } = useTranslation();
  const locale: HomeLocale = (i18n.resolvedLanguage ?? i18n.language ?? "").startsWith("zh") ? "zh" : "en";
  return HOME_COPY[locale];
}

export function HomePage() {
  const copy = useHomeCopy();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const studioHref = isAuthenticated ? "/app/projects" : "/login";
  const novelHref = isAuthenticated ? "/app/novel-workbench" : "/login";

  return (
    <div className="storyforge-public-shell min-h-screen text-[var(--sf-text)]">
      <div className="landing-grid pointer-events-none" />
      <div className="landing-orb landing-orb-a" />
      <div className="landing-orb landing-orb-b" />

      <nav className="fixed left-0 top-0 z-50 w-full border-b border-[rgba(117,132,159,0.1)] bg-white/66 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/" className="rounded-[1rem] transition-transform hover:-translate-y-0.5">
            <BrandLogo alt="Storyforge" className="h-12 w-auto max-w-[15rem]" />
          </Link>

          <div className="hidden items-center gap-10 md:flex">
            <HomeNavLink href="/">{copy.nav.home}</HomeNavLink>
            <HomeNavLink href={novelHref}>{copy.nav.novel}</HomeNavLink>
            <HomeNavLink href={studioHref}>{copy.nav.studio}</HomeNavLink>
            <HomeNavLink href={studioHref}>{copy.nav.assets}</HomeNavLink>
          </div>

          <div className="flex items-center gap-3">
            <DecorativeIcon label={copy.nav.searchLabel} icon={<Search className="h-4 w-4" />} />
            <DecorativeIcon label={copy.nav.notificationsLabel} icon={<Bell className="h-4 w-4" />} />
            <Link
              href={studioHref}
              className="storyforge-primary-button inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition hover:-translate-y-0.5"
            >
              {copy.nav.cta}
            </Link>
          </div>
        </div>
      </nav>

      <main className="px-6 pb-20 pt-28 lg:px-24">
        <header className="relative mx-auto flex min-h-[56rem] max-w-[1400px] flex-col justify-center overflow-hidden pb-20 pt-10">
          <div className="absolute right-0 top-0 hidden h-full w-1/2 opacity-30 lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(24,151,214,0.24),transparent_52%)]" />
          </div>

          <div className="relative z-10 max-w-4xl">
            <span className="storyforge-kicker">{copy.hero.eyebrow}</span>
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
              <Link
                href={studioHref}
                className="storyforge-primary-button inline-flex h-14 items-center justify-center rounded-[1rem] px-8 text-lg font-semibold transition hover:-translate-y-0.5"
              >
                {copy.hero.primary}
              </Link>
              <Link
                href={novelHref}
                className="storyforge-secondary-button inline-flex h-14 items-center justify-center gap-2 rounded-[1rem] px-8 text-lg font-semibold transition hover:-translate-y-0.5"
              >
                <PlayCircle className="h-5 w-5" />
                {copy.hero.secondary}
              </Link>
            </div>
          </div>

          <div className="relative z-10 mt-20 grid grid-cols-1 gap-5 md:grid-cols-3">
            {copy.hero.steps.map((step) => (
              <StepCard key={step.index} index={step.index} title={step.title} body={step.body} />
            ))}
          </div>
        </header>

        <section className="mx-auto max-w-[1400px] rounded-[2rem] bg-[rgba(246,249,253,0.68)] px-0 py-24">
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

              <Link
                href={novelHref}
                className="mt-12 inline-flex items-center gap-2 text-base font-semibold text-[var(--sf-blue-strong)] transition hover:gap-3"
              >
                {copy.novel.link}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] py-24">
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
                <Link
                  href={studioHref}
                  className="mt-6 inline-flex h-12 items-center justify-center rounded-[1rem] bg-white px-4 text-sm font-semibold text-[var(--sf-blue-strong)] transition hover:bg-slate-100"
                >
                  {copy.video.syncAction}
                </Link>
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

        <footer className="mx-auto mt-8 max-w-[1400px] border-t border-[rgba(117,132,159,0.12)] bg-slate-50/80">
          <div className="px-8 py-16">
            <div className="mb-14 grid grid-cols-1 gap-12 md:grid-cols-12">
              <div className="md:col-span-4">
                <div className="mb-6">
                  <BrandLogo alt="Storyforge" className="h-11 w-auto max-w-[14rem]" />
                </div>
                <p className="max-w-xs text-sm leading-7 text-slate-500">{copy.footer.body}</p>
                <div className="mt-8 flex gap-4">
                  <FooterIcon icon={<Sparkles className="h-4 w-4" />} />
                  <FooterIcon icon={<LibraryBig className="h-4 w-4" />} />
                  <FooterIcon icon={<BookOpenText className="h-4 w-4" />} />
                </div>
              </div>

              <FooterColumn title={copy.footer.productTitle} items={copy.footer.product} className="md:col-span-2" />
              <FooterColumn title={copy.footer.studioTitle} items={copy.footer.studio} className="md:col-span-2" />

              <div className="md:col-span-4">
                <h5 className="text-base font-bold text-slate-900">{copy.footer.subscribeHeader}</h5>
                <p className="mt-4 text-sm leading-7 text-slate-500">{copy.footer.subscribeBody}</p>
                <div className="mt-6 flex gap-2">
                  <input
                    type="email"
                    placeholder={copy.footer.subscribePlaceholder}
                    className="min-w-0 flex-1 rounded-[1rem] border border-transparent bg-white px-4 py-3 text-sm text-[var(--sf-text)] shadow-[0_20px_40px_rgba(23,27,42,0.04)] outline-none transition focus:border-[rgba(24,151,214,0.22)]"
                  />
                  <button
                    type="button"
                    className="storyforge-primary-button rounded-[1rem] px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
                  >
                    {copy.footer.subscribeAction}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-[rgba(117,132,159,0.12)] pt-8 text-xs uppercase tracking-[0.24em] text-slate-400 md:flex-row md:items-center md:justify-between">
              <span>{copy.footer.copyright}</span>
              <div className="flex gap-8">
                {copy.footer.legal.map((item) => (
                  <span key={item} className="transition-colors hover:text-[var(--sf-blue-strong)]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function HomeNavLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="text-sm font-medium text-slate-500 transition-colors hover:text-[var(--sf-blue-strong)]">
      {children}
    </Link>
  );
}

function DecorativeIcon({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div
      aria-hidden="true"
      title={label}
      className="hidden h-10 w-10 items-center justify-center rounded-full border border-[rgba(117,132,159,0.18)] bg-white/78 text-slate-500 shadow-[0_12px_32px_rgba(23,38,69,0.06)] md:inline-flex"
    >
      {icon}
    </div>
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
  items: readonly string[];
  className?: string;
}) {
  return (
    <div className={className}>
      <h5 className="text-base font-bold text-slate-900">{title}</h5>
      <ul className="mt-6 space-y-4 text-sm text-slate-400">
        {items.map((item) => (
          <li key={item} className="cursor-default transition-colors hover:text-[var(--sf-blue-strong)]">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterIcon({ icon }: { icon: ReactNode }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/50 text-slate-500 transition-colors hover:bg-[var(--sf-blue)] hover:text-white">
      {icon}
    </div>
  );
}
