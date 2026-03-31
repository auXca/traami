const mongoose = require("mongoose")

const BookingSchema = new mongoose.Schema({

ride:{
type:mongoose.Schema.Types.ObjectId,
ref:"Ride"
},

passenger:{
type:mongoose.Schema.Types.ObjectId,
ref:"User"
},

status:{
type:String,
enum:["pending","approved","rejected"],
default:"pending"
},

dropoffNote:  { type: String },
  manualBooking:   { type: Boolean, default: false },
  paymentStatus:   { type: String, enum: ["unpaid","paid","refunded"], default: "unpaid" },
  paymentMethod:   { type: String },

createdAt:{
type:Date,
default:Date.now
}

})

module.exports = mongoose.model("Booking",BookingSchema)