const Booking = require("../models/Booking")
const Ride = require("../models/Ride")

exports.requestSeat = async (req,res)=>{

try{

const rideId = req.params.rideId

const booking = new Booking({

ride:rideId,
passenger:req.userId

})

await booking.save()

const ride = await Ride.findById(rideId)

const io = req.app.get("io")

io.to(ride.driver.toString()).emit("seatRequestNotification",{

rideId:rideId,
passenger:req.userId

})

res.json({
message:"Seat request sent to driver"
})

}catch(error){

res.status(500).json({error:error.message})

}

}


exports.approveBooking = async (req,res)=>{

try{

const bookingId = req.params.bookingId

const booking = await Booking.findById(bookingId).populate("ride")

if(!booking){
return res.status(404).json({error:"Booking not found"})
}

booking.status = "approved"

await booking.save()

const ride = await Ride.findById(booking.ride._id)

ride.seatsAvailable -= 1

await ride.save()

res.json({
message:"Booking approved"
})

}catch(error){

res.status(500).json({error:error.message})

}

}


exports.rejectBooking = async (req,res)=>{

try{

const bookingId = req.params.bookingId

const booking = await Booking.findById(bookingId)

booking.status = "rejected"

await booking.save()

res.json({
message:"Booking rejected"
})

}catch(error){

res.status(500).json({error:error.message})

}

}