const express = require("express")
const router = express.Router()

const {
setSchedule,
getMySchedules
} = require("../controllers/scheduleController")

router.post("/set", setSchedule)
router.get("/my", getMySchedules)

module.exports = router