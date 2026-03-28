
const express = require("express")
const router = express.Router()

const auth = require("../middleware/auth")
const admin = require("../middleware/admin")

const {
getUsers,
updateUser,
resetPassword,
deleteUser,
getAllRides,
deleteRide,
toggleBanUser,
getEarnings,
getAnalytics,
getLowRatedUsers,
detectFraud
} = require("../controllers/adminController")

// USERS
router.get("/users", auth, admin, getUsers)
router.put("/user/:userId", auth, admin, updateUser)
router.put("/reset-password/:userId", auth, admin, resetPassword)
router.delete("/user/:userId", auth, admin, deleteUser)
router.put("/ban/:userId", auth, admin, toggleBanUser)

// RIDES
router.get("/rides", auth, admin, getAllRides)
router.delete("/ride/:rideId", auth, admin, deleteRide)

// ANALYTICS
router.get("/earnings", auth, admin, getEarnings)
router.get("/analytics", auth, admin, getAnalytics)

// EXTRA FEATURES
router.get("/low-ratings", auth, admin, getLowRatedUsers)
router.get("/fraud", auth, admin, detectFraud)

module.exports = router