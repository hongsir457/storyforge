import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { API } from "@/api";
import { useAuthStore } from "@/stores/auth-store";

export function AccountPage() {
  const { t } = useTranslation("auth");
  const [, setLocation] = useLocation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);

  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [error, setError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setDisplayName(user?.display_name ?? "");
  }, [user?.display_name]);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setError("");
    setProfileNotice("");
    try {
      const updated = await API.updateProfile({ display_name: displayName });
      updateUser(updated);
      setProfileNotice(t("profile_saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login_failed"));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setError("");
    setPasswordNotice("");
    try {
      const result = await API.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordNotice(result.message || t("password_changed_success"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login_failed"));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 px-6 py-10 text-gray-100">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-sky-300/70">Storyforge</p>
            <h1 className="mt-2 text-3xl font-semibold">{t("account_settings")}</h1>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setLocation("/app/projects")}
              className="rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              {t("enter_studio")}
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                setLocation("/login");
              }}
              className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20"
            >
              {t("logout")}
            </button>
          </div>
        </div>

        {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">{t("save_profile")}</h2>
            <div className="mt-4 grid gap-4 text-sm text-slate-300">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{t("username")}</div>
                <div className="mt-2 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3">{user?.username}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{t("email")}</div>
                <div className="mt-2 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3">{user?.email}</div>
              </div>
            </div>

            <form onSubmit={saveProfile} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">{t("display_name")}</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-sky-400/60"
                  required
                />
              </label>
              {profileNotice && <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{profileNotice}</p>}
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
              >
                {savingProfile ? t("saving") : t("save_profile")}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">{t("change_password")}</h2>
            <form onSubmit={savePassword} className="mt-5 space-y-4">
              <PasswordField label={t("current_password")} value={currentPassword} onChange={setCurrentPassword} />
              <PasswordField label={t("new_password")} value={newPassword} onChange={setNewPassword} />
              {passwordNotice && <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{passwordNotice}</p>}
              <button
                type="submit"
                disabled={savingPassword}
                className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
              >
                {savingPassword ? t("saving") : t("change_password")}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

function PasswordField({
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
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-sky-400/60"
        required
      />
    </label>
  );
}
