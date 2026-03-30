const mongoose = require("mongoose")

const SettingsSchema = new mongoose.Schema({
  key:   { type: String, unique: true, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model("Settings", SettingsSchema)
