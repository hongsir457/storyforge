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
      title={t("forgot_password")}
      description={t("forgot_password_hint")}
    >
      {step === "request" ? (
        <form onSubmit={(e) => void requestCode(e)} className="space-y-4">
          <Field label={t("email")} value={email} onChange={setEmail} />
          {error && <Notice tone="error">{error}</Notice>}
          {notice && <Notice tone="success">{notice}</Notice>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
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
            className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
          >
            {loading ? t("resetting_password") : t("reset_password")}
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-sm text-slate-400">
        <Link href="/login" className="text-sky-300 transition hover:text-sky-200">
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
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400/60 focus:bg-white/8"
        required
      />
    </label>
  );
}

function Notice({ children, tone }: { children: string; tone: "error" | "success" }) {
  const className = tone === "error"
    ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
    : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  return <p className={`rounded-xl border px-3 py-2 text-sm ${className}`}>{children}</p>;
}
