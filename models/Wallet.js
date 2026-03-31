const mongoose = require("mongoose")

// One wallet per user — tracks current balance
const WalletSchema = new mongoose.Schema({
  user:              { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  balancePence:      { type: Number, default: 0 },   // available to withdraw
  pendingPence:      { type: Number, default: 0 },   // withdrawal requested, not yet paid
  totalEarnedPence:  { type: Number, default: 0 },   // lifetime total earned
  totalWithdrawnPence: { type: Number, default: 0 }, // lifetime total paid out
  updatedAt:         { type: Date, default: Date.now }
})

// Helper: get balance in pounds
WalletSchema.virtual("balance").get(function() {
  return (this.balancePence / 100).toFixed(2)
})
WalletSchema.virtual("pending").get(function() {
  return (this.pendingPence / 100).toFixed(2)
})

module.exports = mongoose.model("Wallet", WalletSchema)
