const express = require("express")
const router = express.Router()

const {
requestSeat,
approveBooking,
rejectBooking
} = require("../controllers/bookingController")

router.post("/request/:rideId", requestSeat)

router.post("/approve/:bookingId", approveBooking)

router.post("/reject/:bookingId", rejectBooking)

module.exports = router