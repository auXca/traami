const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const admin = require("../middleware/admin")
const {
  getUsers, updateUser, resetPassword, deleteUser,
  toggleBanUser, getAllRides, deleteRide,
  getAnalytics, getEarnings, getLowRatedUsers, detectFraud,
  getSettings, toggleEmailVerification, verifyUser
} = require("../controllers/adminController")

// USERS
router.get("/users",              auth, admin, getUsers)
router.put("/user/:userId",       auth, admin, updateUser)
router.put("/reset-password/:userId", auth, admin, resetPassword)
router.delete("/user/:userId",    auth, admin, deleteUser)
router.put("/ban/:userId",        auth, admin, toggleBanUser)
router.put("/verify/:userId",     auth, admin, verifyUser)

// RIDES
router.get("/rides",              auth, admin, getAllRides)
router.delete("/ride/:rideId",    auth, admin, deleteRide)

// ANALYTICS
router.get("/earnings",           auth, admin, getEarnings)
router.get("/analytics",          auth, admin, getAnalytics)
router.get("/low-ratings",        auth, admin, getLowRatedUsers)
router.get("/fraud",              auth, admin, detectFraud)

// SETTINGS
router.get("/settings",                    auth, admin, getSettings)
router.put("/settings/email-verification", auth, admin, toggleEmailVerification)

module.exports = router
