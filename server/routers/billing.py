"""Billing APIs for balances, ledger history, manual recharge, and Stripe checkout."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Annotated, Any

import stripe
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.ext.asyncio import AsyncSession

from lib.config.service import ConfigService
from lib.db import get_async_session
from lib.db.models.billing import BillingPaymentOrder
from lib.db.repositories.billing_repo import BillingRepository
from lib.db.repositories.user_repository import UserRepository
from server.auth import CurrentAdmin, CurrentUser
from server.dependencies import get_config_service

router = APIRouter()

STRIPE_DEFAULT_CURRENCY = "SGD"
STRIPE_MIN_TOPUP_AMOUNT = Decimal("1.00")
STRIPE_MAX_TOPUP_AMOUNT = Decimal("10000.00")
STRIPE_AMOUNT_STEP = Decimal("0.01")


class BillingBalanceResponse(BaseModel):
    currency: str
    balance: float
    updated_at: str


class BillingTransactionResponse(BaseModel):
    id: int
    user_id: str
    entry_type: str
    currency: str
    amount: float
    balance_after: float
    description: str | None = None
    source_type: str | None = None
    source_id: str | None = None
    reference_key: str | None = None
    created_at: str
    username: str | None = None
    display_name: str | None = None
    email: str | None = None


class BillingPaymentOrderResponse(BaseModel):
    id: int
    user_id: str
    provider: str
    status: str
    currency: str
    amount: float
    description: str | None = None
    checkout_session_id: str | None = None
    payment_intent_id: str | None = None
    checkout_url: str | None = None
    failed_reason: str | None = None
    fulfilled_at: str | None = None
    created_at: str
    updated_at: str


class BillingSummaryResponse(BaseModel):
    balances: list[BillingBalanceResponse]
    recent_transactions: list[BillingTransactionResponse]
    recent_orders: list[BillingPaymentOrderResponse] = Field(default_factory=list)


class BillingAdminUserResponse(BaseModel):
    user_id: str
    username: str
    email: str | None = None
    display_name: str
    role: str
    balances: list[BillingBalanceResponse]


class BillingAdminOverviewResponse(BaseModel):
    users: list[BillingAdminUserResponse]
    recent_transactions: list[BillingTransactionResponse]


class BillingAdminTopupRequest(BaseModel):
    user_id: str | None = None
    username: str | None = None
    email: str | None = None
    amount: float = Field(gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=8)
    note: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def _validate_target(self) -> BillingAdminTopupRequest:
        if not any([self.user_id, self.username, self.email]):
            raise ValueError("one of user_id, username, or email is required")
        return self


class BillingAdminTopupResponse(BaseModel):
    transaction: BillingTransactionResponse
    balances: list[BillingBalanceResponse]


class BillingCheckoutConfigResponse(BaseModel):
    enabled: bool
    mode: str
    public_app_url: str | None = None
    webhook_endpoint: str | None = None
    currency: str
    min_amount: float
    max_amount: float
    amount_step: float


class BillingCheckoutSessionRequest(BaseModel):
    amount: float = Field(gt=0)
    currency: str = Field(default=STRIPE_DEFAULT_CURRENCY, min_length=3, max_length=8)


class BillingCheckoutSessionResponse(BaseModel):
    order: BillingPaymentOrderResponse
    checkout_url: str


class BillingCheckoutStatusResponse(BaseModel):
    order: BillingPaymentOrderResponse
    stripe_session_status: str | None = None
    stripe_payment_status: str | None = None


def _payment_order_to_payload(order: BillingPaymentOrder) -> dict[str, Any]:
    return {
        "id": order.id,
        "user_id": order.user_id,
        "provider": order.provider,
        "status": order.status,
        "currency": order.currency,
        "amount": round(float(order.amount), 6),
        "description": order.description,
        "checkout_session_id": order.checkout_session_id,
        "payment_intent_id": order.payment_intent_id,
        "checkout_url": order.checkout_url,
        "failed_reason": order.failed_reason,
        "fulfilled_at": order.fulfilled_at.isoformat() if order.fulfilled_at else None,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
    }


def _detect_stripe_mode(secret_key: str) -> str:
    if not secret_key:
        return "disabled"
    return "live" if secret_key.startswith("sk_live_") else "test"


def _resolve_public_app_url(request: Request, configured_public_url: str | None) -> str:
    if configured_public_url:
        return configured_public_url.rstrip("/")
    return str(request.base_url).rstrip("/")


def _stripe_value(obj: Any, key: str) -> Any:
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj.get(key)
    getter = getattr(obj, "get", None)
    if callable(getter):
        try:
            return getter(key)
        except TypeError:
            pass
    return getattr(obj, key, None)


async def _resolve_target_user(
    repo: UserRepository,
    *,
    user_id: str | None,
    username: str | None,
    email: str | None,
):
    if user_id:
        user = await repo.get_by_id(user_id.strip())
        if user is not None:
            return user
    if username:
        user = await repo.get_by_username(username.strip())
        if user is not None:
            return user
    if email:
        user = await repo.get_by_email(email.strip().lower())
        if user is not None:
            return user
    raise HTTPException(status_code=404, detail="Target user not found")


async def _get_stripe_runtime_settings(svc: ConfigService) -> dict[str, str]:
    all_settings = await svc.get_all_settings()
    return {
        "secret_key": (all_settings.get("stripe_secret_key") or "").strip(),
        "webhook_secret": (all_settings.get("stripe_webhook_secret") or "").strip(),
        "public_app_url": (all_settings.get("public_app_url") or "").strip(),
    }


def _require_stripe_secret(settings: dict[str, str]) -> str:
    secret_key = settings["secret_key"]
    if not secret_key:
        raise HTTPException(status_code=503, detail="Stripe secret key is not configured")
    return secret_key


def _normalize_checkout_currency(currency: str | None) -> str:
    normalized = (currency or STRIPE_DEFAULT_CURRENCY).strip().upper()
    if normalized != STRIPE_DEFAULT_CURRENCY:
        raise HTTPException(status_code=400, detail=f"Unsupported Stripe checkout currency: {normalized}")
    return normalized


def _normalize_checkout_amount(amount: float) -> tuple[float, int]:
    try:
        normalized = Decimal(str(amount)).quantize(STRIPE_AMOUNT_STEP, rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid top-up amount") from exc

    if normalized < STRIPE_MIN_TOPUP_AMOUNT or normalized > STRIPE_MAX_TOPUP_AMOUNT:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Top-up amount must be between "
                f"{STRIPE_MIN_TOPUP_AMOUNT} and {STRIPE_MAX_TOPUP_AMOUNT} {STRIPE_DEFAULT_CURRENCY}"
            ),
        )

    return float(normalized), int(normalized * 100)


async def _resolve_payment_order(
    repo: BillingRepository,
    *,
    checkout_session_id: str | None,
    metadata: Any,
) -> BillingPaymentOrder | None:
    if checkout_session_id:
        order = await repo.get_payment_order_by_checkout_session(checkout_session_id)
        if order is not None:
            return order

    order_id = _stripe_value(metadata, "order_id")
    if order_id is None:
        return None
    try:
        return await repo.get_payment_order(int(order_id))
    except (TypeError, ValueError):
        return None


async def _sync_checkout_order_from_session(
    repo: BillingRepository,
    *,
    secret_key: str,
    checkout_session_id: str,
) -> tuple[BillingPaymentOrder, str | None, str | None]:
    stripe.api_key = secret_key
    try:
        checkout_session = stripe.checkout.Session.retrieve(checkout_session_id)
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail=f"Stripe session retrieval failed: {exc}") from exc

    metadata = _stripe_value(checkout_session, "metadata") or {}
    if _stripe_value(metadata, "type") not in {None, "topup"}:
        raise HTTPException(status_code=400, detail="Unsupported checkout session metadata")

    order = await _resolve_payment_order(
        repo,
        checkout_session_id=checkout_session_id,
        metadata=metadata,
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Checkout order not found")

    metadata_user_id = _stripe_value(metadata, "user_id")
    if metadata_user_id and metadata_user_id != order.user_id:
        raise HTTPException(status_code=409, detail="Checkout session metadata does not match payment order")

    payment_status = _stripe_value(checkout_session, "payment_status")
    session_status = _stripe_value(checkout_session, "status")
    payment_intent = _stripe_value(checkout_session, "payment_intent")
    payment_intent_id = payment_intent if isinstance(payment_intent, str) else _stripe_value(payment_intent, "id")

    order.checkout_session_id = checkout_session_id
    order.checkout_url = _stripe_value(checkout_session, "url") or order.checkout_url

    if payment_status and payment_status != "unpaid":
        await repo.fulfill_checkout_order(
            order,
            checkout_session_id=checkout_session_id,
            payment_intent_id=payment_intent_id,
            description=order.description,
        )
    elif session_status == "expired":
        await repo.mark_payment_order_status(order, status="expired", payment_intent_id=payment_intent_id)
    elif session_status == "open":
        await repo.mark_payment_order_status(order, status="open", payment_intent_id=payment_intent_id)

    return order, session_status, payment_status


@router.get("/billing/me", response_model=BillingSummaryResponse)
async def get_my_billing_summary(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
    limit: int = Query(50, ge=1, le=200),
):
    repo = BillingRepository(session)
    return await repo.get_user_summary(current_user.id, limit=limit)


@router.get("/billing/transactions", response_model=list[BillingTransactionResponse])
async def get_my_billing_transactions(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
    limit: int = Query(50, ge=1, le=200),
):
    repo = BillingRepository(session)
    return await repo.list_user_transactions(current_user.id, limit=limit)


@router.get("/billing/checkout/config", response_model=BillingCheckoutConfigResponse)
async def get_billing_checkout_config(
    _user: CurrentUser,
    request: Request,
    svc: Annotated[ConfigService, Depends(get_config_service)],
):
    stripe_settings = await _get_stripe_runtime_settings(svc)
    mode = _detect_stripe_mode(stripe_settings["secret_key"])
    public_app_url = _resolve_public_app_url(request, stripe_settings["public_app_url"] or None)
    enabled = bool(stripe_settings["secret_key"] and stripe_settings["webhook_secret"])
    return {
        "enabled": enabled,
        "mode": mode,
        "public_app_url": public_app_url,
        "webhook_endpoint": f"{public_app_url}/api/v1/billing/stripe/webhook",
        "currency": STRIPE_DEFAULT_CURRENCY,
        "min_amount": float(STRIPE_MIN_TOPUP_AMOUNT),
        "max_amount": float(STRIPE_MAX_TOPUP_AMOUNT),
        "amount_step": float(STRIPE_AMOUNT_STEP),
    }


@router.post("/billing/checkout/session", response_model=BillingCheckoutSessionResponse)
async def create_billing_checkout_session(
    payload: BillingCheckoutSessionRequest,
    current_user: CurrentUser,
    request: Request,
    svc: Annotated[ConfigService, Depends(get_config_service)],
    session: AsyncSession = Depends(get_async_session),
):
    stripe_settings = await _get_stripe_runtime_settings(svc)
    if not stripe_settings["webhook_secret"]:
        raise HTTPException(status_code=503, detail="Stripe webhook secret is not configured")
    secret_key = _require_stripe_secret(stripe_settings)
    currency = _normalize_checkout_currency(payload.currency)
    amount, amount_cents = _normalize_checkout_amount(payload.amount)
    repo = BillingRepository(session)

    public_app_url = _resolve_public_app_url(request, stripe_settings["public_app_url"] or None)
    order = await repo.create_payment_order(
        user_id=current_user.id,
        amount=amount,
        currency=currency,
        provider="stripe",
        description=f"Frametale top-up {amount:.2f} {currency}",
    )

    success_url = f"{public_app_url}/app/billing/return?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{public_app_url}/app/billing/return?status=cancelled"

    stripe.api_key = secret_key
    try:
        checkout_session = stripe.checkout.Session.create(
            mode="payment",
            client_reference_id=current_user.id,
            customer_email=getattr(current_user, "email", None),
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "order_id": str(order.id),
                "user_id": current_user.id,
                "type": "topup",
                "amount": f"{amount:.2f}",
                "currency": currency,
            },
            line_items=[
                {
                    "price_data": {
                        "currency": currency.lower(),
                        "product_data": {
                            "name": "Frametale prepaid balance",
                            "description": f"Top up {amount:.2f} {currency} prepaid balance",
                        },
                        "unit_amount": amount_cents,
                    },
                    "quantity": 1,
                }
            ],
        )
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail=f"Stripe checkout session creation failed: {exc}") from exc

    checkout_session_id = _stripe_value(checkout_session, "id")
    checkout_url = _stripe_value(checkout_session, "url")
    if not checkout_session_id or not checkout_url:
        raise HTTPException(status_code=502, detail="Stripe checkout session creation failed")

    await repo.attach_checkout_session(
        order=order,
        checkout_session_id=checkout_session_id,
        checkout_url=checkout_url,
    )
    await session.commit()
    await session.refresh(order)

    return {
        "order": _payment_order_to_payload(order),
        "checkout_url": checkout_url,
    }


@router.get("/billing/checkout/session-status", response_model=BillingCheckoutStatusResponse)
async def get_billing_checkout_session_status(
    current_user: CurrentUser,
    svc: Annotated[ConfigService, Depends(get_config_service)],
    session_id: Annotated[str, Query(min_length=1, max_length=255)],
    session: AsyncSession = Depends(get_async_session),
):
    repo = BillingRepository(session)
    order = await repo.get_payment_order_by_checkout_session(session_id)
    if order is None or order.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Checkout order not found")

    stripe_settings = await _get_stripe_runtime_settings(svc)
    session_status: str | None = None
    payment_status: str | None = None
    if stripe_settings["secret_key"] and order.status in {"pending", "open"}:
        order, session_status, payment_status = await _sync_checkout_order_from_session(
            repo,
            secret_key=stripe_settings["secret_key"],
            checkout_session_id=session_id,
        )
        await session.commit()
        await session.refresh(order)

    return {
        "order": _payment_order_to_payload(order),
        "stripe_session_status": session_status,
        "stripe_payment_status": payment_status,
    }


@router.post("/billing/stripe/webhook")
async def handle_stripe_webhook(
    request: Request,
    svc: Annotated[ConfigService, Depends(get_config_service)],
    session: AsyncSession = Depends(get_async_session),
):
    stripe_settings = await _get_stripe_runtime_settings(svc)
    if not stripe_settings["webhook_secret"]:
        raise HTTPException(status_code=503, detail="Stripe webhook secret is not configured")

    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")

    try:
        event = stripe.Webhook.construct_event(payload, signature, stripe_settings["webhook_secret"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid Stripe payload: {exc}") from exc
    except stripe.error.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid Stripe signature: {exc}") from exc

    event_type = _stripe_value(event, "type")
    event_data = _stripe_value(event, "data") or {}
    event_object = _stripe_value(event_data, "object")
    checkout_session_id = _stripe_value(event_object, "id")
    if not checkout_session_id:
        return {"received": True}

    repo = BillingRepository(session)
    metadata = _stripe_value(event_object, "metadata") or {}
    if _stripe_value(metadata, "type") not in {None, "topup"}:
        return {"received": True}

    order = await _resolve_payment_order(
        repo,
        checkout_session_id=checkout_session_id,
        metadata=metadata,
    )
    if order is None:
        return {"received": True}

    metadata_user_id = _stripe_value(metadata, "user_id")
    if metadata_user_id and metadata_user_id != order.user_id:
        raise HTTPException(status_code=409, detail="Webhook metadata does not match payment order")

    payment_intent = _stripe_value(event_object, "payment_intent")
    payment_intent_id = payment_intent if isinstance(payment_intent, str) else _stripe_value(payment_intent, "id")

    if event_type in {"checkout.session.completed", "checkout.session.async_payment_succeeded"}:
        await _sync_checkout_order_from_session(
            repo,
            secret_key=_require_stripe_secret(stripe_settings),
            checkout_session_id=checkout_session_id,
        )
    elif event_type == "checkout.session.expired":
        await repo.mark_payment_order_status(order, status="expired", payment_intent_id=payment_intent_id)
    elif event_type == "checkout.session.async_payment_failed":
        await repo.mark_payment_order_status(
            order,
            status="failed",
            payment_intent_id=payment_intent_id,
            failed_reason="Stripe reported async payment failure",
        )

    await session.commit()
    return {"received": True}


@router.get("/billing/admin/overview", response_model=BillingAdminOverviewResponse)
async def get_admin_billing_overview(
    _admin: CurrentAdmin,
    session: AsyncSession = Depends(get_async_session),
    limit: int = Query(100, ge=1, le=500),
):
    repo = BillingRepository(session)
    return await repo.get_admin_overview(limit=limit)


@router.post("/billing/admin/topups", response_model=BillingAdminTopupResponse)
async def create_admin_topup(
    payload: BillingAdminTopupRequest,
    admin_user: CurrentAdmin,
    session: AsyncSession = Depends(get_async_session),
):
    user_repo = UserRepository(session)
    target_user = await _resolve_target_user(
        user_repo,
        user_id=payload.user_id,
        username=payload.username,
        email=payload.email,
    )
    billing_repo = BillingRepository(session)

    note = payload.note.strip() if payload.note else None
    transaction = await billing_repo.topup_user(
        user_id=target_user.id,
        amount=payload.amount,
        currency=payload.currency.strip().upper(),
        description=note or f"Manual recharge by {admin_user.username or admin_user.sub}",
    )
    await session.commit()

    balances = await billing_repo.list_user_balances(target_user.id)
    transaction_payload = next(
        item
        for item in await billing_repo.list_user_transactions(target_user.id, limit=20)
        if item["id"] == transaction.id
    )
    return {
        "transaction": transaction_payload,
        "balances": balances,
    }
