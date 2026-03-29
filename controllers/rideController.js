const Ride = require("../models/Ride")
const Booking = require("../models/Booking")
const geolib = require("geolib")
const axios = require("axios")

const GOOGLE_KEY = process.env.GOOGLE_API_KEY || "AIzaSyBGMNgrZc-4zw8mijC68m9oFn5BPFXEleY"

exports.createRide = async (req, res) => {
  try {
    const {
      pickup, destination, date, time, timeType, seats,
      pickupLat, pickupLng, destinationLat, destinationLng,
      scheduleType, daysOfWeek, ridesPerWeek
    } = req.body

    // Input validation
    if (!pickup || !destination || !seats) {
      return res.status(400).json({ error: "Pickup, destination and seats are required" })
    }
    if (!pickupLat || !destinationLat) {
      return res.status(400).json({ error: "Please select locations from the map suggestions" })
    }

    let distanceMiles = 0, fuelCost = 0, commission = 0, totalRidePrice = 0

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickupLat},${pickupLng}&destinations=${destinationLat},${destinationLng}&key=${GOOGLE_KEY}`
      )
      const meters = response.data.rows[0].elements[0].distance.value
      distanceMiles = meters * 0.000621371
      const gallonsUsed = distanceMiles / 40
      fuelCost = gallonsUsed * 6.82
      commission = fuelCost * 0.10
      totalRidePrice = fuelCost + commission
    } catch (err) {
      // If Google API fails, estimate from coordinates
      const meters = geolib.getDistance(
        { latitude: pickupLat, longitude: pickupLng },
        { latitude: destinationLat, longitude: destinationLng }
      )
      distanceMiles = meters * 0.000621371
      fuelCost = (distanceMiles / 40) * 6.82
      commission = fuelCost * 0.10
      totalRidePrice = fuelCost + commission
    }

    const ride = new Ride({
      driver: req.userId,
      pickup, pickupLat, pickupLng,
      destination, destinationLat, destinationLng,
      date, time, timeType,
      seats, seatsAvailable: seats,
      scheduleType, daysOfWeek, ridesPerWeek,
      distanceMiles,
      driverPrice: fuelCost,
      platformCommission: commission,
      totalRidePrice
    })

    await ride.save()
    res.json({ message: "Ride created successfully", ride })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getRides = async (req, res) => {
  try {
    const rides = await Ride.find().populate("driver", "name company scheduleType")
    res.json(rides)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.searchRides = async (req, res) => {
  try {
    const pickupLat = parseFloat(req.query.pickupLat)
    const pickupLng = parseFloat(req.query.pickupLng)
    const destinationLat = parseFloat(req.query.destinationLat)
    const destinationLng = parseFloat(req.query.destinationLng)

    if (!pickupLat || !pickupLng || !destinationLat || !destinationLng) {
      return res.status(400).json({ error: "Missing coordinates" })
    }

    const rides = await Ride.find().populate("driver", "name company")
    const results = rides.filter(ride => {
      if (!ride.pickupLat || !ride.destinationLat) return false
      const pickupDist = geolib.getDistance(
        { latitude: pickupLat, longitude: pickupLng },
        { latitude: ride.pickupLat, longitude: ride.pickupLng }
      )
      const destDist = geolib.getDistance(
        { latitude: destinationLat, longitude: destinationLng },
        { latitude: ride.destinationLat, longitude: ride.destinationLng }
      )
      return pickupDist <= 20000 || destDist <= 20000
    })

    res.json(results)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// My rides — driver view
exports.getMyRides = async (req, res) => {
  try {
    const rides = await Ride.find({ driver: req.userId })
    const ridesWithBookings = await Promise.all(rides.map(async (ride) => {
      const bookings = await Booking.find({ ride: ride._id }).populate("passenger", "name email company")
      return { ...ride.toObject(), bookings }
    }))
    res.json(ridesWithBookings)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// My bookings — passenger view
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ passenger: req.userId })
      .populate("ride")
      .populate({ path: "ride", populate: { path: "driver", select: "name company" } })
    res.json(bookings)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
