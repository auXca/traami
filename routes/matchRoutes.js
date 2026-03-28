const express = require("express")
const router = express.Router()

const { findMatches } = require("../controllers/matchController")

router.get("/", findMatches)

module.exports = router