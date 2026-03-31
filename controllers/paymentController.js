const PaymentMethod = require("../models/PaymentMethod")

// ── ADD CARD ──────────────────────────────────────────────
// NOTE: In production, frontend uses Stripe.js to tokenize card
// and sends stripeToken here — NEVER send raw card numbers to server
exports.addCard = async (req, res) => {
  try {
    const { cardName, lastFour, expiry, stripeToken } = req.body

    if (!cardName || !lastFour) {
      return res.status(400).json({ message: "Card name and last four digits required" })
    }

    // In production: use stripeToken to create Stripe customer/payment method
    // const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
    // const customer = await stripe.customers.create({ source: stripeToken, email: user.email })

    const method = await PaymentMethod.create({
      user: req.userId,
      type: "card",
      cardName,
      lastFour,
      expiry,
      stripeToken: stripeToken || "demo_token_" + Date.now()
    })

    res.json({ message: "Card saved successfully", id: method._id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── GET SAVED CARDS ───────────────────────────────────────
exports.getCards = async (req, res) => {
  try {
    const cards = await PaymentMethod.find({ user: req.userId, type: "card" })
      .select("cardName lastFour expiry isDefault createdAt")
    res.json(cards)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── REMOVE CARD ───────────────────────────────────────────
exports.removeCard = async (req, res) => {
  try {
    await PaymentMethod.findOneAndDelete({ _id: req.params.cardId, user: req.userId })
    res.json({ message: "Card removed" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── ADD BANK ACCOUNT (driver payout) ─────────────────────
exports.addBank = async (req, res) => {
  try {
    const { accountName, sortCode, accountNumber } = req.body

    if (!accountName || !sortCode || !accountNumber) {
      return res.status(400).json({ message: "All bank fields are required" })
    }

    // Mask sensitive data — never store raw bank details
    const sortClean = sortCode.replace(/-/g, "")
    const maskedSort = sortClean.slice(0,2) + "-**-**"
    const maskedAcc  = "****" + accountNumber.slice(-4)

    // In production: use Stripe Connect to create external account
    // const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
    // const account = await stripe.accounts.create({ type: "express", country: "GB", ... })

    // Remove existing bank if any
    await PaymentMethod.deleteMany({ user: req.userId, type: "bank" })

    await PaymentMethod.create({
      user: req.userId,
      type: "bank",
      accountName,
      sortCode: maskedSort,
      accountNumber: maskedAcc
    })

    res.json({ message: "Bank details saved. You can now receive ride payments." })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── GET BANK STATUS ───────────────────────────────────────
exports.getBankStatus = async (req, res) => {
  try {
    const bank = await PaymentMethod.findOne({ user: req.userId, type: "bank" })
      .select("accountName sortCode accountNumber createdAt")
    res.json(bank || null)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
