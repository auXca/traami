const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const {
  findPerson, checkRouteMatch,
  confirmManualBooking, updateHomeLocation
} = require("../controllers/onboardController")

router.get("/find-person",         auth, findPerson)
router.post("/check-route",        auth, checkRouteMatch)
router.post("/confirm-booking",    auth, confirmManualBooking)
router.put("/home-location",       auth, updateHomeLocation)

module.exports = router
