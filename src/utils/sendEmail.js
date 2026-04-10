const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,    
    pass: process.env.EMAIL_PASS,     
  },
})

async function sendVerificationEmail(toEmail, firstName, token) {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`

  await transporter.sendMail({
    from: `"SportsConnect" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Verify your SportsConnect account",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#F0F4FA;">
        <div style="background:#07112B;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
          <h1 style="color:#1DA8FF;font-size:32px;margin:0;letter-spacing:2px;">SPORTS</h1>
          <h1 style="color:#FFFFFF;font-size:32px;margin:0;letter-spacing:2px;">CONNECT</h1>
        </div>
        <h2 style="color:#07112B;">Hi ${firstName} 👋</h2>
        <p style="color:#374151;font-size:15px;line-height:1.6;">
          Welcome to SportsConnect! You're one step away from getting discovered by scouts and recruiters across Ghana.
        </p>
        <p style="color:#374151;font-size:15px;">
          Click the button below to verify your email address and activate your account.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${verifyUrl}"
             style="background:#1DA8FF;color:#FFFFFF;padding:14px 36px;border-radius:12px;
                    font-weight:bold;font-size:15px;text-decoration:none;display:inline-block;">
            Verify My Email
          </a>
        </div>
        <p style="color:#9CA3AF;font-size:12px;text-align:center;">
          This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  })
}

module.exports = sendVerificationEmail