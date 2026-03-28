const mongoose = require("mongoose")

const ScheduleSchema = new mongoose.Schema({

user:{
type:mongoose.Schema.Types.ObjectId,
ref:"User"
},

date:String,

startTime:String,

endTime:String,

createdAt:{
type:Date,
default:Date.now
}

})

module.exports = mongoose.model("Schedule",ScheduleSchema)