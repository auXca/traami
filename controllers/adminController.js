const User = require("../models/User")
const Ride = require("../models/Ride")
const Rating = require("../models/Rating") // ✅ FIXED


// 👤 GET USERS
exports.getUsers = async (req,res)=>{
try{
const users = await User.find()
res.json(users)
}catch(error){
res.status(500).json({error:error.message})
}
}


// ⭐ LOW RATINGS
exports.getLowRatedUsers = async (req,res)=>{
try{
const Rating = require("../models/Rating")
const ratings = await Rating.find()
const bad = ratings.filter(r=>r.rating <= 2)
res.json(bad)
}catch(error){
res.status(500).json({error:error.message})
}
}
exports.detectFraud = async (req,res)=>{
try{
const users = await User.find()
const suspicious = users.filter(u => !u.email.includes("@"))
res.json(suspicious)
}catch(error){
res.status(500).json({error:error.message})
}
}

// ✏️ UPDATE USER
exports.updateUser = async (req,res)=>{
try{
const {userId} = req.params
const {name,company,workLocation} = req.body

await User.findByIdAndUpdate(userId,{
name,
company,
workLocation
})

res.json({message:"User updated"})
}catch(error){
res.status(500).json({error:error.message})
}
}


// 🔑 RESET PASSWORD
exports.resetPassword = async (req,res)=>{
try{
const {userId} = req.params
const {password} = req.body

await User.findByIdAndUpdate(userId,{password})

res.json({message:"Password reset"})
}catch(error){
res.status(500).json({error:error.message})
}
}


// ❌ DELETE USER
exports.deleteUser = async (req,res)=>{
try{
const {userId} = req.params

await User.findByIdAndDelete(userId)

res.json({message:"User deleted"})
}catch(error){
res.status(500).json({error:error.message})
}
}


// 🚗 GET ALL RIDES (MISSING FIX)
exports.getAllRides = async (req,res)=>{
try{
const rides = await Ride.find().populate("driver")
res.json(rides)
}catch(error){
res.status(500).json({error:error.message})
}
}


// ❌ DELETE RIDE
exports.deleteRide = async (req,res)=>{
try{
const {rideId} = req.params

await Ride.findByIdAndDelete(rideId)

res.json({message:"Ride removed"})
}catch(error){
res.status(500).json({error:error.message})
}
}


// 🚨 BAN / UNBAN USER
exports.toggleBanUser = async (req,res)=>{
try{
const {userId} = req.params

const user = await User.findById(userId)

user.isBanned = !user.isBanned

await user.save()

res.json({
message: user.isBanned ? "User banned" : "User unbanned"
})

}catch(error){
res.status(500).json({error:error.message})
}
}


// 📊 ANALYTICS
exports.getAnalytics = async (req,res)=>{
try{
const users = await User.find()
const rides = await Ride.find()

res.json({
totalUsers: users.length,
totalRides: rides.length
})
}catch(error){
res.status(500).json({error:error.message})
}
}


// 💰 EARNINGS (ONLY ONCE NOW)
exports.getEarnings = async (req,res)=>{
try{
const rides = await Ride.find()

let totalRevenue = 0
let totalCommission = 0

rides.forEach(r=>{
totalRevenue += r.totalRidePrice || 0
totalCommission += r.platformCommission || 0
})

res.json({
totalRides: rides.length,
totalRevenue,
totalCommission
})

}catch(error){
res.status(500).json({error:error.message})
}
}