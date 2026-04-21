import { useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { API } from "@/api";
import { PublicShell } from "@/components/auth/PublicShell";
import { useAuthStore } from "@/stores/auth-store";

function emailDeliveryNotice(
  delivery: string,
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (delivery === "unavailable") return t("email_delivery_unavailable");
  if (delivery === "failed") return t("email_delivery_failed");
  return "";
}

export function VerifyEmailPage() {
  const { t } = useTranslation(["auth", "dashboard"]);
  const [, setLocation] = useLocation();
  const login = useAuthStore((s) => s.login);
  const initialEmail = useMemo(() => {
    const params = new URLSearchParams(globalThis.location.search);
    return params.get("email") ?? "";
  }, []);
  const initialDelivery = useMemo(() => {
    const params = new URLSearchParams(globalThis.location.search);
    return params.get("delivery") ?? "";
  }, []);

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(emailDeliveryNotice(initialDelivery, t));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await API.confirmEmailVerification(email, code);
      login(data.access_token, data.user);
      setLocation("/app/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login_failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    setNotice("");
    try {
      const result = await API.requestEmailVerification(email);
      setNotice(emailDeliveryNotice(result.email_delivery ?? "", t) || result.message || t("registration_success"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login_failed"));
    } finally {
      setResending(false);
    }
  };

  return (
    <PublicShell
      eyebrow={t("dashboard:app_title")}
      title="验证这一步要让用户放心，而不是像一段后台流程。"
      description={t("verification_hint", { email: email || "your email" })}
    >
      <div className="mb-7">
        <div className="storyforge-kicker">Trust Surface</div>
        <h2
          className="mt-4 text-[2rem] font-semibold tracking-[-0.04em] text-[var(--sf-text)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("verify_email")}
        </h2>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <Field label={t("email")} value={email} onChange={setEmail} />
        <Field label={t("verification_code")} value={code} onChange={setCode} />

        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="success">{notice}</Notice>}

        <button
          type="submit"
          disabled={loading}
          className="storyforge-primary-button w-full rounded-[1rem] px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          {loading ? t("verifying_email") : t("verify_email")}
        </button>
      </form>

      <button
        type="button"
        onClick={() => void handleResend()}
        disabled={resending}
        className="storyforge-secondary-button mt-4 w-full rounded-[1rem] px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
      >
        {resending ? t("sending_code") : t("resend_code")}
      </button>

      <div className="mt-6 text-center text-sm text-[var(--sf-text-muted)]">
        <Link href="/login" className="font-semibold text-[var(--sf-blue)] transition hover:text-[var(--sf-blue-strong)]">
          {t("go_to_login")}
        </Link>
      </div>
    </PublicShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--sf-text-soft)]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="storyforge-input w-full rounded-[1rem] px-4 py-3.5 text-[15px] outline-none transition"
        required
      />
    </label>
  );
}

function Notice({ children, tone }: { children: string; tone: "error" | "success" }) {
  const className = tone === "error"
    ? "border-rose-300/55 bg-rose-100/72 text-rose-900"
    : "border-emerald-300/55 bg-emerald-100/72 text-emerald-900";
  return <p className={`rounded-[1rem] border px-4 py-3 text-sm ${className}`}>{children}</p>;
}
