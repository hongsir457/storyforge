import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { API } from "@/api";
import { PublicShell } from "@/components/auth/PublicShell";
import { useAuthStore } from "@/stores/auth-store";

export function LoginPage() {
  const { t } = useTranslation(["auth", "dashboard"]);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setVerificationEmail("");
    setLoading(true);

    try {
      const data = await API.login(identifier, password);
      login(data.access_token, data.user);
      setLocation("/app/projects");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth:login_failed");
      setError(message);
      const normalized = identifier.trim().toLowerCase();
      setVerificationEmail(
        message.toLowerCase().includes("verify your email") && normalized.includes("@") ? normalized : "",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell
      eyebrow={t("dashboard:app_title")}
      title="从故事入口回到你的工作台。"
      description="登录后继续推进 seed、项目库、角色资产和分镜生成。认证页保持直接、可信，不再塞入假社交入口。"
    >
      <div className="mb-7">
        <div className="frametale-kicker">Welcome Back</div>
        <h2
          className="mt-4 text-[2rem] font-semibold tracking-[-0.04em] text-[var(--sf-text)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("auth:login")}
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--sf-text-muted)]">
          {t("dashboard:app_subtitle")}
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <Field
          label={t("auth:email_or_username")}
          value={identifier}
          onChange={setIdentifier}
          type="text"
        />
        <Field label={t("auth:password")} value={password} onChange={setPassword} type="password" />

        {error && <Notice tone="error">{error}</Notice>}
        {verificationEmail && (
          <Link
            href={`/verify-email?email=${encodeURIComponent(verificationEmail)}`}
            className="block rounded-[1rem] border border-amber-300/55 bg-amber-100/65 px-4 py-3 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
          >
            {t("auth:verify_email_now")}
          </Link>
        )}

        <button
          type="submit"
          disabled={loading}
          className="frametale-primary-button w-full rounded-[1rem] px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          {loading ? t("auth:logging_in") : t("auth:login")}
        </button>
      </form>

      <div className="mt-6 text-right text-sm">
        <Link href="/forgot-password" className="text-[var(--sf-text-muted)] transition hover:text-[var(--sf-text)]">
          {t("auth:forgot_password")}
        </Link>
      </div>
    </PublicShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--sf-text-soft)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="frametale-input w-full rounded-[1rem] px-4 py-3.5 text-[15px] outline-none transition"
        required
      />
    </label>
  );
}

function Notice({
  children,
  tone,
}: {
  children: string;
  tone: "error";
}) {
  if (tone === "error") {
    return (
      <p className="rounded-[1rem] border border-rose-300/55 bg-rose-100/72 px-4 py-3 text-sm text-rose-900">
        {children}
      </p>
    );
  }

  return null;
}
