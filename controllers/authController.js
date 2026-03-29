const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/User")

const JWT_SECRET = process.env.JWT_SECRET || "traami_secret_key"

// ── REGISTER ──────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password, company, workLocation, scheduleType } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      company,
      workLocation,
      scheduleType: scheduleType || "rota"
    })

    await user.save()
    res.json({ message: "Account created successfully" })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── LOGIN ─────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(400).json({ message: "No account found with this email" })
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Your account has been suspended. Contact support." })
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
      name: user.name
    })

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
    if (!user) return res.status(400).json({ message: "No account found with this email" })

    // Generate a simple reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    user.resetToken = resetToken
    user.resetTokenExpiry = Date.now() + 3600000 // 1 hour
    await user.save()

    // In production wire up nodemailer here
    // For now return token in response (dev only)
    res.json({
      message: "Password reset instructions sent to your email",
      resetToken // remove this in production
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── RESET PASSWORD ────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body

    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" })
    }

    const user = await User.findOne({
      resetToken,
      resetTokenExpiry: { $gt: Date.now() }
    })

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset link" })
    }

    user.password = await bcrypt.hash(newPassword, 10)
    user.resetToken = undefined
    user.resetTokenExpiry = undefined
    await user.save()

    res.json({ message: "Password reset successfully. You can now login." })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── GET MY PROFILE ────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password -resetToken -resetTokenExpiry")
    if (!user) return res.status(404).json({ message: "User not found" })
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── UPDATE PROFILE ────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, company, workLocation, scheduleType } = req.body

    if (!name) return res.status(400).json({ message: "Name is required" })

    await User.findByIdAndUpdate(req.userId, {
      name, company, workLocation, scheduleType
    })

    res.json({ message: "Profile updated successfully" })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
