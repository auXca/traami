const Booking  = require("../models/Booking")
const Ride     = require("../models/Ride")
const Settings = require("../models/Settings")

// ── Helper: get Revolut link from settings ────────────────
async function getRevolutLink() {
  const s = await Settings.findOne({ key: "revolut_link" })
  return s ? s.value : "https://revolut.me/YOUR_USERNAME"
}

// ── STEP 1: Passenger requests seat → show payment page ───
exports.requestSeat = async (req, res) => {
  try {
    const { rideId } = req.params
    const ride = await Ride.findById(rideId)
    if (!ride)                              return res.status(404).json({ error: "Ride not found" })
    if (ride.seatsAvailable <= 0)           return res.status(400).json({ error: "No seats available" })
    if (ride.driver.toString() === req.userId) return res.status(400).json({ error: "You cannot book your own ride" })

    const existing = await Booking.findOne({ ride: rideId, passenger: req.userId })
    if (existing) {
      if (existing.status === "pending_payment") {
        // Return payment info again so they can complete it
        const revolut = await getRevolutLink()
        return res.json({
          bookingId:    existing._id,
          amountPence:  Math.round((ride.totalRidePrice || 0) * 100),
          amountPounds: (ride.totalRidePrice || 0).toFixed(2),
          revolutLink:  revolut,
          status:       "pending_payment",
          message:      "You already have a pending booking — please complete payment."
        })
      }
      return res.status(400).json({ error: "You have already booked this ride" })
    }

    const amountPence = Math.round((ride.totalRidePrice || 0) * 100)

    // Create booking in pending_payment state
    const booking = await Booking.create({
      ride:         rideId,
      passenger:    req.userId,
      status:       "pending_payment",
      paymentStatus:"unpaid",
      amountPaid:   amountPence
    })

    const revolut = await getRevolutLink()

    // Build Revolut link with amount pre-filled
    // Format: https://revolut.me/username/5.50/GBP?note=Traami+Ride+BookingID
    const pounds  = (amountPence / 100).toFixed(2)
    const note    = encodeURIComponent(`Traami ride ${booking._id.toString().slice(-6).toUpperCase()}`)
    const payLink = `${revolut}/${pounds}/GBP?note=${note}`

    res.json({
      bookingId:    booking._id,
      amountPence,
      amountPounds: pounds,
      revolutLink:  payLink,
      bookingRef:   booking._id.toString().slice(-6).toUpperCase(),
      status:       "pending_payment",
      message:      "Booking created — please complete payment via Revolut"
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── STEP 2: Passenger marks payment as sent ───────────────
exports.confirmPaymentSent = async (req, res) => {
  try {
    const { bookingId } = req.params
    const booking = await Booking.findById(bookingId)
    if (!booking) return res.status(404).json({ error: "Booking not found" })
    if (booking.passenger.toString() !== req.userId) return res.status(403).json({ error: "Not your booking" })

    booking.paymentStatus = "awaiting_confirmation"
    booking.status        = "pending_approval"
    await booking.save()

    // Notify driver they have a payment to confirm
    const ride = await Ride.findById(booking.ride)
    const io   = req.app.get("io")
    io.to(ride.driver.toString()).emit("paymentReceived", {
      bookingId:  booking._id,
      rideId:     ride._id,
      amount:     "£" + (booking.amountPaid / 100).toFixed(2),
      ref:        booking._id.toString().slice(-6).toUpperCase(),
      message:    `A passenger has sent payment of £${(booking.amountPaid/100).toFixed(2)} — check your Revolut and confirm in admin.`
    })

    res.json({ message: "Thank you! Your payment is being verified. You'll be notified once confirmed." })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── STEP 3: Admin confirms payment received in Revolut ────
exports.approveBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate("ride")
    if (!booking) return res.status(404).json({ error: "Booking not found" })

    booking.status        = "approved"
    booking.paymentStatus = "paid"
    await booking.save()

    const ride = await Ride.findById(booking.ride._id)
    if (ride.seatsAvailable > 0) {
      ride.seatsAvailable -= 1
      await ride.save()
    }

    const io = req.app.get("io")
    io.to(booking.passenger.toString()).emit("bookingStatusUpdate", {
      status:  "approved",
      rideId:  booking.ride._id,
      message: "✅ Payment confirmed! Your seat is booked. Check My Rides for details."
    })

    res.json({ message: "Payment confirmed and booking approved" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── STEP 3b: Admin rejects / refund needed ────────────────
exports.rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
    if (!booking) return res.status(404).json({ error: "Booking not found" })

    booking.status        = "rejected"
    booking.paymentStatus = booking.paymentStatus === "paid" ? "refunded" : "unpaid"
    await booking.save()

    const io = req.app.get("io")
    io.to(booking.passenger.toString()).emit("bookingStatusUpdate", {
      status:  "rejected",
      message: "Your booking was not approved. If you paid, a refund will be sent to your Revolut within 24 hours."
    })

    res.json({ message: "Booking rejected" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── GET pending payments for admin ────────────────────────
exports.getPendingPayments = async (req, res) => {
  try {
    const bookings = await Booking.find({
      status: "pending_approval",
      paymentStatus: "awaiting_confirmation"
    })
    .populate("passenger", "firstName lastName username email phone")
    .populate("ride", "pickup destination date time totalRidePrice driver")
    .sort({ createdAt: 1 })

    res.json(bookings.map(b => ({
      id:          b._id,
      ref:         b._id.toString().slice(-6).toUpperCase(),
      passenger:   b.passenger,
      ride:        b.ride,
      amount:      (b.amountPaid / 100).toFixed(2),
      createdAt:   b.createdAt
    })))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── UPDATE REVOLUT LINK (admin settings) ─────────────────
exports.updateRevolutLink = async (req, res) => {
  try {
    const { link } = req.body
    if (!link) return res.status(400).json({ message: "Link is required" })
    await Settings.findOneAndUpdate(
      { key: "revolut_link" },
      { key: "revolut_link", value: link, updatedAt: new Date() },
      { upsert: true }
    )
    res.json({ message: "Revolut link updated" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getRevolutLink = async (req, res) => {
  try {
    const link = await getRevolutLink()
    res.json({ link })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
