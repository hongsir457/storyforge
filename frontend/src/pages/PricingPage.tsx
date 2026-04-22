import { ArrowRight, Check, ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SiteLegalFooter } from "@/components/legal/SiteLegalFooter";
import { useAuthStore } from "@/stores/auth-store";

const PRICING_COPY = {
  en: {
    back: "Back Home",
    eyebrow: "Subscription Plans",
    titleLead: "Choose the Frametale",
    titleAccent: "production rhythm",
    body:
      "From a single creator to a full studio, each plan keeps the same editorial system while expanding throughput, render quality, and collaboration depth.",
    monthly: "Monthly",
    annual: "Annual",
    annualBadge: "Save 20%",
    ctaPrimary: "Start with Frametale",
    ctaSecondary: "Talk to us",
    compareTitle: "What changes as you scale",
    compareBody:
      "All plans keep the same product direction. The difference is how much throughput, export quality, and operational control you need.",
    plans: [
      {
        name: "Starter",
        price: "$0",
        cadence: "/ forever",
        description: "Explore Frametale with a lightweight personal workflow.",
        features: [
          "5 HD projects each month",
          "Core novel and storyboard generation",
          "Basic exports and workspace history",
        ],
        action: "Create free account",
      },
      {
        name: "Pro",
        price: "$29",
        cadence: "/ month",
        description: "For creators running Frametale as a serious production tool.",
        features: [
          "Unlimited active projects",
          "4K exports and priority generation",
          "Project-level model overrides",
          "Faster render and review loop",
        ],
        action: "Upgrade to Pro",
        featured: true,
      },
      {
        name: "Studio",
        price: "Custom",
        cadence: "",
        description: "For teams needing shared governance, API control, and deployment support.",
        features: [
          "Provider and API key governance",
          "Private infrastructure options",
          "Team collaboration controls",
          "Deployment support and onboarding",
        ],
        action: "Contact sales",
      },
    ],
    comparison: [
      {
        title: "Narrative pipeline",
        starter: "Seed to chapter structure",
        pro: "Long-form iteration with exports",
        studio: "Shared review and operating controls",
      },
      {
        title: "Visual production",
        starter: "Preview renders",
        pro: "4K production exports",
        studio: "Managed render pipeline",
      },
      {
        title: "Model controls",
        starter: "Default presets",
        pro: "Project overrides",
        studio: "Global provider and credential governance",
      },
    ],
  },
  zh: {
    back: "返回首页",
    eyebrow: "价格方案",
    titleLead: "选择适合你的 Frametale",
    titleAccent: "创作节奏",
    body:
      "从个人创作者到完整工作室，所有方案都使用同一套 editorial 工作流，只是在吞吐量、导出规格和协作深度上逐步放大。",
    monthly: "按月付费",
    annual: "按年付费",
    annualBadge: "立省 20%",
    ctaPrimary: "开始使用 Frametale",
    ctaSecondary: "联系我们",
    compareTitle: "规模变化时，真正增加的是什么",
    compareBody:
      "所有方案都保留同一个产品方向，区别只在于你需要多少产能、导出质量和运营控制能力。",
    plans: [
      {
        name: "Starter",
        price: "¥0",
        cadence: "/ 永久",
        description: "适合先体验 Frametale 的个人创作流。",
        features: [
          "每月 5 个高清项目",
          "基础小说与分镜生成",
          "基础导出与工作区历史记录",
        ],
        action: "免费开始",
      },
      {
        name: "Pro",
        price: "¥199",
        cadence: "/ 月",
        description: "适合把 Frametale 当成正式生产工具的创作者。",
        features: [
          "不限活跃项目数",
          "4K 导出与优先生成",
          "项目级模型覆盖",
          "更快的渲染与审阅闭环",
        ],
        action: "升级到 Pro",
        featured: true,
      },
      {
        name: "Studio",
        price: "定制",
        cadence: "",
        description: "适合需要权限治理、API 控制和部署支持的团队。",
        features: [
          "Provider 与 API Key 治理",
          "私有化基础设施选项",
          "团队协作权限控制",
          "部署支持与上线协助",
        ],
        action: "联系销售",
      },
    ],
    comparison: [
      {
        title: "叙事流水线",
        starter: "从 seed 到章节结构",
        pro: "支持长篇迭代与导出",
        studio: "支持共享审阅与运营控制",
      },
      {
        title: "视觉生产",
        starter: "预览级渲染",
        pro: "4K 正式导出",
        studio: "托管式渲染链路",
      },
      {
        title: "模型控制",
        starter: "默认预设",
        pro: "项目级覆盖",
        studio: "全局 provider 与凭据治理",
      },
    ],
  },
} as const;

type PricingLocale = keyof typeof PRICING_COPY;

function usePricingCopy() {
  const { i18n } = useTranslation();
  const locale: PricingLocale =
    (i18n.resolvedLanguage ?? i18n.language ?? "").startsWith("zh") ? "zh" : "en";
  return PRICING_COPY[locale];
}

export function PricingPage() {
  const copy = usePricingCopy();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const studioHref = isAuthenticated ? "/app/projects" : "/login";

  return (
    <div className="frametale-public-shell flex min-h-screen flex-col text-[var(--sf-text)]">
      <div className="landing-grid pointer-events-none" />
      <div className="landing-orb landing-orb-a" />
      <div className="landing-orb landing-orb-b" />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-7">
        <Link href="/" className="rounded-[1.7rem] transition-transform hover:-translate-y-0.5">
          <BrandLogo alt="Frametale" className="h-14 w-auto max-w-[17rem]" />
        </Link>

        <Link
          href="/"
          className="frametale-secondary-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
        >
          <ChevronLeft className="h-4 w-4" />
          {copy.back}
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 pb-12">
        <section className="frametale-stage-card relative overflow-hidden rounded-[2.4rem] px-8 py-10 sm:px-10 lg:px-12 lg:py-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(24,151,214,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(216,165,90,0.12),transparent_26%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="max-w-4xl">
              <div className="frametale-kicker">{copy.eyebrow}</div>
              <h1
                className="mt-7 text-[2.9rem] font-semibold leading-[0.96] tracking-[-0.05em] sm:text-[4.25rem]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {copy.titleLead}
                <br />
                <span className="text-[var(--sf-blue)]">{copy.titleAccent}</span>
              </h1>
              <p className="mt-6 max-w-3xl text-[15px] leading-8 text-[var(--sf-text-muted)] sm:text-[1.05rem]">
                {copy.body}
              </p>
            </div>

            <div className="inline-flex rounded-full border border-[rgba(117,132,159,0.16)] bg-white/76 p-2 shadow-[0_18px_40px_rgba(23,38,69,0.06)]">
              <span className="rounded-full bg-[var(--sf-blue)] px-4 py-2 text-sm font-semibold text-white">
                {copy.monthly}
              </span>
              <span className="rounded-full px-4 py-2 text-sm font-medium text-[var(--sf-text-muted)]">
                {copy.annual} <span className="text-[var(--sf-blue-strong)]">{copy.annualBadge}</span>
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {copy.plans.map((plan) => {
            const isFeatured = "featured" in plan && plan.featured === true;
            const actionHref = plan.name === "Studio" ? "/contact" : studioHref;

            return (
            <article
              key={plan.name}
              className={`relative overflow-hidden rounded-[2rem] border p-7 shadow-[0_20px_50px_rgba(23,38,69,0.07)] ${
                isFeatured
                  ? "border-sky-300/60 bg-[linear-gradient(180deg,rgba(238,248,255,0.94),rgba(255,255,255,0.95))]"
                  : "border-[rgba(117,132,159,0.16)] bg-white/86"
              }`}
            >
              {isFeatured && (
                <div className="absolute right-0 top-0 rounded-bl-[1.5rem] bg-[var(--sf-blue)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white">
                  Most popular
                </div>
              )}

              <h2 className="text-2xl font-semibold tracking-[-0.03em]">{plan.name}</h2>
              <p className="mt-3 min-h-14 text-sm leading-7 text-[var(--sf-text-muted)]">{plan.description}</p>
              <div className="mt-6 flex items-end gap-2">
                <span className="text-4xl font-semibold tracking-[-0.05em] text-[var(--sf-text)]">
                  {plan.price}
                </span>
                {plan.cadence && <span className="pb-1 text-sm text-[var(--sf-text-soft)]">{plan.cadence}</span>}
              </div>

              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-[var(--sf-text-muted)]">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-900">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link
                  href={actionHref}
                  className={`inline-flex h-12 w-full items-center justify-center rounded-[1rem] px-5 text-sm font-semibold transition hover:-translate-y-0.5 ${
                    isFeatured
                      ? "frametale-primary-button"
                      : "frametale-secondary-button"
                  }`}
                >
                  {plan.action}
                </Link>
              </div>
            </article>
            );
          })}
        </section>

        <section className="grid gap-8 rounded-[2rem] border border-[rgba(117,132,159,0.16)] bg-white/84 px-8 py-10 shadow-[0_20px_50px_rgba(23,38,69,0.07)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <div className="frametale-kicker">{copy.compareTitle}</div>
            <p className="mt-5 text-sm leading-8 text-[var(--sf-text-muted)]">{copy.compareBody}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={studioHref}
                className="frametale-primary-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
              >
                {copy.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="frametale-secondary-button inline-flex items-center rounded-full px-5 py-3 text-sm font-medium transition hover:-translate-y-0.5"
              >
                {copy.ctaSecondary}
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {copy.comparison.map((row) => (
              <div
                key={row.title}
                className="grid gap-4 rounded-[1.5rem] border border-[rgba(117,132,159,0.14)] bg-[rgba(246,249,253,0.82)] p-5 md:grid-cols-4"
              >
                <div className="text-sm font-semibold text-[var(--sf-text)]">{row.title}</div>
                <div className="text-sm leading-7 text-[var(--sf-text-muted)]">{row.starter}</div>
                <div className="text-sm leading-7 text-[var(--sf-blue-strong)]">{row.pro}</div>
                <div className="text-sm leading-7 text-[var(--sf-text-muted)]">{row.studio}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteLegalFooter className="bg-transparent" />
    </div>
  );
}
