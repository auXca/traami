const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const {
  createRide, getRides, searchRides,
  getMyRides, getMyBookings
} = require("../controllers/rideController")

router.post("/create", auth, createRide)   // ✅ auth middleware added
router.get("/", getRides)
router.get("/search", searchRides)
router.get("/my-rides", auth, getMyRides)
router.get("/my-bookings", auth, getMyBookings)

module.exports = router
