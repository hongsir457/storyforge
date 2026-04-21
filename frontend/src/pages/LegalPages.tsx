import type { ReactNode } from "react";
import { ArrowLeft, ExternalLink, Mail, Scale, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SiteLegalFooter } from "@/components/legal/SiteLegalFooter";

const LEGAL_PAGE_COPY = {
  en: {
    back: "Back Home",
    privacy: {
      eyebrow: "Privacy",
      title: "Privacy Policy",
      intro:
        "Storyforge stores the minimum account, project, and runtime data needed to authenticate users, run creative jobs, and keep the studio stable.",
      sections: [
        {
          title: "What we collect",
          body:
            "We may store account identifiers, email verification state, project metadata, generated assets, job logs, and operational diagnostics required to run the product.",
        },
        {
          title: "How we use data",
          body:
            "Data is used to authenticate access, execute novel and video workflows, preserve project continuity, respond to support requests, and improve reliability.",
        },
        {
          title: "How data is shared",
          body:
            "Storyforge does not sell user data. Information is only shared with infrastructure or model providers when that is necessary to deliver the requested generation or hosting service.",
        },
      ],
    },
    terms: {
      eyebrow: "Terms",
      title: "Terms of Service",
      intro:
        "Use Storyforge lawfully, respect intellectual property, and review generated output before publishing or distributing it.",
      sections: [
        {
          title: "Acceptable use",
          body:
            "Do not use the product for unlawful conduct, harassment, security abuse, deceptive media, or content that violates platform, provider, or jurisdictional rules.",
        },
        {
          title: "Content responsibility",
          body:
            "You are responsible for the prompts, uploaded assets, project material, and generated outputs associated with your account or deployment.",
        },
        {
          title: "Service changes",
          body:
            "Administrators may adjust access, quotas, providers, and runtime limits. We may suspend abusive usage when needed to protect users and infrastructure.",
        },
      ],
    },
    contact: {
      eyebrow: "Contact",
      title: "Contact Us",
      intro:
        "For support, privacy requests, or legal notices, use the channels below so the request reaches the right owner quickly.",
      sections: [
        {
          title: "Product support",
          body:
            "For bug reports or product issues, open a GitHub issue or contact the deployment administrator that manages your Storyforge environment.",
        },
        {
          title: "Privacy and legal requests",
          body:
            "For data access, deletion, or policy questions, contact the administrator of the deployment you are using. Self-hosted operators are the primary controllers of their own data.",
        },
        {
          title: "Preferred public channel",
          body:
            "GitHub Issues remains the clearest public contact point for repository-level feedback, defect reports, and contributor coordination.",
        },
      ],
      actions: {
        repo: "Open GitHub Issues",
        repoHref: "https://github.com/hongsir457/storyforge/issues",
      },
    },
  },
  zh: {
    back: "返回首页",
    privacy: {
      eyebrow: "Privacy",
      title: "隐私政策",
      intro:
        "Storyforge 只保存账号鉴权、项目运行、生成任务与系统稳定性所必需的最小数据集合。",
      sections: [
        {
          title: "我们会收集什么",
          body:
            "我们可能保存账号标识、邮箱验证状态、项目元数据、生成产物、任务日志，以及为保障服务稳定所需的运行诊断信息。",
        },
        {
          title: "我们如何使用数据",
          body:
            "这些数据仅用于身份验证、执行小说与视频工作流、保持项目连续性、处理支持请求，以及提升系统可靠性。",
        },
        {
          title: "我们如何共享数据",
          body:
            "Storyforge 不出售用户数据。只有在完成模型推理、文件托管或基础设施服务确有必要时，才会向相关服务商传递最小必要信息。",
        },
      ],
    },
    terms: {
      eyebrow: "Terms",
      title: "服务条款",
      intro:
        "请合法使用 Storyforge，尊重知识产权，并在发布或分发生成内容前自行完成审核。",
      sections: [
        {
          title: "允许的使用范围",
          body:
            "不得将产品用于违法行为、骚扰、安全攻击、欺骗性媒体、侵犯他人权益，或任何违反平台、模型供应商与适用法律规则的内容。",
        },
        {
          title: "内容责任",
          body:
            "与你的账号或部署相关的提示词、上传素材、项目内容与生成结果，均由你或对应部署管理员自行负责。",
        },
        {
          title: "服务调整",
          body:
            "管理员可以调整访问权限、额度、模型供应商与运行限制。为保护用户与基础设施，平台可能对滥用行为采取限制或停用措施。",
        },
      ],
    },
    contact: {
      eyebrow: "Contact",
      title: "联系我们",
      intro:
        "如需产品支持、隐私请求或法务沟通，请通过下面的方式联系到正确的维护方。",
      sections: [
        {
          title: "产品支持",
          body:
            "如果需要反馈缺陷或产品问题，请优先提交 GitHub Issue，或联系你当前所使用部署的管理员。",
        },
        {
          title: "隐私与法务请求",
          body:
            "如需数据访问、删除或政策说明，请联系当前部署管理员。对于自托管环境，部署方是其自身数据的主要控制者。",
        },
        {
          title: "公开联系渠道",
          body:
            "对于仓库级反馈、缺陷追踪与贡献协作，GitHub Issues 仍然是最清晰的公共入口。",
        },
      ],
      actions: {
        repo: "打开 GitHub Issues",
        repoHref: "https://github.com/hongsir457/storyforge/issues",
      },
    },
  },
} as const;

type LegalLocale = keyof typeof LEGAL_PAGE_COPY;
type LegalPageKey = "privacy" | "terms" | "contact";

function useLegalPageLocale(): LegalLocale {
  const { i18n } = useTranslation();
  return (i18n.resolvedLanguage ?? i18n.language ?? "").startsWith("zh") ? "zh" : "en";
}

function LegalPageFrame({
  pageKey,
  icon,
  extraAction,
}: {
  pageKey: LegalPageKey;
  icon: ReactNode;
  extraAction?: ReactNode;
}) {
  const { t } = useTranslation(["dashboard"]);
  const locale = useLegalPageLocale();
  const copy = LEGAL_PAGE_COPY[locale][pageKey];
  const shared = LEGAL_PAGE_COPY[locale];

  return (
    <div className="storyforge-public-shell flex min-h-screen flex-col text-[var(--sf-text)]">
      <div className="landing-grid pointer-events-none" />
      <div className="landing-orb landing-orb-a" />
      <div className="landing-orb landing-orb-b" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-7">
        <Link href="/" className="rounded-[1.7rem] transition-transform hover:-translate-y-0.5">
          <BrandLogo alt={t("dashboard:app_title")} className="h-14 w-auto max-w-[17rem]" />
        </Link>
        <Link
          href="/"
          className="storyforge-secondary-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
          {shared.back}
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 pb-12 pt-2">
        <section className="storyforge-stage-card relative w-full overflow-hidden rounded-[2.4rem] p-8 sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(24,151,214,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(216,165,90,0.12),transparent_24%)]" />

          <div className="relative">
            <div className="storyforge-kicker">
              {icon}
              {copy.eyebrow}
            </div>

            <div className="mt-8 max-w-4xl">
              <h1
                className="text-[2.8rem] font-semibold leading-[0.96] tracking-[-0.05em] sm:text-[3.8rem] lg:text-[4.8rem]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {copy.title}
              </h1>
              <p className="mt-6 max-w-3xl text-[15px] leading-8 text-[var(--sf-text-muted)] sm:text-[1.05rem]">
                {copy.intro}
              </p>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {copy.sections.map((section) => (
                <article
                  key={section.title}
                  className="rounded-[1.7rem] border border-[rgba(117,132,159,0.16)] bg-white/76 p-5 shadow-[0_18px_40px_rgba(23,38,69,0.06)]"
                >
                  <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--sf-text)]">
                    {section.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--sf-text-muted)]">
                    {section.body}
                  </p>
                </article>
              ))}
            </div>

            {extraAction && <div className="mt-8">{extraAction}</div>}
          </div>
        </section>
      </main>

      <SiteLegalFooter className="bg-transparent" />
    </div>
  );
}

export function PrivacyPage() {
  return <LegalPageFrame pageKey="privacy" icon={<Shield className="h-3.5 w-3.5" />} />;
}

export function TermsPage() {
  return <LegalPageFrame pageKey="terms" icon={<Scale className="h-3.5 w-3.5" />} />;
}

export function ContactPage() {
  const locale = useLegalPageLocale();
  const copy = LEGAL_PAGE_COPY[locale].contact;

  return (
    <LegalPageFrame
      pageKey="contact"
      icon={<Mail className="h-3.5 w-3.5" />}
      extraAction={
        <a
          href={copy.actions.repoHref}
          target="_blank"
          rel="noreferrer"
          className="storyforge-primary-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
        >
          {copy.actions.repo}
          <ExternalLink className="h-4 w-4" />
        </a>
      }
    />
  );
}
