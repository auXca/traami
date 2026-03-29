require("dotenv").config()
const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const connectDB = require("./config/db")

const authRoutes = require("./routes/authRoutes")
const adminRoutes = require("./routes/adminRoutes")
const rideRoutes = require("./routes/rideRoutes")
const bookingRoutes = require("./routes/bookingRoutes")
const matchRoutes = require("./routes/matchRoutes")
const scheduleRoutes = require("./routes/scheduleRoutes")
const ratingRoutes = require("./routes/ratingRoutes")

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: { origin: "*" }
})

app.set("io", io)

app.use(express.json())
app.use(express.static("public"))

app.use("/api/auth", authRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/rides", rideRoutes)
app.use("/api/bookings", bookingRoutes)
app.use("/api/match", matchRoutes)
app.use("/api/schedule", scheduleRoutes)
app.use("/api/ratings", ratingRoutes)

let activeDrivers = {}

io.on("connection", (socket) => {
  socket.on("registerUser", (userId) => {
    if (userId) socket.join(userId)
  })
  socket.on("driverLocation", (data) => {
    const { lat, lng, driverId } = data
    if (driverId) activeDrivers[driverId] = { lat, lng }
    io.emit("driverLocationUpdate", data)
    io.emit("adminLiveDrivers", Object.values(activeDrivers))
  })
  socket.on("joinRideRoom", (rideId) => {
    socket.join("ride_" + rideId)
  })
  socket.on("sendMessage", async (data) => {
    const { rideId, text, userId } = data
    try {
      const Message = require("./models/Message")
      const msg = new Message({ ride: rideId, sender: userId, text })
      await msg.save()
      io.to("ride_" + rideId).emit("newMessage", { userId, text, time: new Date() })
    } catch (err) {}
  })
  socket.on("disconnect", () => {})
})


// 404 handler
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route not found' })
  }
  res.status(404).sendFile('404.html', { root: './public' })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message)
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'Internal server error' })
  }
  res.status(500).send('Something went wrong. Please try again.')
})

connectDB()
const PORT = process.env.PORT || 5000
server.listen(PORT, () => console.log("Server running on port", PORT))
