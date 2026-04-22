import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, CreditCard, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { API } from "@/api";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SiteLegalFooter } from "@/components/legal/SiteLegalFooter";
import { useAuthStore } from "@/stores/auth-store";
import type { BillingCheckoutConfig, BillingSummary, BillingTransaction } from "@/types";

export function AccountPage() {
  const { t, i18n } = useTranslation(["auth", "dashboard"]);
  const [, setLocation] = useLocation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);

  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [verificationNotice, setVerificationNotice] = useState("");
  const [error, setError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState("");
  const [checkoutConfig, setCheckoutConfig] = useState<BillingCheckoutConfig | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(true);
  const [checkoutError, setCheckoutError] = useState("");
  const [startingCheckoutId, setStartingCheckoutId] = useState("");

  const isZh = useMemo(() => (i18n.resolvedLanguage ?? i18n.language ?? "").startsWith("zh"), [i18n.language, i18n.resolvedLanguage]);

  useEffect(() => {
    setDisplayName(user?.display_name ?? "");
  }, [user?.display_name]);

  useEffect(() => {
    let cancelled = false;
    setBillingLoading(true);
    setBillingError("");

    void API.getBillingSummary()
      .then((summary) => {
        if (!cancelled) {
          setBillingSummary(summary);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setBillingError(err instanceof Error ? err.message : "Failed to load billing summary");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBillingLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    setCheckoutLoading(true);
    setCheckoutError("");

    void API.getBillingCheckoutConfig()
      .then((config) => {
        if (!cancelled) {
          setCheckoutConfig(config);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCheckoutError(err instanceof Error ? err.message : "Failed to load checkout config");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCheckoutLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const startCheckout = async (packageId: string) => {
    setStartingCheckoutId(packageId);
    setCheckoutError("");
    try {
      const res = await API.createBillingCheckoutSession({ package_id: packageId });
      globalThis.location.assign(res.checkout_url);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Failed to start Stripe checkout");
      setStartingCheckoutId("");
    }
  };

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
      if (newPassword !== confirmPassword) {
        throw new Error(t("auth:passwords_do_not_match"));
      }
      const result = await API.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice(result.message || t("password_changed_success"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login_failed"));
    } finally {
      setSavingPassword(false);
    }
  };

  const resendVerification = async () => {
    if (!user?.email) return;
    setSendingVerification(true);
    setError("");
    setVerificationNotice("");
    try {
      const result = await API.requestEmailVerification(user.email);
      setVerificationNotice(result.message || t("verification_email_sent"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login_failed"));
    } finally {
      setSendingVerification(false);
    }
  };

  return (
    <div className="sf-editorial-page flex min-h-screen flex-col px-6 py-8 text-[var(--sf-text)]">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col space-y-6">
        <header className="storyforge-page-header flex flex-col gap-5 rounded-[2rem] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => setLocation("/app/projects")}
              className="storyforge-secondary-button inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:-translate-y-0.5"
              aria-label={t("enter_studio")}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="space-y-2">
              <BrandLogo alt={t("dashboard:app_title")} className="h-14 w-auto max-w-[17rem]" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--sf-text-soft)]">
                  Account Surface
                </p>
                <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.04em]" style={{ fontFamily: "var(--font-display)" }}>
                  {t("account_settings")}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--sf-text-muted)]">
                  账号信息、邮箱验证和密码管理统一放在一个清晰的品牌页面里。
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setLocation("/app/projects")}
              className="storyforge-secondary-button rounded-full px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5"
            >
              {t("enter_studio")}
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                setLocation("/login");
              }}
              className="rounded-full border border-rose-300/55 bg-rose-100/72 px-4 py-2.5 text-sm font-medium text-rose-900 transition hover:-translate-y-0.5"
            >
              {t("logout")}
            </button>
          </div>
        </header>

        {error && <Notice tone="error">{error}</Notice>}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="sf-panel-strong rounded-[2rem] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(24,151,214,0.08)] text-[var(--sf-blue)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--sf-text)]">{t("save_profile")}</h2>
                <p className="text-sm text-[var(--sf-text-muted)]">基础身份信息与邮箱信任状态。</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 text-sm text-[var(--sf-text-muted)]">
              <DetailBlock label={t("username")} value={user?.username ?? "-"} />
              <DetailBlock label={t("email")} value={user?.email ?? "-"} />

              <div className="rounded-[1.4rem] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">
                      {t("email_verification_status")}
                    </div>
                    <div
                      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        user?.is_email_verified
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {user?.is_email_verified ? t("verified") : t("unverified")}
                    </div>
                  </div>
                  {!user?.is_email_verified && user?.email && (
                    <button
                      type="button"
                      onClick={() => void resendVerification()}
                      disabled={sendingVerification}
                      className="storyforge-secondary-button rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
                    >
                      {sendingVerification ? t("sending_code") : t("resend_verification_code")}
                    </button>
                  )}
                </div>
                {!user?.is_email_verified && (
                  <p className="mt-3 text-sm leading-6 text-[var(--sf-text-muted)]">{t("verification_required_notice")}</p>
                )}
                {verificationNotice && <Notice tone="success" className="mt-3">{verificationNotice}</Notice>}
              </div>
            </div>

            <form onSubmit={(e) => void saveProfile(e)} className="mt-6 space-y-4">
              <Field
                label={t("display_name")}
                value={displayName}
                onChange={setDisplayName}
                type="text"
              />
              {profileNotice && <Notice tone="success">{profileNotice}</Notice>}
              <button
                type="submit"
                disabled={savingProfile}
                className="storyforge-primary-button rounded-[1rem] px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
              >
                {savingProfile ? t("saving") : t("save_profile")}
              </button>
            </form>
          </section>

          <section className="sf-panel rounded-[2rem] p-6">
            <h2 className="text-xl font-semibold text-[var(--sf-text)]">{t("change_password")}</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--sf-text-muted)]">
              这里保留最必要的安全动作，不额外塞入系统级配置。
            </p>
            <form onSubmit={(e) => void savePassword(e)} className="mt-6 space-y-4">
              <Field label={t("current_password")} value={currentPassword} onChange={setCurrentPassword} type="password" />
              <Field label={t("new_password")} value={newPassword} onChange={setNewPassword} type="password" />
              <Field label={t("confirm_password")} value={confirmPassword} onChange={setConfirmPassword} type="password" />
              {passwordNotice && <Notice tone="success">{passwordNotice}</Notice>}
              <button
                type="submit"
                disabled={savingPassword}
                className="storyforge-primary-button rounded-[1rem] px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
              >
                {savingPassword ? t("saving") : t("change_password")}
              </button>
            </form>
          </section>
        </div>

        <section className="sf-panel-strong rounded-[2rem] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(24,151,214,0.08)] text-[var(--sf-blue)]">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--sf-text)]">
                {isZh ? "余额与账单" : "Balance and billing"}
              </h2>
              <p className="text-sm text-[var(--sf-text-muted)]">
                {isZh
                  ? "查看当前余额，以及系统按真实 API 成本写入的充值与扣费流水。"
                  : "Review your balance and the recharge or usage events recorded against real API costs."}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[1.6rem] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">
                  <CreditCard className="h-3.5 w-3.5" />
                  Stripe Checkout
                </div>
                <h3 className="text-lg font-semibold text-[var(--sf-text)]">
                  {isZh ? "实时充值" : "Top up instantly"}
                </h3>
                <p className="max-w-2xl text-sm leading-7 text-[var(--sf-text-muted)]">
                  {isZh
                    ? "直接跳转到 Stripe 托管收银台，支付成功后通过 webhook 幂等入账。"
                    : "Jump to Stripe hosted checkout. Successful payments are credited through an idempotent webhook flow."}
                </p>
              </div>
              {checkoutConfig?.mode && checkoutConfig.mode !== "disabled" && (
                <span className="rounded-full bg-[rgba(24,151,214,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sf-blue-strong)]">
                  {checkoutConfig.mode}
                </span>
              )}
            </div>

            {checkoutError && <Notice tone="error" className="mt-4">{checkoutError}</Notice>}

            {checkoutLoading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-[var(--sf-text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isZh ? "正在加载 Stripe 充值包..." : "Loading Stripe checkout packages..."}
              </div>
            ) : checkoutConfig?.enabled ? (
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {checkoutConfig.packages.map((pkg) => {
                  const busy = startingCheckoutId === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      className="rounded-[1.3rem] border border-[rgba(117,132,159,0.18)] bg-white/90 p-4 shadow-[0_18px_40px_rgba(23,38,69,0.04)]"
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">
                        {pkg.label}
                      </div>
                      <div className="mt-3 text-[1.8rem] font-semibold tracking-[-0.03em] text-[var(--sf-text)]">
                        {formatMoney(pkg.amount, pkg.currency, isZh)}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--sf-text-muted)]">{pkg.description}</p>
                      <button
                        type="button"
                        onClick={() => void startCheckout(pkg.id)}
                        disabled={Boolean(startingCheckoutId)}
                        className="storyforge-primary-button mt-4 w-full rounded-[1rem] px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
                      >
                        {busy
                          ? (isZh ? "跳转中..." : "Redirecting...")
                          : (isZh ? "前往 Stripe 支付" : "Pay with Stripe")}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[var(--sf-text-muted)]">
                {isZh
                  ? "管理员还没有完成 Stripe secret key / webhook secret 配置，所以当前不能发起实付充值。"
                  : "Stripe secret and webhook configuration are still missing, so hosted checkout is not available yet."}
              </p>
            )}
          </div>

          {billingError && <Notice tone="error" className="mt-4">{billingError}</Notice>}

          {billingLoading ? (
            <div className="mt-5 flex items-center gap-2 text-sm text-[var(--sf-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isZh ? "正在加载账单信息..." : "Loading billing summary..."}
            </div>
          ) : (
            <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">
                  {isZh ? "余额" : "Balance"}
                </div>
                {billingSummary?.balances.length ? (
                  billingSummary.balances.map((balance) => (
                    <div
                      key={balance.currency}
                      className="rounded-[1.4rem] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4"
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">
                        {balance.currency}
                      </div>
                      <div className="mt-3 text-[1.8rem] font-semibold tracking-[-0.03em] text-[var(--sf-text)]">
                        {formatMoney(balance.balance, balance.currency, isZh)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.4rem] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4 text-sm text-[var(--sf-text-muted)]">
                    {isZh ? "当前还没有充值或扣费记录。" : "No billing movements yet."}
                  </div>
                )}
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">
                  {isZh ? "最近流水" : "Recent ledger"}
                </div>
                <div className="mt-3 space-y-3">
                  {billingSummary?.recent_transactions.length ? (
                    billingSummary.recent_transactions.map((tx) => (
                      <TransactionRow key={tx.id} tx={tx} isZh={isZh} />
                    ))
                  ) : (
                    <div className="rounded-[1.4rem] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4 text-sm text-[var(--sf-text-muted)]">
                      {isZh ? "还没有可展示的账本流水。" : "No ledger events to show yet."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <SiteLegalFooter className="mt-8 bg-transparent" contentClassName="max-w-6xl px-0 py-5" />
    </div>
  );
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">{label}</div>
      <div className="mt-2 rounded-[1rem] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] px-4 py-3 text-[var(--sf-text)]">
        {value}
      </div>
    </div>
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
        className="storyforge-input w-full rounded-[1rem] px-4 py-3.5 text-[15px] outline-none transition"
        required
      />
    </label>
  );
}

function Notice({
  children,
  tone,
  className,
}: {
  children: string;
  tone: "error" | "success";
  className?: string;
}) {
  const base = tone === "error"
    ? "border-rose-300/55 bg-rose-100/72 text-rose-900"
    : "border-emerald-300/55 bg-emerald-100/72 text-emerald-900";
  return <p className={`rounded-[1rem] border px-4 py-3 text-sm ${base} ${className ?? ""}`}>{children}</p>;
}

function formatMoney(amount: number, currency: string, isZh: boolean): string {
  try {
    return new Intl.NumberFormat(isZh ? "zh-CN" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 4,
    }).format(amount);
  } catch {
    return `${amount.toFixed(4)} ${currency}`;
  }
}

function TransactionRow({
  tx,
  isZh,
}: {
  tx: BillingTransaction;
  isZh: boolean;
}) {
  const credit = tx.amount > 0;
  const signedAmount = `${credit ? "+" : ""}${formatMoney(tx.amount, tx.currency, isZh)}`;

  return (
    <div className="rounded-[1.4rem] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${
              credit ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-[var(--sf-text)]">{tx.description ?? tx.entry_type}</div>
            <div className="mt-1 text-sm text-[var(--sf-text-muted)]">
              {new Date(tx.created_at).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-semibold ${credit ? "text-emerald-700" : "text-amber-700"}`}>
            {signedAmount}
          </div>
          <div className="mt-1 text-xs text-[var(--sf-text-soft)]">
            {isZh ? "余额" : "Balance"}: {formatMoney(tx.balance_after, tx.currency, isZh)}
          </div>
        </div>
      </div>
    </div>
  );
}
