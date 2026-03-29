const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const {
  register, login, verifyEmail, resendVerification,
  forgotPassword, resetPassword, checkUsername,
  getProfile, updateProfile
} = require("../controllers/authController")

router.post("/register", register)
router.post("/login", login)
router.get("/verify-email", verifyEmail)
router.post("/resend-verification", resendVerification)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)
router.get("/check-username", checkUsername)
router.get("/profile", auth, getProfile)
router.put("/profile", auth, updateProfile)

module.exports = router
