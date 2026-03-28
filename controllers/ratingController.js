const Rating = require("../models/Rating")
const Booking = require("../models/Booking")

exports.submitRating = async (req, res) => {
  try {
    const { targetUser, rideId, rating, comment } = req.body

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" })
    }

    const existing = await Rating.findOne({
      reviewer: req.userId,
      ride: rideId
    })

    if (existing) {
      return res.status(400).json({ error: "You have already rated this ride" })
    }

    const newRating = new Rating({
      ride: rideId,
      reviewer: req.userId,
      targetUser,
      rating,
      comment
    })

    await newRating.save()

    res.json({ message: "Rating submitted successfully" })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.getUserRating = async (req, res) => {
  try {
    const { userId } = req.params

    const ratings = await Rating.find({ targetUser: userId })

    if (ratings.length === 0) {
      return res.json({ average: null, total: 0, ratings: [] })
    }

    const average = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length

    res.json({
      average: Math.round(average * 10) / 10,
      total: ratings.length,
      ratings
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
