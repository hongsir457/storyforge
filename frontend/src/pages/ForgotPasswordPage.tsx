import { useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { API } from "@/api";
import { PublicShell } from "@/components/auth/PublicShell";

export function ForgotPasswordPage() {
  const { t } = useTranslation(["auth", "dashboard"]);
  const [, setLocation] = useLocation();
  const initialEmail = useMemo(() => {
    const params = new URLSearchParams(globalThis.location.search);
    return params.get("email") ?? "";
  }, []);

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"request" | "reset">("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const requestCode = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await API.forgotPassword(email);
      setNotice(result.message || t("forgot_password_hint"));
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login_failed"));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      if (newPassword !== confirmPassword) {
        throw new Error(t("auth:passwords_do_not_match"));
      }
      const result = await API.resetPassword(email, code, newPassword);
      setNotice(result.message || t("reset_password_success"));
      setTimeout(() => setLocation("/login"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login_failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell
      eyebrow={t("dashboard:app_title")}
      title="重置入口保持清晰，不让用户在认证流程里迷路。"
      description={t("forgot_password_hint")}
    >
      <div className="mb-7">
        <div className="storyforge-kicker">Password Reset</div>
        <h2
          className="mt-4 text-[2rem] font-semibold tracking-[-0.04em] text-[var(--sf-text)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("forgot_password")}
        </h2>
      </div>

      {step === "request" ? (
        <form onSubmit={(e) => void requestCode(e)} className="space-y-4">
          <Field label={t("email")} value={email} onChange={setEmail} />
          {error && <Notice tone="error">{error}</Notice>}
          {notice && <Notice tone="success">{notice}</Notice>}
          <button
            type="submit"
            disabled={loading}
            className="storyforge-primary-button w-full rounded-[1rem] px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
          >
            {loading ? t("sending_code") : t("send_reset_code")}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => void resetPassword(e)} className="space-y-4">
          <Field label={t("email")} value={email} onChange={setEmail} />
          <Field label={t("verification_code")} value={code} onChange={setCode} />
          <Field label={t("new_password")} value={newPassword} onChange={setNewPassword} type="password" />
          <Field label={t("confirm_password")} value={confirmPassword} onChange={setConfirmPassword} type="password" />
          {error && <Notice tone="error">{error}</Notice>}
          {notice && <Notice tone="success">{notice}</Notice>}
          <button
            type="submit"
            disabled={loading}
            className="storyforge-primary-button w-full rounded-[1rem] px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
          >
            {loading ? t("resetting_password") : t("reset_password")}
          </button>
        </form>
      )}

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
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
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
