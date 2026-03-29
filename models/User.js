const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "admin"], default: "user" },
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  company: String,
  workLocation: String,
  scheduleType: { type: String, enum: ["fixed", "rota", "flexible"], default: "rota" },
  isBanned: { type: Boolean, default: false },
  resetToken: String,
  resetTokenExpiry: Date,
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model("User", UserSchema)
