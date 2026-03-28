const express = require("express");
const router = express.Router();

const { createRide, getRides, searchRides } = require("../controllers/rideController");

router.post("/create", createRide);

router.get("/", getRides);

router.get("/search", searchRides);

module.exports = router;