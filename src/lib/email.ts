import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/** Base URL for invite links */
function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return "https://college.pennquinn.com";
}

// ---------------------------------------------------------------------------
// Family invite email
// ---------------------------------------------------------------------------

interface FamilyInviteEmailOpts {
  to: string;
  inviterName: string | null;
  inviterType: "parent" | "student";
  token: string;
  expiresAt: string;
}

/**
 * Fire-and-forget invite email.
 * Errors are logged but never thrown — email should never block invite creation.
 */
export async function sendFamilyInviteEmail(opts: FamilyInviteEmailOpts) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping invite email");
    return;
  }

  const { to, inviterName, inviterType, token, expiresAt } = opts;
  const inviteUrl = `${getAppUrl()}/invite/${token}`;
  const senderLabel = inviterName || (inviterType === "parent" ? "A parent" : "A student");
  const expDate = new Date(expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  try {
    await resend.emails.send({
      from: "College Quest <noreply@pennquinn.com>",
      to,
      subject: `${senderLabel} invited you to College Quest`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f0;padding:40px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">

          <!-- Header -->
          <tr>
            <td style="background-color:#1e1b4b;padding:28px 32px;text-align:center">
              <span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">
                🎓 College Quest
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#1a1a1a">
                You've been invited!
              </h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a4a4a">
                <strong>${senderLabel}</strong> (${inviterType}) has invited you to join their family on College Quest — a tool for exploring and comparing colleges together.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:4px 0 24px">
                    <a href="${inviteUrl}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#6b6b6b">
                This invitation expires on <strong>${expDate}</strong>. If you don't have an account yet, you'll be able to create one when you click the link above.
              </p>

              <!-- Fallback link -->
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9a9a9a">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${inviteUrl}" style="color:#4f46e5;word-break:break-all">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #eee;text-align:center">
              <p style="margin:0;font-size:12px;color:#9a9a9a">
                College Quest &mdash; Find the right college, together.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim(),
    });
  } catch (err) {
    console.error("Failed to send invite email:", err);
    // Swallow — email is non-critical
  }
}
