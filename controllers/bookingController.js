const Booking = require("../models/Booking")
const Ride = require("../models/Ride")

exports.requestSeat = async (req, res) => {
  try {
    const { rideId } = req.params

    if (!rideId) return res.status(400).json({ error: "Ride ID required" })

    const ride = await Ride.findById(rideId)
    if (!ride) return res.status(404).json({ error: "Ride not found" })
    if (ride.seatsAvailable <= 0) return res.status(400).json({ error: "No seats available" })
    if (ride.driver.toString() === req.userId) {
      return res.status(400).json({ error: "You cannot book your own ride" })
    }

    // Check if already requested
    const existing = await Booking.findOne({ ride: rideId, passenger: req.userId })
    if (existing) return res.status(400).json({ error: "You have already requested this ride" })

    const booking = new Booking({ ride: rideId, passenger: req.userId })
    await booking.save()

    // Notify driver via socket
    const io = req.app.get("io")
    io.to(ride.driver.toString()).emit("seatRequestNotification", {
      rideId,
      passengerId: req.userId,
      message: "New passenger requested a seat on your ride!"
    })

    res.json({ message: "Seat request sent to driver" })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.approveBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate("ride")
    if (!booking) return res.status(404).json({ error: "Booking not found" })

    booking.status = "approved"
    await booking.save()

    const ride = await Ride.findById(booking.ride._id)
    if (ride.seatsAvailable > 0) {
      ride.seatsAvailable -= 1
      await ride.save()
    }

    // Notify passenger
    const io = req.app.get("io")
    io.to(booking.passenger.toString()).emit("bookingStatusUpdate", {
      status: "approved",
      rideId: booking.ride._id,
      message: "Your seat request was approved!"
    })

    res.json({ message: "Booking approved" })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
    if (!booking) return res.status(404).json({ error: "Booking not found" })

    booking.status = "rejected"
    await booking.save()

    const io = req.app.get("io")
    io.to(booking.passenger.toString()).emit("bookingStatusUpdate", {
      status: "rejected",
      message: "Your seat request was not accepted for this ride."
    })

    res.json({ message: "Booking rejected" })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
