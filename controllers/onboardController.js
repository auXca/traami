const User = require("../models/User")
const Ride = require("../models/Ride")
const Booking = require("../models/Booking")
const geolib = require("geolib")
const axios = require("axios")

const GOOGLE_KEY = process.env.GOOGLE_API_KEY || ""
const BUS_RADIUS_METRES = 800   // within 800m of a bus stop = walkable
const ROUTE_RADIUS_METRES = 5000 // driver route passes within 5km of person

// ── SEARCH PERSON BY USERNAME OR PHONE ───────────────────
exports.findPerson = async (req, res) => {
  try {
    const { query } = req.query
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ message: "Enter a username or phone number" })
    }

    const q = query.trim()
    const user = await User.findOne({
      $or: [
        { username: q.toLowerCase() },
        { phone: q }
      ]
    }).select("firstName lastName username phone company workLocation homeAddress homeLat homeLng scheduleType")

    if (!user) {
      return res.status(404).json({ message: "No user found with that username or phone number" })
    }

    // Don't expose their own data to strangers — return only what's needed for matching
    res.json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      company: user.company || null,
      workLocation: user.workLocation || null,
      scheduleType: user.scheduleType,
      hasHomeLocation: !!(user.homeLat && user.homeLng),
      homeAddress: user.homeAddress || null,
      homeLat: user.homeLat || null,
      homeLng: user.homeLng || null
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── CHECK IF DRIVER'S ROUTE PASSES NEAR PERSON'S HOME ────
exports.checkRouteMatch = async (req, res) => {
  try {
    const {
      personId,
      driverPickupLat, driverPickupLng,
      driverDestLat, driverDestLng,
      personHomeLat, personHomeLng
    } = req.body

    if (!personHomeLat || !personHomeLng) {
      return res.status(400).json({
        message: "This person hasn't set their home location yet. Ask them to add it in their profile."
      })
    }

    const pLat = parseFloat(personHomeLat)
    const pLng = parseFloat(personHomeLng)
    const oLat = parseFloat(driverPickupLat)
    const oLng = parseFloat(driverPickupLng)
    const dLat = parseFloat(driverDestLat)
    const dLng = parseFloat(driverDestLng)

    // Sample points along the driver's route (straight line approximation)
    // In production this would use Google Directions waypoints
    const routePoints = []
    const steps = 20
    for (let i = 0; i <= steps; i++) {
      routePoints.push({
        latitude:  oLat + (dLat - oLat) * (i / steps),
        longitude: oLng + (dLng - oLng) * (i / steps)
      })
    }

    // Find closest point on route to person's home
    let closestDist = Infinity
    let closestPoint = null
    routePoints.forEach(pt => {
      const dist = geolib.getDistance(
        { latitude: pLat, longitude: pLng },
        pt
      )
      if (dist < closestDist) {
        closestDist = dist
        closestPoint = pt
      }
    })

    const withinRoute = closestDist <= ROUTE_RADIUS_METRES
    const walkingMins = Math.round((closestDist / 80)) // ~80m per min walking

    // Also check distance from dest to home (for drop-off near work)
    const distToDestination = geolib.getDistance(
      { latitude: pLat, longitude: pLng },
      { latitude: dLat, longitude: dLng }
    )

    // Find nearby bus stops using Google Places (if API key set)
    let busStops = []
    if (GOOGLE_KEY && closestPoint) {
      try {
        const placesRes = await axios.get(
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
          `?location=${pLat},${pLng}` +
          `&radius=${BUS_RADIUS_METRES}` +
          `&type=bus_station` +
          `&key=${GOOGLE_KEY}`
        )
        busStops = (placesRes.data.results || []).slice(0, 3).map(s => ({
          name: s.name,
          lat: s.geometry.location.lat,
          lng: s.geometry.location.lng,
          distFromHome: geolib.getDistance(
            { latitude: pLat, longitude: pLng },
            { latitude: s.geometry.location.lat, longitude: s.geometry.location.lng }
          )
        }))

        // For each bus stop, check if driver passes near it too
        busStops = busStops.map(stop => {
          let closestToBus = Infinity
          routePoints.forEach(pt => {
            const d = geolib.getDistance({ latitude: stop.lat, longitude: stop.lng }, pt)
            if (d < closestToBus) closestToBus = d
          })
          return {
            ...stop,
            driverPassesNear: closestToBus <= 1500, // within 1.5km of route
            driverDistFromStop: closestToBus
          }
        })
      } catch (e) {
        // Google Places failed — continue without bus stops
      }
    }

    // Build result
    const result = {
      withinRoute,
      closestDistMetres: Math.round(closestDist),
      closestDistMiles: (closestDist / 1609).toFixed(1),
      walkingMinsFromRoute: walkingMins,
      distToDestMetres: Math.round(distToDestination),
      busStops,
      recommendation: null
    }

    if (closestDist <= 800) {
      result.recommendation = "great_match"
      result.message = "Your route passes very close to their home — great match! You can drop them off right near their house."
    } else if (closestDist <= 2000) {
      result.recommendation = "good_match"
      result.message = `Your route passes ${Math.round(closestDist)}m from their home — about ${walkingMins} mins walk. A good match.`
    } else if (closestDist <= 5000) {
      result.recommendation = "possible"
      result.message = `Your route is ${(closestDist/1609).toFixed(1)} miles from their home. Check if any bus stops are nearby for the last stretch.`
    } else {
      result.recommendation = "no_match"
      result.message = "Your route doesn't pass close enough to their home for a convenient drop-off."
    }

    // Add bus stop recommendation if available
    const goodBusStop = busStops.find(s => s.driverPassesNear)
    if (goodBusStop) {
      result.busRecommendation = `Drop them at ${goodBusStop.name} — it's ${goodBusStop.distFromHome}m from their home and your route passes within ${Math.round(goodBusStop.driverDistFromStop)}m of it.`
    }

    res.json(result)

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── CONFIRM MANUAL BOOKING ────────────────────────────────
exports.confirmManualBooking = async (req, res) => {
  try {
    const { rideId, passengerId, dropoffNote } = req.body

    if (!rideId || !passengerId) {
      return res.status(400).json({ message: "Ride and passenger are required" })
    }

    const ride = await Ride.findById(rideId)
    if (!ride) return res.status(404).json({ message: "Ride not found" })
    if (ride.driver.toString() !== req.userId) {
      return res.status(403).json({ message: "You can only confirm bookings on your own rides" })
    }
    if (ride.seatsAvailable <= 0) {
      return res.status(400).json({ message: "No seats available on this ride" })
    }

    // Check not already booked
    const existing = await Booking.findOne({ ride: rideId, passenger: passengerId })
    if (existing) {
      if (existing.status === "approved") {
        return res.status(400).json({ message: "This person is already booked on this ride" })
      }
      existing.status = "approved"
      existing.dropoffNote = dropoffNote || ""
      await existing.save()
    } else {
      await Booking.create({
        ride: rideId,
        passenger: passengerId,
        status: "approved",
        dropoffNote: dropoffNote || "",
        manualBooking: true
      })
    }

    ride.seatsAvailable -= 1
    await ride.save()

    // Notify passenger via socket
    const io = req.app.get("io")
    io.to(passengerId.toString()).emit("bookingStatusUpdate", {
      status: "approved",
      rideId,
      message: "You've been added to a ride! Check My Rides for details."
    })

    res.json({ message: "Booking confirmed — they've been added to your ride" })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ── UPDATE HOME LOCATION (for profile) ───────────────────
exports.updateHomeLocation = async (req, res) => {
  try {
    const { homeAddress, homeLat, homeLng } = req.body
    if (!homeLat || !homeLng) return res.status(400).json({ message: "Location coordinates required" })

    await User.findByIdAndUpdate(req.userId, { homeAddress, homeLat, homeLng })
    res.json({ message: "Home location saved" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
