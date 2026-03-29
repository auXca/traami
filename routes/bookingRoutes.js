const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const { requestSeat, approveBooking, rejectBooking } = require("../controllers/bookingController")

router.post("/request/:rideId", auth, requestSeat)
router.post("/approve/:bookingId", auth, approveBooking)
router.post("/reject/:bookingId", auth, rejectBooking)

module.exports = router
