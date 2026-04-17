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
      title={t("verify_email")}
      description={t("verification_hint", { email: email || "your email" })}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <Field label={t("email")} value={email} onChange={setEmail} />
        <Field label={t("verification_code")} value={code} onChange={setCode} />

        {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        {notice && <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{notice}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
        >
          {loading ? t("verifying_email") : t("verify_email")}
        </button>
      </form>

      <button
        type="button"
        onClick={() => void handleResend()}
        disabled={resending}
        className="mt-4 w-full rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10 disabled:opacity-60"
      >
        {resending ? t("sending_code") : t("resend_code")}
      </button>

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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-sky-400/60 focus:bg-white/8"
        required
      />
    </label>
  );
}
