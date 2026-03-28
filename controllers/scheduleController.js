const Schedule = require("../models/Schedule")

exports.setSchedule = async (req,res)=>{

try{

const {date,startTime,endTime} = req.body

const schedule = new Schedule({

user:req.userId,
date,
startTime,
endTime

})

await schedule.save()

res.json({
message:"Schedule saved"
})

}catch(error){

res.status(500).json({error:error.message})

}

}
exports.getMySchedules = async (req,res)=>{

try{

const schedules = await Schedule.find({
user:req.userId
})

res.json(schedules)

}catch(error){

res.status(500).json({error:error.message})

}

}