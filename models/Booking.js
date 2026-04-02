const mongoose = require("mongoose")

const BookingSchema = new mongoose.Schema({
  ride:      { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
  passenger: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  status: {
    type: String,
    enum: ["pending_payment", "pending_approval", "approved", "rejected"],
    default: "pending_payment"
  },

  // Payment
  paymentStatus:   { type: String, enum: ["unpaid","awaiting_confirmation","paid","refunded"], default: "unpaid" },
  paymentMethod:   { type: String, default: "revolut" },
  amountPaid:      { type: Number },          // pence
  revolut_ref:     { type: String },          // reference passenger used

  // Ride details
  dropoffNote:     { type: String },
  manualBooking:   { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model("Booking", BookingSchema)
