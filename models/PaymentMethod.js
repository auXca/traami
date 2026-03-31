const mongoose = require("mongoose")

const PaymentMethodSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type:        { type: String, enum: ["card", "bank"], required: true },

  // Card fields
  cardName:    { type: String },
  lastFour:    { type: String },
  expiry:      { type: String },

  // Bank fields (driver payout)
  accountName: { type: String },
  sortCode:    { type: String },       // stored masked: 12-**-**
  accountNumber: { type: String },     // stored masked: ****5678

  // Stripe token (replace raw details with this in production)
  stripeToken:    { type: String },
  stripeCustomerId: { type: String },

  isDefault:   { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now }
})

module.exports = mongoose.model("PaymentMethod", PaymentMethodSchema)
