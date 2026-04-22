import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";

import { API } from "@/api";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SiteLegalFooter } from "@/components/legal/SiteLegalFooter";
import type { BillingCheckoutStatusResponse } from "@/types";

function formatMoney(amount: number, currency: string, isZh: boolean): string {
  try {
    return new Intl.NumberFormat(isZh ? "zh-CN" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function BillingReturnPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const sessionId = params.get("session_id");
  const status = params.get("status");
  const isZh = navigator.language.toLowerCase().startsWith("zh");

  const [loading, setLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState("");
  const [checkoutStatus, setCheckoutStatus] = useState<BillingCheckoutStatusResponse | null>(null);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let cancelled = false;

    void API.getBillingCheckoutSessionStatus(sessionId)
      .then((res) => {
        if (!cancelled) {
          setCheckoutStatus(res);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load checkout status");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const amountLabel = checkoutStatus
    ? formatMoney(checkoutStatus.order.amount, checkoutStatus.order.currency, isZh)
    : "";

  const headline = (() => {
    if (status === "cancelled" && !sessionId) {
      return isZh ? "支付已取消" : "Checkout cancelled";
    }
    if (checkoutStatus?.order.status === "paid") {
      return isZh ? "充值已到账" : "Top-up completed";
    }
    if (checkoutStatus?.order.status === "failed") {
      return isZh ? "支付失败" : "Payment failed";
    }
    if (checkoutStatus?.order.status === "expired") {
      return isZh ? "支付会话已过期" : "Checkout session expired";
    }
    return isZh ? "正在确认支付结果" : "Confirming payment";
  })();

  const body = (() => {
    if (status === "cancelled" && !sessionId) {
      return isZh
        ? "你已离开 Stripe Checkout，本次充值不会入账。"
        : "You left Stripe Checkout before payment completion, so no balance was added.";
    }
    if (checkoutStatus?.order.status === "paid") {
      return isZh
        ? `${amountLabel} 已通过 Stripe 成功充值到你的预付费余额。`
        : `${amountLabel} has been credited to your prepaid balance through Stripe.`;
    }
    if (checkoutStatus?.order.status === "failed") {
      return isZh
        ? "Stripe 返回了失败状态，请重新发起一次充值。"
        : "Stripe reported a failed payment. Start a new checkout attempt to retry.";
    }
    if (checkoutStatus?.order.status === "expired") {
      return isZh
        ? "该支付会话已经过期，请重新创建一个新的充值订单。"
        : "This checkout session has expired. Create a new top-up order to continue.";
    }
    return isZh
      ? "系统正在等待 Stripe webhook 或同步确认，这通常只需要几秒。"
      : "The system is waiting for the Stripe webhook or sync confirmation, which usually takes a few seconds.";
  })();

  return (
    <div className="sf-editorial-page flex min-h-screen flex-col px-6 py-8 text-[var(--sf-text)]">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center">
        <section className="sf-panel-strong rounded-[2rem] p-8 text-center">
          <BrandLogo alt="Frametale" className="mx-auto h-14 w-auto max-w-[17rem]" />

          <div className="mt-8 flex justify-center">
            {loading ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(24,151,214,0.08)] text-[var(--sf-blue)]">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : checkoutStatus?.order.status === "paid" ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <XCircle className="h-6 w-6" />
              </div>
            )}
          </div>

          <h1
            className="mt-6 text-[2rem] font-semibold tracking-[-0.04em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {headline}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--sf-text-muted)]">
            {error || body}
          </p>

          {checkoutStatus && (
            <div className="mx-auto mt-6 max-w-xl rounded-[1.4rem] border border-[rgba(117,132,159,0.18)] bg-[rgba(248,250,253,0.92)] p-5 text-left">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--sf-text-soft)]">
                {isZh ? "订单状态" : "Order status"}
              </div>
              <div className="mt-3 space-y-2 text-sm text-[var(--sf-text-muted)]">
                <div>{isZh ? "订单号" : "Order"}: #{checkoutStatus.order.id}</div>
                <div>{isZh ? "金额" : "Amount"}: {amountLabel}</div>
                <div>{isZh ? "状态" : "Status"}: {checkoutStatus.order.status}</div>
                {checkoutStatus.order.checkout_session_id && (
                  <div className="break-all">Stripe Session: {checkoutStatus.order.checkout_session_id}</div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setLocation("/app/account")}
              className="frametale-primary-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
            >
              <ArrowLeft className="h-4 w-4" />
              {isZh ? "返回账户中心" : "Back to account"}
            </button>
            <button
              type="button"
              onClick={() => setLocation("/app/projects")}
              className="frametale-secondary-button rounded-full px-5 py-3 text-sm font-medium transition hover:-translate-y-0.5"
            >
              {isZh ? "返回工作台" : "Back to studio"}
            </button>
          </div>
        </section>
      </div>

      <SiteLegalFooter className="mt-8 bg-transparent" contentClassName="max-w-3xl px-0 py-5" />
    </div>
  );
}
