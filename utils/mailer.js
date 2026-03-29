const nodemailer = require("nodemailer")

function getTransporter() {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    })
  }
  return {
    sendMail: async (opts) => {
      console.log("\n📧 EMAIL (dev mode):", opts.to, "|", opts.subject)
      const tokenMatch = opts.html?.match(/token=([^"&\s<]+)/)
      if (tokenMatch) console.log("   Token:", tokenMatch[1])
      return { messageId: "dev-mode" }
    }
  }
}

const BASE_URL = process.env.BASE_URL || "http://localhost:5000"

exports.sendVerificationEmail = async (user, token) => {
  const link = `${BASE_URL}/api/auth/verify-email?token=${token}`
  const t = getTransporter()
  await t.sendMail({
    from: `"Traami" <${process.env.EMAIL_USER || "no-reply@traami.co.uk"}>`,
    to: user.email,
    subject: "Activate your Traami account",
    html: `<div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center">
        <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">⚡ Traami</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:14px">Smart Carpooling for Shift Workers</p>
      </div>
      <div style="padding:36px 40px">
        <h2 style="margin:0 0 10px;font-size:20px;font-weight:700">Welcome, ${user.firstName}! 👋</h2>
        <p style="color:#94a3b8;line-height:1.7;margin-bottom:24px">Thanks for signing up. Click below to activate your Traami account and start finding rides with your coworkers.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:16px;font-weight:700">Activate My Account</a>
        </div>
        <p style="color:#64748b;font-size:13px;line-height:1.6">Link expires in <strong>24 hours</strong>. If you didn't create a Traami account, ignore this email.</p>
        <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0">
        <p style="color:#475569;font-size:12px;text-align:center">Traami Ltd · Birmingham, UK</p>
      </div>
    </div>`
  })
}

exports.sendWelcomeEmail = async (user) => {
  const t = getTransporter()
  await t.sendMail({
    from: `"Traami" <${process.env.EMAIL_USER || "no-reply@traami.co.uk"}>`,
    to: user.email,
    subject: "You're all set — welcome to Traami! 🎉",
    html: `<div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center">
        <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">⚡ Traami</h1>
      </div>
      <div style="padding:36px 40px">
        <h2 style="margin:0 0 10px;font-size:20px;font-weight:700">Your account is active! 🎉</h2>
        <p style="color:#94a3b8;line-height:1.7;margin-bottom:24px">Hi ${user.firstName}, your Traami account is verified and ready. Start saving on your commute today.</p>
        <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:24px">
          <p style="margin:0 0 10px;font-weight:700;font-size:14px">What to do next:</p>
          <p style="margin:0;color:#94a3b8;font-size:13px;line-height:2.2">🔍 Search for rides on your route<br>🚗 Post your commute and earn fuel money<br>📅 Add your shift schedule for coworker matching<br>👤 Complete your profile for better results</p>
        </div>
        <div style="text-align:center">
          <a href="${BASE_URL}/rides.html" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:15px;font-weight:700">Find Rides Now</a>
        </div>
        <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0">
        <p style="color:#475569;font-size:12px;text-align:center">Traami Ltd · Birmingham, UK</p>
      </div>
    </div>`
  })
}

exports.sendPasswordResetEmail = async (user, token) => {
  const link = `${BASE_URL}/forgot-password.html?token=${token}`
  const t = getTransporter()
  await t.sendMail({
    from: `"Traami" <${process.env.EMAIL_USER || "no-reply@traami.co.uk"}>`,
    to: user.email,
    subject: "Reset your Traami password",
    html: `<div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center">
        <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">⚡ Traami</h1>
      </div>
      <div style="padding:36px 40px">
        <h2 style="margin:0 0 10px;font-size:20px;font-weight:700">Password Reset Request</h2>
        <p style="color:#94a3b8;line-height:1.7;margin-bottom:24px">Hi ${user.firstName}, we received a request to reset your password. Click below to choose a new one.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:16px;font-weight:700">Reset My Password</a>
        </div>
        <p style="color:#64748b;font-size:13px;line-height:1.6">Link expires in <strong>1 hour</strong>. If you didn't request this, ignore it.</p>
        <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0">
        <p style="color:#475569;font-size:12px;text-align:center">Traami Ltd · Birmingham, UK</p>
      </div>
    </div>`
  })
}
