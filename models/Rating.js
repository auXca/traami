const mongoose = require("mongoose")

const RatingSchema = new mongoose.Schema({

ride:{ type:mongoose.Schema.Types.ObjectId, ref:"Ride" },

reviewer:{ type:mongoose.Schema.Types.ObjectId, ref:"User" },

targetUser:{ type:mongoose.Schema.Types.ObjectId, ref:"User" },

rating:Number,
comment:String,

createdAt:{ type:Date, default:Date.now }

})

module.exports = mongoose.model("Rating", RatingSchema)
