const Wallet      = require("../models/Wallet")
const Transaction = require("../models/Transaction")
const Ride        = require("../models/Ride")
const Booking     = require("../models/Booking")
const User        = require("../models/User")

const COMMISSION_RATE = 0.10   // 10%

// ── Helper: get or create wallet ─────────────────────────
async function getOrCreateWallet(userId) {
  let wallet = await Wallet.findOne({ user: userId })
  if (!wallet) wallet = await Wallet.create({ user: userId })
  return wallet
}

// ── MARK RIDE AS COMPLETED & CREDIT DRIVER ───────────────
// Called by driver when ride is done — or auto after date passes
exports.completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId)
    if (!ride) return res.status(404).json({ message: "Ride not found" })
    if (ride.driver.toString() !== req.userId) {
      return res.status(403).json({ message: "Only the driver can complete this ride" })
    }
    if (ride.isCompleted) {
      return res.status(400).json({ message: "This ride has already been completed" })
    }

    // Get all approved bookings for this ride
    const bookings = await Booking.find({ ride: ride._id, status: "approved" })

    const totalPricePence = Math.round((ride.totalRidePrice || 0) * 100)
    const commissionPence = Math.round(totalPricePence * COMMISSION_RATE)
    const driverEarningPence = totalPricePence - commissionPence

    // Credit driver wallet
    const driverWallet = await getOrCreateWallet(ride.driver)
    driverWallet.balancePence     += driverEarningPence * bookings.length
    driverWallet.totalEarnedPence += driverEarningPence * bookings.length
    driverWallet.updatedAt = new Date()
    await driverWallet.save()

    // Record transaction per booking
    for (const booking of bookings) {
      await Transaction.create({
        user: ride.driver,
        type: "driver_earning",
        amount: driverEarningPence,
        description: `Earnings for ride: ${ride.pickup} → ${ride.destination}`,
        ride: ride._id,
        booking: booking._id,
        status: "completed"
      })
      await Transaction.create({
        user: ride.driver,
        type: "commission",
        amount: commissionPence,
        description: `Traami 10% commission — ride ${ride._id}`,
        ride: ride._id,
        booking: booking._id,
        status: "completed"
      })
    }

    // Mark ride completed
    ride.isCompleted = true
    await ride.save()

    // Notify via socket
    const io = req.app.get("io")
    for (const booking of bookings) {
      io.to(booking.passenger.toString()).emit("rideCompleted", {
        rideId: ride._id,
        message: "Your ride has been marked complete. Thank you for riding with Traami!"
      })
    }

    res.json({
      message: "Ride completed! Earnings added to your wallet.",
      earned: "£" + (driverEarningPence * bookings.length / 100).toFixed(2),
      commission: "£" + (commissionPence * bookings.length / 100).toFixed(2)
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── GET MY WALLET ─────────────────────────────────────────
exports.getMyWallet = async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.userId)
    const recentTx = await Transaction.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("ride", "pickup destination date")

    res.json({
      balance:        (wallet.balancePence / 100).toFixed(2),
      pending:        (wallet.pendingPence / 100).toFixed(2),
      totalEarned:    (wallet.totalEarnedPence / 100).toFixed(2),
      totalWithdrawn: (wallet.totalWithdrawnPence / 100).toFixed(2),
      transactions: recentTx.map(tx => ({
        id:          tx._id,
        type:        tx.type,
        amount:      (tx.amount / 100).toFixed(2),
        description: tx.description,
        status:      tx.status,
        date:        tx.createdAt,
        ride:        tx.ride
      }))
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── REQUEST WITHDRAWAL ────────────────────────────────────
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, method, ref } = req.body
    // amount in pounds e.g. 12.50
    if (!amount || !method) {
      return res.status(400).json({ message: "Amount and payment method are required" })
    }

    const amountPence = Math.round(parseFloat(amount) * 100)
    if (amountPence < 100) {
      return res.status(400).json({ message: "Minimum withdrawal is £1.00" })
    }

    const wallet = await getOrCreateWallet(req.userId)
    if (wallet.balancePence < amountPence) {
      return res.status(400).json({
        message: `Insufficient balance. You have £${(wallet.balancePence/100).toFixed(2)} available.`
      })
    }

    // Move from available to pending
    wallet.balancePence  -= amountPence
    wallet.pendingPence  += amountPence
    wallet.updatedAt = new Date()
    await wallet.save()

    await Transaction.create({
      user: req.userId,
      type: "withdrawal_request",
      amount: amountPence,
      description: `Withdrawal request via ${method}${ref ? " (" + ref + ")" : ""}`,
      withdrawalMethod: method,
      withdrawalRef: ref || "",
      status: "pending"
    })

    res.json({
      message: `Withdrawal of £${(amountPence/100).toFixed(2)} requested. We'll send it to your ${method} within 24 hours.`
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── RECORD PASSENGER PAYMENT (manual — admin confirms they paid) ──
exports.recordPassengerPayment = async (req, res) => {
  try {
    const { bookingId, amountPaid, paymentMethod } = req.body

    const booking = await Booking.findById(bookingId).populate("ride")
    if (!booking) return res.status(404).json({ message: "Booking not found" })

    const amountPence = Math.round(parseFloat(amountPaid) * 100)

    await Transaction.create({
      user: booking.passenger,
      type: "ride_payment",
      amount: amountPence,
      description: `Paid for ride: ${booking.ride.pickup} → ${booking.ride.destination}`,
      ride: booking.ride._id,
      booking: booking._id,
      status: "completed"
    })

    // Mark booking as paid
    booking.paymentStatus = "paid"
    booking.paymentMethod = paymentMethod || "revolut"
    await booking.save()

    res.json({ message: "Payment recorded" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── ADMIN: Get all pending withdrawals ────────────────────
exports.adminGetWithdrawals = async (req, res) => {
  try {
    const pending = await Transaction.find({
      type: "withdrawal_request",
      status: "pending"
    }).populate("user", "firstName lastName email phone username")
      .sort({ createdAt: 1 })

    res.json(pending.map(tx => ({
      id:     tx._id,
      user:   tx.user,
      amount: (tx.amount / 100).toFixed(2),
      method: tx.withdrawalMethod,
      ref:    tx.withdrawalRef,
      date:   tx.createdAt
    })))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── ADMIN: Mark withdrawal as paid ───────────────────────
exports.adminPayWithdrawal = async (req, res) => {
  try {
    const { note } = req.body
    const tx = await Transaction.findById(req.params.txId)
    if (!tx || tx.type !== "withdrawal_request") {
      return res.status(404).json({ message: "Withdrawal request not found" })
    }
    if (tx.status !== "pending") {
      return res.status(400).json({ message: "This withdrawal has already been processed" })
    }

    tx.status    = "completed"
    tx.adminNote = note || ""
    tx.type      = "withdrawal_paid"
    await tx.save()

    // Move from pending to withdrawn in wallet
    const wallet = await getOrCreateWallet(tx.user)
    wallet.pendingPence          -= tx.amount
    wallet.totalWithdrawnPence   += tx.amount
    wallet.updatedAt = new Date()
    await wallet.save()

    // Notify driver
    const io = req.app.get("io")
    io.to(tx.user.toString()).emit("withdrawalPaid", {
      amount: "£" + (tx.amount / 100).toFixed(2),
      message: `Your withdrawal of £${(tx.amount/100).toFixed(2)} has been sent!`
    })

    res.json({ message: "Withdrawal marked as paid and driver notified" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── ADMIN: Reject withdrawal ──────────────────────────────
exports.adminRejectWithdrawal = async (req, res) => {
  try {
    const { reason } = req.body
    const tx = await Transaction.findById(req.params.txId)
    if (!tx || tx.type !== "withdrawal_request") {
      return res.status(404).json({ message: "Withdrawal request not found" })
    }

    tx.status    = "rejected"
    tx.type      = "withdrawal_rejected"
    tx.adminNote = reason || ""
    await tx.save()

    // Refund pending back to available balance
    const wallet = await getOrCreateWallet(tx.user)
    wallet.pendingPence  -= tx.amount
    wallet.balancePence  += tx.amount
    wallet.updatedAt = new Date()
    await wallet.save()

    const io = req.app.get("io")
    io.to(tx.user.toString()).emit("withdrawalRejected", {
      amount: "£" + (tx.amount / 100).toFixed(2),
      message: `Withdrawal rejected: ${reason || "contact support"}. Your balance has been restored.`
    })

    res.json({ message: "Withdrawal rejected and balance restored" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── ADMIN: Platform earnings overview ────────────────────
exports.adminEarningsOverview = async (req, res) => {
  try {
    const commissions = await Transaction.find({ type: "commission" })
    const totalCommPence = commissions.reduce((sum, tx) => sum + tx.amount, 0)

    const pendingWithdrawals = await Transaction.find({ type: "withdrawal_request", status: "pending" })
    const totalPendingPence = pendingWithdrawals.reduce((sum, tx) => sum + tx.amount, 0)

    const allWallets = await Wallet.find()
    const totalDriverBalancePence = allWallets.reduce((sum, w) => sum + w.balancePence + w.pendingPence, 0)

    res.json({
      totalCommission:     (totalCommPence / 100).toFixed(2),
      pendingWithdrawals:  pendingWithdrawals.length,
      pendingAmount:       (totalPendingPence / 100).toFixed(2),
      totalDriverBalance:  (totalDriverBalancePence / 100).toFixed(2)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
