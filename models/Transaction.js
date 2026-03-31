const mongoose = require("mongoose")

// Every money movement is recorded here
const TransactionSchema = new mongoose.Schema({

  // Who is this transaction for
  user:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // What type of transaction
  type: {
    type: String,
    enum: [
      "ride_payment",       // passenger paid for a ride (goes to Traami)
      "driver_earning",     // 90% credited to driver wallet after ride completes
      "commission",         // 10% kept by Traami
      "withdrawal_request", // driver asked to withdraw
      "withdrawal_paid",    // admin confirmed payment sent
      "withdrawal_rejected" // admin rejected withdrawal
    ],
    required: true
  },

  amount:      { type: Number, required: true },  // in pence (£1.50 = 150)
  description: { type: String },

  // Links
  ride:    { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },

  // Withdrawal fields
  withdrawalMethod: { type: String },   // "revolut", "monzo", "bank", "cash"
  withdrawalRef:    { type: String },   // Revolut/Monzo username or account
  adminNote:        { type: String },   // admin note when paying out

  status: {
    type: String,
    enum: ["pending", "completed", "rejected"],
    default: "completed"
  },

  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model("Transaction", TransactionSchema)
