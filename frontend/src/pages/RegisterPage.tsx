import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { API } from "@/api";
import { PublicShell } from "@/components/auth/PublicShell";

function emailDeliveryNotice(
  delivery: "sent" | "debug_logged" | "unavailable" | "failed",
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (delivery === "unavailable") return t("email_delivery_unavailable");
  if (delivery === "failed") return t("email_delivery_failed");
  return t("registration_success");
}

export function RegisterPage() {
  const { t } = useTranslation(["auth", "dashboard"]);
  const [form, setForm] = useState({
    username: "",
    email: "",
    display_name: "",
    password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      if (form.password !== form.confirm_password) {
        throw new Error(t("auth:passwords_do_not_match"));
      }

      const result = await API.register({
        username: form.username,
        email: form.email,
        display_name: form.display_name,
        password: form.password,
      });
      setNotice(emailDeliveryNotice(result.email_delivery, t));
      setLocation(
        `/verify-email?email=${encodeURIComponent(result.email)}&delivery=${encodeURIComponent(result.email_delivery)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login_failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell
      eyebrow={t("dashboard:app_title")}
      title={t("create_account")}
      description={t("home_hero_body")}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <Field label={t("username")} value={form.username} onChange={(value) => setForm((curr) => ({ ...curr, username: value }))} />
        <Field label={t("email")} value={form.email} onChange={(value) => setForm((curr) => ({ ...curr, email: value }))} />
        <Field label={t("display_name")} value={form.display_name} onChange={(value) => setForm((curr) => ({ ...curr, display_name: value }))} />
        <Field label={t("password")} value={form.password} onChange={(value) => setForm((curr) => ({ ...curr, password: value }))} type="password" />
        <Field label={t("confirm_password")} value={form.confirm_password} onChange={(value) => setForm((curr) => ({ ...curr, confirm_password: value }))} type="password" />

        {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        {notice && <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{notice}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
        >
          {loading ? t("registering") : t("create_account")}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
        <span>{t("have_account")}</span>
        <Link href="/login" className="font-medium text-sky-300 transition hover:text-sky-200">
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
