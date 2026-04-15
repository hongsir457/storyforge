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
      title={t("auth:home_hero_title")}
      description={t("auth:home_hero_body")}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white">{t("auth:login")}</h2>
        <p className="mt-2 text-sm text-slate-400">{t("dashboard:app_subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label={t("auth:email_or_username")}
          value={identifier}
          onChange={setIdentifier}
          autoFocus
          type="text"
        />
        <Field label={t("auth:password")} value={password} onChange={setPassword} type="password" />

        {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        {verificationEmail && (
          <Link
            href={`/verify-email?email=${encodeURIComponent(verificationEmail)}`}
            className="block rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 transition hover:bg-amber-500/15"
          >
            {t("auth:verify_email_now")}
          </Link>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
        >
          {loading ? t("auth:logging_in") : t("auth:login")}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
        <span>{t("auth:no_account")}</span>
        <Link href="/register" className="font-medium text-sky-300 transition hover:text-sky-200">
          {t("auth:go_to_register")}
        </Link>
      </div>
      <div className="mt-3 text-right text-sm">
        <Link href="/forgot-password" className="text-slate-300 transition hover:text-white">
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
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400/60 focus:bg-white/8"
        autoFocus={autoFocus}
        required
      />
    </label>
  );
}
