"""SMTP-based email delivery helpers."""

from __future__ import annotations

import asyncio
import logging
import os
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class MailerConfig:
    host: str
    port: int
    username: str
    password: str
    from_email: str
    from_name: str
    use_tls: bool
    debug_log_only: bool

    @property
    def enabled(self) -> bool:
        if self.debug_log_only:
            return True
        return bool(self.host and self.port and self.from_email)


def get_mailer_config() -> MailerConfig:
    return MailerConfig(
        host=os.environ.get("SMTP_HOST", "").strip(),
        port=int(os.environ.get("SMTP_PORT", "587") or "587"),
        username=os.environ.get("SMTP_USERNAME", "").strip(),
        password=os.environ.get("SMTP_PASSWORD", "").strip(),
        from_email=os.environ.get("SMTP_FROM_EMAIL", "").strip(),
        from_name=os.environ.get("SMTP_FROM_NAME", "Frametale").strip() or "Frametale",
        use_tls=os.environ.get("SMTP_USE_TLS", "true").strip().lower() not in {"0", "false", "no"},
        debug_log_only=os.environ.get("AUTH_EMAIL_DEBUG", "false").strip().lower() in {"1", "true", "yes"},
    )


async def send_email(*, to_email: str, subject: str, body: str, html_body: str | None = None) -> None:
    config = get_mailer_config()
    if not config.enabled:
        raise RuntimeError("Email delivery is not configured")

    if config.debug_log_only:
        logger.warning("AUTH_EMAIL_DEBUG enabled. Email to %s | %s | %s", to_email, subject, body)
        return

    message = EmailMessage()
    sender = f"{config.from_name} <{config.from_email}>" if config.from_name else config.from_email
    message["From"] = sender
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    def _deliver() -> None:
        with smtplib.SMTP(config.host, config.port, timeout=30) as smtp:
            if config.use_tls:
                smtp.starttls()
            if config.username:
                smtp.login(config.username, config.password)
            smtp.send_message(message)

    await asyncio.to_thread(_deliver)
