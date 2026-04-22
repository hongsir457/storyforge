"""Repository helpers for billing balances and ledger transactions."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from sqlalchemy import Select, desc, select

from lib.db.base import dt_to_iso, utc_now
from lib.db.models.billing import BillingAccount, BillingPaymentOrder, BillingTransaction
from lib.db.models.user import User
from lib.db.repositories.base import BaseRepository


def _round_amount(value: float) -> float:
    return round(float(value), 6)


def _account_to_dict(row: BillingAccount) -> dict[str, Any]:
    return {
        "currency": row.currency,
        "balance": _round_amount(row.balance),
        "updated_at": row.updated_at.isoformat(),
    }


def _transaction_to_dict(row: BillingTransaction) -> dict[str, Any]:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "entry_type": row.entry_type,
        "currency": row.currency,
        "amount": _round_amount(row.amount),
        "balance_after": _round_amount(row.balance_after),
        "description": row.description,
        "source_type": row.source_type,
        "source_id": row.source_id,
        "reference_key": row.reference_key,
        "created_at": row.created_at.isoformat(),
    }


def _payment_order_to_dict(row: BillingPaymentOrder) -> dict[str, Any]:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "provider": row.provider,
        "status": row.status,
        "currency": row.currency,
        "amount": _round_amount(row.amount),
        "description": row.description,
        "checkout_session_id": row.checkout_session_id,
        "payment_intent_id": row.payment_intent_id,
        "checkout_url": row.checkout_url,
        "failed_reason": row.failed_reason,
        "fulfilled_at": dt_to_iso(row.fulfilled_at),
        "created_at": row.created_at.isoformat(),
        "updated_at": row.updated_at.isoformat(),
    }


class BillingRepository(BaseRepository):
    async def _get_account(self, *, user_id: str, currency: str) -> BillingAccount | None:
        stmt = self._scope_query(
            select(BillingAccount).where(BillingAccount.user_id == user_id, BillingAccount.currency == currency),
            BillingAccount,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_or_create_account(self, *, user_id: str, currency: str) -> BillingAccount:
        account = await self._get_account(user_id=user_id, currency=currency)
        if account is not None:
            return account

        account = BillingAccount(user_id=user_id, currency=currency, balance=0.0)
        self.session.add(account)
        await self.session.flush()
        await self.session.refresh(account)
        return account

    async def get_transaction_by_reference(self, reference_key: str) -> BillingTransaction | None:
        stmt = self._scope_query(
            select(BillingTransaction).where(BillingTransaction.reference_key == reference_key),
            BillingTransaction,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def apply_transaction(
        self,
        *,
        user_id: str,
        amount: float,
        currency: str,
        entry_type: str,
        description: str | None = None,
        source_type: str | None = None,
        source_id: str | None = None,
        reference_key: str | None = None,
    ) -> BillingTransaction:
        currency_code = (currency or "USD").strip().upper()
        rounded_amount = _round_amount(amount)
        if rounded_amount == 0.0:
            raise ValueError("billing transaction amount cannot be zero")

        if reference_key:
            existing = await self.get_transaction_by_reference(reference_key)
            if existing is not None:
                return existing

        account = await self._get_or_create_account(user_id=user_id, currency=currency_code)
        account.balance = _round_amount(account.balance + rounded_amount)

        tx = BillingTransaction(
            user_id=user_id,
            account_id=account.id,
            entry_type=entry_type,
            currency=currency_code,
            amount=rounded_amount,
            balance_after=account.balance,
            description=description,
            source_type=source_type,
            source_id=source_id,
            reference_key=reference_key,
        )
        self.session.add(tx)
        await self.session.flush()
        await self.session.refresh(tx)
        return tx

    async def topup_user(
        self,
        *,
        user_id: str,
        amount: float,
        currency: str,
        description: str | None = None,
        reference_key: str | None = None,
        source_type: str = "admin_topup",
        source_id: str | None = None,
    ) -> BillingTransaction:
        return await self.apply_transaction(
            user_id=user_id,
            amount=abs(amount),
            currency=currency,
            entry_type="topup",
            description=description or "Admin recharge",
            source_type=source_type,
            source_id=source_id or user_id,
            reference_key=reference_key,
        )

    async def charge_api_call(
        self,
        *,
        user_id: str,
        api_call_id: int,
        amount: float,
        currency: str,
        description: str | None = None,
    ) -> BillingTransaction | None:
        if amount <= 0:
            return None
        return await self.apply_transaction(
            user_id=user_id,
            amount=-abs(amount),
            currency=currency,
            entry_type="charge",
            description=description or f"API usage charge #{api_call_id}",
            source_type="api_call",
            source_id=str(api_call_id),
            reference_key=f"api_call:{api_call_id}",
        )

    async def list_user_balances(self, user_id: str) -> list[dict[str, Any]]:
        stmt = self._scope_query(
            select(BillingAccount).where(BillingAccount.user_id == user_id).order_by(BillingAccount.currency.asc()),
            BillingAccount,
        )
        rows = (await self.session.execute(stmt)).scalars().all()
        return [_account_to_dict(row) for row in rows]

    async def list_user_transactions(self, user_id: str, *, limit: int = 50) -> list[dict[str, Any]]:
        stmt = self._scope_query(
            select(BillingTransaction)
            .where(BillingTransaction.user_id == user_id)
            .order_by(desc(BillingTransaction.created_at), desc(BillingTransaction.id))
            .limit(limit),
            BillingTransaction,
        )
        rows = (await self.session.execute(stmt)).scalars().all()
        return [_transaction_to_dict(row) for row in rows]

    async def create_payment_order(
        self,
        *,
        user_id: str,
        amount: float,
        currency: str,
        provider: str = "stripe",
        description: str | None = None,
    ) -> BillingPaymentOrder:
        order = BillingPaymentOrder(
            user_id=user_id,
            provider=provider,
            status="pending",
            currency=(currency or "USD").strip().upper(),
            amount=_round_amount(amount),
            description=description,
        )
        self.session.add(order)
        await self.session.flush()
        await self.session.refresh(order)
        return order

    async def get_payment_order(self, order_id: int) -> BillingPaymentOrder | None:
        stmt = self._scope_query(
            select(BillingPaymentOrder).where(BillingPaymentOrder.id == order_id),
            BillingPaymentOrder,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_payment_order_by_checkout_session(self, checkout_session_id: str) -> BillingPaymentOrder | None:
        stmt = self._scope_query(
            select(BillingPaymentOrder).where(BillingPaymentOrder.checkout_session_id == checkout_session_id),
            BillingPaymentOrder,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_user_payment_orders(self, user_id: str, *, limit: int = 20) -> list[dict[str, Any]]:
        stmt = self._scope_query(
            select(BillingPaymentOrder)
            .where(BillingPaymentOrder.user_id == user_id)
            .order_by(desc(BillingPaymentOrder.created_at), desc(BillingPaymentOrder.id))
            .limit(limit),
            BillingPaymentOrder,
        )
        rows = (await self.session.execute(stmt)).scalars().all()
        return [_payment_order_to_dict(row) for row in rows]

    async def attach_checkout_session(
        self,
        *,
        order: BillingPaymentOrder,
        checkout_session_id: str,
        checkout_url: str | None,
    ) -> BillingPaymentOrder:
        order.checkout_session_id = checkout_session_id
        order.checkout_url = checkout_url
        order.status = "open"
        await self.session.flush()
        await self.session.refresh(order)
        return order

    async def mark_payment_order_status(
        self,
        order: BillingPaymentOrder,
        *,
        status: str,
        payment_intent_id: str | None = None,
        failed_reason: str | None = None,
    ) -> BillingPaymentOrder:
        order.status = status
        if payment_intent_id:
            order.payment_intent_id = payment_intent_id
        order.failed_reason = failed_reason
        if status == "paid" and order.fulfilled_at is None:
            order.fulfilled_at = utc_now()
        await self.session.flush()
        await self.session.refresh(order)
        return order

    async def fulfill_checkout_order(
        self,
        order: BillingPaymentOrder,
        *,
        checkout_session_id: str | None = None,
        payment_intent_id: str | None = None,
        description: str | None = None,
    ) -> BillingTransaction:
        session_id = checkout_session_id or order.checkout_session_id or str(order.id)
        reference_key = f"stripe_checkout:{session_id}"
        transaction = await self.topup_user(
            user_id=order.user_id,
            amount=order.amount,
            currency=order.currency,
            description=description or order.description or "Stripe checkout top-up",
            reference_key=reference_key,
            source_type="stripe_checkout",
            source_id=session_id,
        )
        order.status = "paid"
        order.checkout_session_id = checkout_session_id or order.checkout_session_id
        if payment_intent_id:
            order.payment_intent_id = payment_intent_id
        if order.fulfilled_at is None:
            order.fulfilled_at = utc_now()
        order.failed_reason = None
        await self.session.flush()
        await self.session.refresh(order)
        return transaction

    async def get_payment_order_by_transaction_reference(self, reference_key: str) -> BillingPaymentOrder | None:
        transaction = await self.get_transaction_by_reference(reference_key)
        if transaction is None or transaction.source_id is None:
            return None
        return await self.get_payment_order_by_checkout_session(transaction.source_id)

    async def get_user_summary(self, user_id: str, *, limit: int = 50) -> dict[str, Any]:
        balances = await self.list_user_balances(user_id)
        transactions = await self.list_user_transactions(user_id, limit=limit)
        orders = await self.list_user_payment_orders(user_id, limit=10)
        return {
            "balances": balances,
            "recent_transactions": transactions,
            "recent_orders": orders,
        }

    async def get_admin_overview(self, *, limit: int = 100) -> dict[str, Any]:
        users_stmt: Select = self._scope_query(select(User).order_by(User.created_at.asc()), User)
        balance_stmt: Select = self._scope_query(
            select(BillingAccount).order_by(BillingAccount.user_id.asc(), BillingAccount.currency.asc()),
            BillingAccount,
        )
        tx_stmt: Select = self._scope_query(
            select(BillingTransaction, User)
            .join(User, User.id == BillingTransaction.user_id)
            .order_by(desc(BillingTransaction.created_at), desc(BillingTransaction.id))
            .limit(limit),
            BillingTransaction,
        )

        users = list((await self.session.execute(users_stmt)).scalars().all())
        balances = list((await self.session.execute(balance_stmt)).scalars().all())
        tx_rows = (await self.session.execute(tx_stmt)).all()

        balances_by_user: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in balances:
            balances_by_user[row.user_id].append(_account_to_dict(row))

        users_payload = [
            {
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "display_name": user.display_name,
                "role": user.role,
                "balances": balances_by_user.get(user.id, []),
            }
            for user in users
        ]

        transactions = []
        for tx, user in tx_rows:
            item = _transaction_to_dict(tx)
            item["username"] = user.username
            item["display_name"] = user.display_name
            item["email"] = user.email
            transactions.append(item)

        return {
            "users": users_payload,
            "recent_transactions": transactions,
        }
