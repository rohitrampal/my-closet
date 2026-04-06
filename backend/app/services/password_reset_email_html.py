"""Themed HTML + plain text for password-reset emails (matches SPA design tokens)."""

from __future__ import annotations

import html


def password_reset_plain_text(reset_url: str) -> str:
    return (
        "Hi,\n\n"
        "We received a request to reset your My Closet password.\n"
        "Open this link to choose a new password (valid for 1 hour):\n\n"
        f"{reset_url}\n\n"
        "If you did not request this, you can ignore this email.\n"
        "— My Closet\n"
    )


def password_reset_html(reset_url: str) -> str:
    """
    Inline-styled HTML for email clients (table layout, no external CSS).
    Colors align with frontend ``src/styles/theme.css`` (dark luxury, rose-gold + violet).
    """
    safe_href = html.escape(reset_url, quote=True)
    url_visible = html.escape(reset_url, quote=False)

    # Outer gradient border effect via padding + inner solid button (email-safe)
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Reset your password — My Closet</title>
</head>
<body style="margin:0;padding:0;background-color:#07060b;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#07060b;padding:40px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#111018;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.4);">
        <tr>
          <td style="padding:28px 32px 24px;background:linear-gradient(165deg,rgba(230,194,179,0.14) 0%,rgba(17,16,24,0.95) 45%,rgba(212,165,255,0.08) 100%);border-bottom:1px solid rgba(255,255,255,0.08);">
            <p style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#d4a5ff;font-weight:600;">My Closet</p>
            <h1 style="margin:10px 0 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:24px;font-weight:700;color:#f5f5f7;line-height:1.25;letter-spacing:-0.02em;">Reset your password</h1>
            <p style="margin:10px 0 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#a1a1aa;line-height:1.5;">Your AI stylist — secure account access</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#a1a1aa;">
            <p style="margin:0 0 18px;color:#f5f5f7;font-weight:500;">Hi there,</p>
            <p style="margin:0 0 22px;">We received a request to reset the password for your account. Use the button below to choose a new password. This link expires in <strong style="color:#f5f5f7;font-weight:600;">1 hour</strong>.</p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 26px;">
              <tr>
                <td style="border-radius:14px;background:linear-gradient(135deg,#e6c2b3,#d4a5ff);padding:3px;">
                  <a href="{safe_href}" style="display:inline-block;padding:14px 32px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:600;color:#1a1410;text-decoration:none;border-radius:11px;background-color:#f3ebe6;">Reset password</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;color:#71717a;">If the button doesn&rsquo;t work, copy and paste this link:</p>
            <p style="margin:0;word-break:break-all;font-size:12px;line-height:1.5;color:#d4a5ff;">{url_visible}</p>
            <p style="margin:26px 0 0;font-size:13px;color:#71717a;line-height:1.55;">If you didn&rsquo;t request this, you can safely ignore this email — your password will stay the same.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
            <p style="margin:0;font-size:11px;color:#52525b;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.5;">My Closet &mdash; your wardrobe, styled smarter</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
"""
