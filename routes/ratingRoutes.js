const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const { submitRating, getUserRating } = require("../controllers/ratingController")

router.post("/submit", auth, submitRating)
router.get("/user/:userId", getUserRating)

module.exports = router
