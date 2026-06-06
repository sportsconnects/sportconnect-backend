const { Resend } = require("resend")

async function sendPasswordResetEmail(toEmail, firstName, token) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`

  await resend.emails.send({
    from: "SportsConnect <noreply@nexuxgh.com>",
    to: toEmail,
    subject: "Reset your SportsConnect password",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#F0F4FA;">
        <div style="background:#07112B;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
          <h1 style="color:#1DA8FF;font-size:32px;margin:0;letter-spacing:2px;">SPORTS</h1>
          <h1 style="color:#FFFFFF;font-size:32px;margin:0;letter-spacing:2px;">CONNECT</h1>
        </div>
        <h2 style="color:#07112B;">Hi ${firstName} 👋</h2>
        <p style="color:#374151;font-size:15px;line-height:1.6;">
          We received a request to reset your password. Click the button below to choose a new one.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${resetUrl}"
             style="background:#1DA8FF;color:#FFFFFF;padding:14px 36px;border-radius:12px;
                    font-weight:bold;font-size:15px;text-decoration:none;display:inline-block;">
            Reset My Password
          </a>
        </div>
        <p style="color:#9CA3AF;font-size:12px;text-align:center;">
          This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  })
}

module.exports = sendPasswordResetEmail