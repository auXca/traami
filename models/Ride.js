const mongoose = require("mongoose");

const RideSchema = new mongoose.Schema({

driver:{
type: mongoose.Schema.Types.ObjectId,
ref:"User"
},

pickup:String,

pickupLat:Number,
pickupLng:Number,

destination:String,

destinationLat:Number,
destinationLng:Number,

date:String,

time:String,

timeType:String,

seats:Number,

distanceMiles:Number,
driverPrice:Number,
platformCommission:Number,
totalRidePrice:Number,

seatsAvailable:Number,
scheduleType:String,

daysOfWeek:[String],

ridesPerWeek:Number,

flexibleDates:[String],
isCompleted: { type: Boolean, default: false },
createdAt:{
type:Date,
default:Date.now
}

})

module.exports = mongoose.model("Ride",RideSchema)
