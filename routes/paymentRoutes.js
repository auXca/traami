const express = require("express")
const router  = express.Router()
const auth    = require("../middleware/auth")
const {
  addCard, getCards, removeCard,
  addBank, getBankStatus
} = require("../controllers/paymentController")

router.post("/add-card",      auth, addCard)
router.get("/cards",          auth, getCards)
router.delete("/card/:cardId",auth, removeCard)
router.post("/add-bank",      auth, addBank)
router.get("/bank-status",    auth, getBankStatus)

module.exports = router
