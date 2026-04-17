"""
app/utils/email_utils.py — Email Sending Utilities
All emails use Flask-Mail with HTML templates rendered inline.
"""

import logging
from urllib.parse import quote
from flask import current_app
from flask_mail import Message

logger = logging.getLogger(__name__)


def _mail():
    """Return the Flask-Mail extension from app context."""
    from app import mail
    return mail


def send_email(to: str, subject: str, html_body: str) -> bool:
    """Low-level helper — send one email. Returns True on success."""
    try:
        msg = Message(
            subject=subject,
            recipients=[to],
            html=html_body,
        )
        _mail().send(msg)
        logger.info(f"Email sent to {to}: {subject}")
        return True
    except Exception as exc:
        logger.error(f"Failed to send email to {to}: {exc}", exc_info=True)
        return False


# ─────────────────────────────────────────────────────────────────
#  Email templates
# ─────────────────────────────────────────────────────────────────

def _base_template(title: str, body_html: str) -> str:
    """Wrap any content in the VaidyaMed-X branded email shell."""
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f0faf4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:16px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1b4332,#2d6a4f);
                     padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:1.6rem;letter-spacing:-0.5px;">
              🌿 VaidyaMed-X
            </h1>
            <p style="margin:6px 0 0;color:#95d5b2;font-size:0.85rem;">
              Ayurvedic AI Health Companion
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            {body_html}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fdf9;padding:20px 40px;text-align:center;
                     border-top:1px solid #e8f5e9;">
            <p style="margin:0;font-size:0.75rem;color:#888;">
              This email was sent by VaidyaMed-X. Please do not reply directly.<br/>
              If you did not request this, you can safely ignore it.
            </p>
            <p style="margin:10px 0 0;font-size:0.72rem;color:#95d5b2;font-style:italic;">
              स्वस्थस्य स्वास्थ्य रक्षणं, आतुरस्य विकार प्रशमनम्
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""


def send_otp_email(to: str, name: str, otp: str,
                   purpose: str = 'verification') -> bool:
    """Send a 6-digit OTP email for registration or 2FA."""
    purpose_labels = {
        'registration': ('Verify Your Email', 'complete your registration'),
        'verification':  ('Verify Your Email', 'verify your account'),
        '2fa':           ('Login Verification Code', 'complete your login'),
        'resend':        ('New Verification Code', 'verify your account'),
        'doctor_invite': ('Doctor Invitation Code', 'continue your hospital invitation'),
    }
    subject, action = purpose_labels.get(purpose, ('Verification Code', 'verify your account'))

    body = f"""
<h2 style="margin:0 0 8px;color:#1b4332;font-size:1.3rem;">Hello, {name} 👋</h2>
<p style="margin:0 0 24px;color:#555;font-size:0.95rem;line-height:1.6;">
  Use the verification code below to {action} on VaidyaMed-X.
</p>

<div style="background:#f0faf4;border:2px dashed #52b788;border-radius:12px;
            padding:28px;text-align:center;margin:0 0 24px;">
  <p style="margin:0 0 8px;font-size:0.8rem;color:#52b788;
             font-weight:600;text-transform:uppercase;letter-spacing:1px;">
    Your Verification Code
  </p>
  <p style="margin:0;font-size:3rem;font-weight:800;
             color:#1b4332;letter-spacing:12px;line-height:1;">
    {otp}
  </p>
</div>

<p style="margin:0 0 8px;font-size:0.85rem;color:#888;">
  ⏱ This code expires in <strong>10 minutes</strong>.
</p>
<p style="margin:0;font-size:0.85rem;color:#e74c3c;">
  🔒 Never share this code with anyone — VaidyaMed-X will never ask for it.
</p>
"""
    return send_email(to, f"VaidyaMed-X — {subject}", _base_template(subject, body))


def send_hospital_invitation_email(
    to: str,
    doctor_name: str,
    hospital_name: str,
    invite_url: str,
    is_registered: bool = False,
) -> bool:
    """Send hospital affiliation invitation link to a doctor email."""
    heading = "Hospital Affiliation Request"
    action_line = (
        "A hospital admin invited you to join their VaidyaMed-X facility dashboard."
    )
    cta = "Accept Invitation"
    next_step = (
        "Since your doctor account already exists, you can accept this invite directly."
        if is_registered
        else "If you are new to VaidyaMed-X, complete doctor registration first, then verify your email to auto-link this hospital."
    )

    body = f"""
<h2 style="margin:0 0 8px;color:#1b4332;font-size:1.3rem;">Hello Dr. {doctor_name or 'Doctor'} 👋</h2>
<p style="margin:0 0 20px;color:#555;font-size:0.95rem;line-height:1.6;">
  <strong>{hospital_name}</strong> has sent you a doctor affiliation invitation on VaidyaMed-X.
</p>

<div style="background:#f0faf4;border-left:4px solid #52b788;border-radius:8px;padding:16px 20px;margin:0 0 20px;">
  <p style="margin:0;color:#1b4332;font-size:0.92rem;line-height:1.6;">
    {action_line}
  </p>
</div>

<div style="text-align:center;margin:28px 0;">
  <a href="{invite_url}"
     style="display:inline-block;background:linear-gradient(135deg,#52b788,#2d6a4f);
            color:#fff;text-decoration:none;padding:14px 36px;border-radius:50px;
            font-weight:600;font-size:0.95rem;">
    {cta} →
  </a>
</div>

<p style="margin:0 0 8px;font-size:0.85rem;color:#555;">
  {next_step}
</p>
<p style="margin:0;font-size:0.8rem;color:#888;">
  ⏱ For security, this invitation link expires in 48 hours.
</p>

<p style="margin:16px 0 0;font-size:0.75rem;color:#aaa;word-break:break-all;">
  Direct link: {invite_url}
</p>
"""
    return send_email(
        to,
        f"VaidyaMed-X — {heading}",
        _base_template(heading, body),
    )


def send_welcome_email(to: str, name: str, role: str) -> bool:
    """Send a welcome email after successful email verification."""
    role_label = 'Doctor' if role == 'doctor' else 'Patient'
    body = f"""
<h2 style="margin:0 0 8px;color:#1b4332;font-size:1.3rem;">
  Welcome to VaidyaMed-X, {name}! 🎉
</h2>
<p style="margin:0 0 20px;color:#555;font-size:0.95rem;line-height:1.6;">
  Your email has been verified and your <strong>{role_label}</strong> account is now active.
</p>

<div style="background:#f0faf4;border-left:4px solid #52b788;
            border-radius:8px;padding:16px 20px;margin:0 0 24px;">
  <p style="margin:0;font-size:0.9rem;color:#1b4332;line-height:1.7;">
    {"🌿 You can now book consultations, track your health, and access Ayurvedic AI insights." if role == "patient" else "👨‍⚕️ You can now manage your practice, accept consultations, and access the clinical dashboard."}
  </p>
</div>

<div style="text-align:center;margin:28px 0;">
  <a href="{current_app.config['FRONTEND_URL']}/login"
     style="display:inline-block;background:linear-gradient(135deg,#52b788,#2d6a4f);
            color:#fff;text-decoration:none;padding:14px 36px;border-radius:50px;
            font-weight:600;font-size:0.95rem;">
    Login to Your Account →
  </a>
</div>
"""
    return send_email(to, "Welcome to VaidyaMed-X! 🌿", _base_template("Welcome", body))


def send_password_reset_email(
    to: str,
    name: str,
    reset_token: str,
    login_path: str = '/login',
) -> bool:
    """Send a password reset link."""
    frontend_url = current_app.config['FRONTEND_URL']
    safe_login_path = login_path if login_path.startswith('/') else '/login'
    encoded_login_path = quote(safe_login_path, safe='')
    reset_url = (
        f"{frontend_url}/reset-password"
        f"?token={reset_token}&login={encoded_login_path}"
    )
    body = f"""
<h2 style="margin:0 0 8px;color:#1b4332;font-size:1.3rem;">Reset Your Password 🔑</h2>
<p style="margin:0 0 20px;color:#555;font-size:0.95rem;line-height:1.6;">
  Hello <strong>{name}</strong>, we received a request to reset your VaidyaMed-X password.
  Click the button below to set a new password.
</p>

<div style="text-align:center;margin:28px 0;">
  <a href="{reset_url}"
     style="display:inline-block;background:linear-gradient(135deg,#52b788,#2d6a4f);
            color:#fff;text-decoration:none;padding:14px 36px;border-radius:50px;
            font-weight:600;font-size:0.95rem;">
    Reset My Password →
  </a>
</div>

<p style="margin:0 0 8px;font-size:0.85rem;color:#888;">
  ⏱ This link expires in <strong>30 minutes</strong>.
</p>
<p style="margin:0;font-size:0.85rem;color:#e74c3c;">
  🔒 If you did not request a password reset, please ignore this email.
</p>

<p style="margin:20px 0 0;font-size:0.78rem;color:#aaa;word-break:break-all;">
  Or copy this link: {reset_url}
</p>
"""
    return send_email(to, "VaidyaMed-X — Reset Your Password", _base_template("Reset Password", body))


def send_verification_email(to: str, name: str, verify_token: str) -> bool:
    """Send email verification link (token-based)."""
    frontend_url  = current_app.config['FRONTEND_URL']
    verify_url    = f"{frontend_url}/verify-email?token={verify_token}"
    body = f"""
<h2 style="margin:0 0 8px;color:#1b4332;font-size:1.3rem;">Verify Your Email 📧</h2>
<p style="margin:0 0 20px;color:#555;font-size:0.95rem;line-height:1.6;">
  Hello <strong>{name}</strong>, click the button below to verify your email and activate
  your VaidyaMed-X account.
</p>

<div style="text-align:center;margin:28px 0;">
  <a href="{verify_url}"
     style="display:inline-block;background:linear-gradient(135deg,#52b788,#2d6a4f);
            color:#fff;text-decoration:none;padding:14px 36px;border-radius:50px;
            font-weight:600;font-size:0.95rem;">
    Verify My Email →
  </a>
</div>

<p style="margin:0;font-size:0.85rem;color:#888;">
  ⏱ This link is valid for <strong>24 hours</strong>.
</p>
<p style="margin:8px 0 0;font-size:0.78rem;color:#aaa;word-break:break-all;">
  Or paste this link in your browser: {verify_url}
</p>
"""
    return send_email(to, "VaidyaMed-X — Verify Your Email", _base_template("Verify Email", body))


def send_upi_confirmation_email(to: str, name: str, upi_id: str) -> bool:
    """Notify doctor that their UPI ID was updated."""
    body = f"""
<h2 style="margin:0 0 8px;color:#1b4332;font-size:1.3rem;">UPI ID Updated 💸</h2>
<p style="margin:0 0 20px;color:#555;font-size:0.95rem;line-height:1.6;">
  Hello Dr. <strong>{name}</strong>, your UPI ID has been updated to:
</p>
<div style="background:#f0faf4;border:2px solid #52b788;border-radius:10px;
            padding:16px;text-align:center;margin:0 0 20px;">
  <p style="margin:0;font-size:1.3rem;font-weight:700;color:#1b4332;">
    {upi_id}
  </p>
</div>
<p style="margin:0;font-size:0.85rem;color:#e74c3c;">
  🔒 If you did not make this change, please contact support immediately.
</p>
"""
    return send_email(to, "VaidyaMed-X — UPI ID Updated", _base_template("UPI Updated", body))
