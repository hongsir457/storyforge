import { useTranslation } from "react-i18next";
import { Link } from "wouter";

const LEGAL_FOOTER_COPY = {
  en: {
    brand: "Frametale.",
    rights: "© 2026 Frametale. All rights reserved.",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    contact: "Contact Us",
  },
  zh: {
    brand: "Frametale.",
    rights: "© 2026 叙影工厂，保留所有权利。",
    privacy: "隐私政策",
    terms: "服务条款",
    contact: "联系我们",
  },
} as const;

type LegalFooterLocale = keyof typeof LEGAL_FOOTER_COPY;

function useLegalFooterCopy() {
  const { i18n } = useTranslation();
  const locale: LegalFooterLocale =
    (i18n.resolvedLanguage ?? i18n.language ?? "").startsWith("zh") ? "zh" : "en";
  return LEGAL_FOOTER_COPY[locale];
}

interface SiteLegalFooterProps {
  className?: string;
  contentClassName?: string;
  textClassName?: string;
  brandClassName?: string;
  navClassName?: string;
  linkClassName?: string;
}

export function SiteLegalFooter({
  className,
  contentClassName,
  textClassName,
  brandClassName,
  navClassName,
  linkClassName,
}: SiteLegalFooterProps) {
  const copy = useLegalFooterCopy();

  return (
    <footer
      className={`border-t border-[rgba(117,132,159,0.12)] bg-white/58 backdrop-blur-sm ${className ?? ""}`}
    >
      <div
        className={`mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 text-xs sm:flex-row sm:items-center sm:justify-between ${contentClassName ?? ""}`}
      >
        <p
          className={`flex flex-wrap items-center gap-2 text-[11px] text-[var(--sf-text-soft)] ${textClassName ?? ""}`}
        >
          <span className={`font-semibold text-[var(--sf-text)] ${brandClassName ?? ""}`}>
            {copy.brand}
          </span>
          <span>{copy.rights}</span>
        </p>

        <nav
          className={`flex flex-wrap items-center gap-6 text-[11px] text-[var(--sf-text-soft)] ${navClassName ?? ""}`}
        >
          <Link
            href="/privacy"
            className={`transition-colors hover:text-[var(--sf-blue-strong)] ${linkClassName ?? ""}`}
          >
            {copy.privacy}
          </Link>
          <Link
            href="/terms"
            className={`transition-colors hover:text-[var(--sf-blue-strong)] ${linkClassName ?? ""}`}
          >
            {copy.terms}
          </Link>
          <Link
            href="/contact"
            className={`transition-colors hover:text-[var(--sf-blue-strong)] ${linkClassName ?? ""}`}
          >
            {copy.contact}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
