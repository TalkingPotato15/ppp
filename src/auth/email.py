"""SMTP email service for password reset."""

import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import aiosmtplib

from src.config.settings import settings


logger = logging.getLogger(__name__)


class EmailError(Exception):
    """Exception raised for email-related errors."""

    pass


async def send_password_reset_email(email: str, reset_token: str) -> None:
    """Send a password reset email.

    Args:
        email: Recipient email address.
        reset_token: Password reset token.

    Raises:
        EmailError: If email sending fails.
    """
    if not settings.smtp_host:
        logger.warning("SMTP not configured, skipping password reset email")
        raise EmailError("Email service is not configured")

    reset_url = f"{settings.frontend_url}/auth/reset-password/{reset_token}"

    # Create message
    message = MIMEMultipart("alternative")
    message["Subject"] = "Reset Your Password - AI Agent Business Builder"
    message["From"] = settings.smtp_from_email
    message["To"] = email

    # Plain text version
    text_content = f"""
Hello,

You requested to reset your password for AI Agent Business Builder.

Click the link below to reset your password:
{reset_url}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

Best regards,
AI Agent Business Builder Team
"""

    # HTML version
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .button {{
            display: inline-block;
            padding: 12px 24px;
            background-color: #4F46E5;
            color: white !important;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
        }}
        .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class="container">
        <h2>Reset Your Password</h2>
        <p>Hello,</p>
        <p>You requested to reset your password for AI Agent Business Builder.</p>
        <p>Click the button below to reset your password:</p>
        <a href="{reset_url}" class="button">Reset Password</a>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="{reset_url}">{reset_url}</a></p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <div class="footer">
            <p>Best regards,<br>AI Agent Business Builder Team</p>
        </div>
    </div>
</body>
</html>
"""

    message.attach(MIMEText(text_content, "plain"))
    message.attach(MIMEText(html_content, "html"))

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_username,
            password=settings.smtp_password,
            start_tls=settings.smtp_use_tls,
        )
        logger.info(f"Password reset email sent to {email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email to {email}: {e}")
        raise EmailError(f"Failed to send email: {e}") from e
