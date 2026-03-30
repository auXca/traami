const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "admin"], default: "user" },

  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },

  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9_]{3,20}$/, "Username must be 3-20 chars, letters/numbers/underscore only"]
  },

  email: { type: String, unique: true, required: true, lowercase: true, trim: true },

  phone: {
    type: String,
    trim: true,
    sparse: true   // allows null/undefined — phone is optional at signup
  },

  password: { type: String, required: true },

  company:      { type: String, trim: true },
  workLocation: { type: String, trim: true },
  scheduleType: { type: String, enum: ["fixed", "rota", "flexible"], default: "rota" },

  isBanned:  { type: Boolean, default: false },

  // Email verification
  isVerified:         { type: Boolean, default: false },
  verificationToken:  { type: String },
  verificationExpiry: { type: Date },

  // Password reset
  resetToken:  { type: String },
  resetTokenExpiry: { type: Date },

  // Home location (for manual onboarding match)
  homeAddress: { type: String, trim: true },
  homeLat:     { type: Number },
  homeLng:     { type: Number },

  createdAt: { type: Date, default: Date.now }
})

// Virtual: full name
UserSchema.virtual("name").get(function () {
  return `${this.firstName} ${this.lastName}`
})

module.exports = mongoose.model("User", UserSchema)
