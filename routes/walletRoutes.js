const express = require("express")
const router  = express.Router()
const auth    = require("../middleware/auth")
const admin   = require("../middleware/admin")
const {
  completeRide, getMyWallet, requestWithdrawal,
  recordPassengerPayment,
  adminGetWithdrawals, adminPayWithdrawal,
  adminRejectWithdrawal, adminEarningsOverview
} = require("../controllers/walletController")

// Driver / Passenger
router.get("/my-wallet",                     auth, getMyWallet)
router.post("/complete-ride/:rideId",        auth, completeRide)
router.post("/withdraw",                     auth, requestWithdrawal)

// Admin
router.post("/record-payment",               auth, admin, recordPassengerPayment)
router.get("/admin/withdrawals",             auth, admin, adminGetWithdrawals)
router.put("/admin/withdrawals/:txId/pay",   auth, admin, adminPayWithdrawal)
router.put("/admin/withdrawals/:txId/reject",auth, admin, adminRejectWithdrawal)
router.get("/admin/earnings",                auth, admin, adminEarningsOverview)

module.exports = router
