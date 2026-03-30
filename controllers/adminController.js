const bcrypt = require("bcryptjs")
const User = require("../models/User")
const Ride = require("../models/Ride")
const Rating = require("../models/Rating")

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -resetToken -resetTokenExpiry")
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.updateUser = async (req, res) => {
  try {
    const { name, company, workLocation } = req.body
    if (!name) return res.status(400).json({ message: "Name is required" })
    await User.findByIdAndUpdate(req.params.userId, { name, company, workLocation })
    res.json({ message: "User updated" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ✅ FIXED - now hashes password before saving
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" })
    }
    const hashed = await bcrypt.hash(password, 10)
    await User.findByIdAndUpdate(req.params.userId, { password: hashed })
    res.json({ message: "Password reset successfully" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.userId)
    res.json({ message: "User deleted" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.toggleBanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
    if (!user) return res.status(404).json({ message: "User not found" })
    user.isBanned = !user.isBanned
    await user.save()
    res.json({ message: user.isBanned ? "User banned" : "User unbanned" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getAllRides = async (req, res) => {
  try {
    const rides = await Ride.find().populate("driver", "name email")
    res.json(rides)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.deleteRide = async (req, res) => {
  try {
    await Ride.findByIdAndDelete(req.params.rideId)
    res.json({ message: "Ride removed" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getAnalytics = async (req, res) => {
  try {
    const users = await User.find()
    const rides = await Ride.find()
    res.json({ totalUsers: users.length, totalRides: rides.length })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getEarnings = async (req, res) => {
  try {
    const rides = await Ride.find()
    let totalRevenue = 0
    let totalCommission = 0
    rides.forEach(r => {
      totalRevenue += r.totalRidePrice || 0
      totalCommission += r.platformCommission || 0
    })
    res.json({ totalRides: rides.length, totalRevenue, totalCommission })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getLowRatedUsers = async (req, res) => {
  try {
    const ratings = await Rating.find().populate("targetUser", "name email")
    const bad = ratings.filter(r => r.rating <= 2)
    res.json(bad)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.detectFraud = async (req, res) => {
  try {
    const users = await User.find()
    const suspicious = users.filter(u => !u.email.includes("@"))
    res.json(suspicious)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── SETTINGS ──────────────────────────────────────────────
const Settings = require("../models/Settings")

// Get all settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.find()
    const obj = {}
    settings.forEach(s => obj[s.key] = s.value)
    // Default emailVerification to true if not set
    if (obj.emailVerification === undefined) obj.emailVerification = true
    res.json(obj)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Toggle email verification on/off
exports.toggleEmailVerification = async (req, res) => {
  try {
    const { enabled } = req.body
    await Settings.findOneAndUpdate(
      { key: "emailVerification" },
      { key: "emailVerification", value: enabled, updatedAt: new Date() },
      { upsert: true, new: true }
    )
    res.json({
      message: enabled
        ? "Email verification is now ON — new users must verify their email"
        : "Email verification is now OFF — new users can log in immediately"
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Manually verify a user
exports.verifyUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
    if (!user) return res.status(404).json({ message: "User not found" })
    user.isVerified = true
    user.verificationToken = undefined
    user.verificationExpiry = undefined
    await user.save()
    res.json({ message: `${user.firstName} ${user.lastName} has been manually verified` })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
