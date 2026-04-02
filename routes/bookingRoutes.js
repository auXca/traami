const express = require("express")
const router  = express.Router()
const auth    = require("../middleware/auth")
const admin   = require("../middleware/admin")
const {
  requestSeat, confirmPaymentSent,
  approveBooking, rejectBooking,
  getPendingPayments,
  updateRevolutLink, getRevolutLink
} = require("../controllers/bookingController")

router.post("/request/:rideId",              auth, requestSeat)
router.put("/confirm-payment/:bookingId",    auth, confirmPaymentSent)
router.put("/approve/:bookingId",            auth, admin, approveBooking)
router.put("/reject/:bookingId",             auth, admin, rejectBooking)
router.get("/pending-payments",              auth, admin, getPendingPayments)
router.put("/revolut-link",                  auth, admin, updateRevolutLink)
router.get("/revolut-link",                  getRevolutLink)

module.exports = router
