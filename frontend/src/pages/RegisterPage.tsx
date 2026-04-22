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
      title="为你的叙事工作间建立一个清晰入口。"
      description="注册完成后，Frametale 会把小说工作台、项目库和工作区都收进同一品牌系统里。"
    >
      <div className="mb-7">
        <div className="frametale-kicker">Create Workspace</div>
        <h2
          className="mt-4 text-[2rem] font-semibold tracking-[-0.04em] text-[var(--sf-text)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("create_account")}
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--sf-text-muted)]">
          创建后即可从 seed 启动小说流程，或直接进入项目库继续做视觉资产。
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <Field label={t("username")} value={form.username} onChange={(value) => setForm((curr) => ({ ...curr, username: value }))} />
        <Field label={t("email")} value={form.email} onChange={(value) => setForm((curr) => ({ ...curr, email: value }))} />
        <Field label={t("display_name")} value={form.display_name} onChange={(value) => setForm((curr) => ({ ...curr, display_name: value }))} />
        <Field label={t("password")} value={form.password} onChange={(value) => setForm((curr) => ({ ...curr, password: value }))} type="password" />
        <Field label={t("confirm_password")} value={form.confirm_password} onChange={(value) => setForm((curr) => ({ ...curr, confirm_password: value }))} type="password" />

        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="success">{notice}</Notice>}

        <button
          type="submit"
          disabled={loading}
          className="frametale-primary-button w-full rounded-[1rem] px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          {loading ? t("registering") : t("create_account")}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm text-[var(--sf-text-muted)]">
        <span>{t("have_account")}</span>
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
  tone: "error" | "success";
}) {
  const className = tone === "error"
    ? "border-rose-300/55 bg-rose-100/72 text-rose-900"
    : "border-emerald-300/55 bg-emerald-100/72 text-emerald-900";

  return <p className={`rounded-[1rem] border px-4 py-3 text-sm ${className}`}>{children}</p>;
}
