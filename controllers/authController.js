const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const User = require("../models/User")
const mailer = require("../utils/mailer")
const Settings = require("../models/Settings")

const JWT_SECRET = process.env.JWT_SECRET || "traami_secret_key"

function genToken() {
  return crypto.randomBytes(32).toString("hex")
}

// ── REGISTER ──────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const {
      firstName, lastName, username, email,
      phone, password, company, workLocation, scheduleType
    } = req.body

    // Validation
    if (!firstName || !lastName) return res.status(400).json({ message: "First and last name are required" })
    if (!username) return res.status(400).json({ message: "Username is required" })
    if (!email) return res.status(400).json({ message: "Email is required" })
    if (!password) return res.status(400).json({ message: "Password is required" })
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" })

    const usernameClean = username.toLowerCase().trim()
    if (!/^[a-z0-9_]{3,20}$/.test(usernameClean)) {
      return res.status(400).json({ message: "Username must be 3-20 characters using only letters, numbers or underscores" })
    }

    // Check uniqueness
    const existingEmail = await User.findOne({ email: email.toLowerCase() })
    if (existingEmail) return res.status(400).json({ message: "An account with this email already exists" })

    const existingUsername = await User.findOne({ username: usernameClean })
    if (existingUsername) return res.status(400).json({ message: "This username is already taken — try another" })

    const hashedPassword = await bcrypt.hash(password, 10)
    const verificationToken = genToken()

    const user = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: usernameClean,
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : undefined,
      password: hashedPassword,
      company: company?.trim(),
      workLocation: workLocation?.trim(),
      scheduleType: scheduleType || "rota",
      isVerified: false,
      verificationToken,
      verificationExpiry: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    })

    // Check if email verification is enabled in admin settings
    const verifSetting = await Settings.findOne({ key: "emailVerification" })
    const verificationEnabled = verifSetting ? verifSetting.value : true

    if (!verificationEnabled) {
      // Skip verification — auto-verify the user
      user.isVerified = true
      user.verificationToken = undefined
      user.verificationExpiry = undefined
    }

    await user.save()

    if (verificationEnabled) {
      // Send verification email
      try {
        await mailer.sendVerificationEmail(user, verificationToken)
      } catch (emailErr) {
        console.error("Verification email failed:", emailErr.message)
      }
      res.json({
        message: "Account created successfully",
        info: "Please check your email to activate your account before logging in."
      })
    } else {
      // Auto-verified — send welcome email
      try { await mailer.sendWelcomeEmail(user) } catch (e) {}
      res.json({
        message: "Account created successfully",
        info: "You can log in immediately."
      })
    }

  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      return res.status(400).json({ message: `This ${field} is already in use` })
    }
    res.status(500).json({ error: error.message })
  }
}

// ── VERIFY EMAIL ──────────────────────────────────────────
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query

    const user = await User.findOne({
      verificationToken: token,
      verificationExpiry: { $gt: Date.now() }
    })

    if (!user) {
      return res.redirect("/verify-failed.html")
    }

    user.isVerified = true
    user.verificationToken = undefined
    user.verificationExpiry = undefined
    await user.save()

    // Send welcome email
    try { await mailer.sendWelcomeEmail(user) } catch (e) {}

    res.redirect("/verify-success.html")

  } catch (error) {
    res.redirect("/verify-failed.html")
  }
}

// ── LOGIN ─────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { login: loginInput, password } = req.body
    // loginInput can be email, username, or phone

    if (!loginInput || !password) {
      return res.status(400).json({ message: "Login and password are required" })
    }

    // Find by email, username, or phone
    const user = await User.findOne({
      $or: [
        { email: loginInput.toLowerCase().trim() },
        { username: loginInput.toLowerCase().trim() },
        { phone: loginInput.trim() }
      ]
    })

    if (!user) {
      return res.status(400).json({ message: "No account found. Check your email, username or phone number." })
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Your account has been suspended. Contact support@traami.co.uk" })
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in. Check your inbox for the activation link.",
        needsVerification: true
      })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(400).json({ message: "Incorrect password" })
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.json({
      token,
      userId: user._id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      name: `${user.firstName} ${user.lastName}`
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── RESEND VERIFICATION ───────────────────────────────────
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: "Email is required" })

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return res.status(400).json({ message: "No account found with this email" })
    if (user.isVerified) return res.status(400).json({ message: "This account is already verified" })

    const token = genToken()
    user.verificationToken = token
    user.verificationExpiry = Date.now() + 24 * 60 * 60 * 1000
    await user.save()

    await mailer.sendVerificationEmail(user, token)
    res.json({ message: "Verification email resent. Please check your inbox." })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── FORGOT PASSWORD ───────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: "Email is required" })

    const user = await User.findOne({ email: email.toLowerCase() })
    // Always return success to avoid email enumeration
    if (!user) return res.json({ message: "If an account exists, a reset link has been sent." })

    const token = genToken()
    user.resetToken = token
    user.resetTokenExpiry = Date.now() + 60 * 60 * 1000 // 1 hour
    await user.save()

    try { await mailer.sendPasswordResetEmail(user, token) } catch (e) {
      console.error("Reset email failed:", e.message)
    }

    res.json({ message: "If an account exists, a reset link has been sent." })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── RESET PASSWORD ────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body
    if (!resetToken || !newPassword) return res.status(400).json({ message: "Token and new password are required" })
    if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" })

    const user = await User.findOne({
      resetToken,
      resetTokenExpiry: { $gt: Date.now() }
    })
    if (!user) return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." })

    user.password = await bcrypt.hash(newPassword, 10)
    user.resetToken = undefined
    user.resetTokenExpiry = undefined
    await user.save()

    res.json({ message: "Password reset successfully. You can now login." })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── CHECK USERNAME AVAILABILITY ───────────────────────────
exports.checkUsername = async (req, res) => {
  try {
    const { username } = req.query
    if (!username) return res.json({ available: false })
    const clean = username.toLowerCase().trim()
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) return res.json({ available: false, invalid: true })
    const exists = await User.findOne({ username: clean })
    res.json({ available: !exists })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── GET MY PROFILE ────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password -resetToken -resetTokenExpiry -verificationToken")
    if (!user) return res.status(404).json({ message: "User not found" })
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── UPDATE PROFILE ────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, company, workLocation, scheduleType } = req.body
    if (!firstName || !lastName) return res.status(400).json({ message: "First and last name are required" })

    await User.findByIdAndUpdate(req.userId, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim() || undefined,
      company: company?.trim(),
      workLocation: workLocation?.trim(),
      scheduleType
    })

    res.json({ message: "Profile updated successfully" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
