const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const {
  register, login, forgotPassword,
  resetPassword, getProfile, updateProfile
} = require("../controllers/authController")

router.post("/register", register)
router.post("/login", login)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)
router.get("/profile", auth, getProfile)
router.put("/profile", auth, updateProfile)

module.exports = router
