const Schedule = require("../models/Schedule")
const User = require("../models/User")
const geolib = require("geolib")

exports.findMatches = async (req,res)=>{

try{

const user = await User.findById(req.userId)

const mySchedules = await Schedule.find({user:req.userId})

const otherUsers = await User.find({
company:user.company,
_id:{$ne:req.userId}
})

let matches = []

for(const other of otherUsers){

const otherSchedules = await Schedule.find({user:other._id})

mySchedules.forEach(my =>{

otherSchedules.forEach(otherSch =>{

// match same date
if(my.date === otherSch.date){

// match time within 1 hour
const myTime = parseInt(my.startTime.replace(":",""))
const otherTime = parseInt(otherSch.startTime.replace(":",""))

if(Math.abs(myTime - otherTime) <= 100){

matches.push({
user:other.name,
date:my.date,
time:otherSch.startTime
})

}

}

})

})

}

res.json(matches)

}catch(error){

res.status(500).json({error:error.message})

}

}