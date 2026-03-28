const Ride = require("../models/Ride")
const geolib = require("geolib")
const axios = require("axios")

exports.createRide = async (req,res)=>{

try{

const {
pickup,
destination,
date,
time,
timeType,
seats,
pickupLat,
pickupLng,
destinationLat,
destinationLng
} = req.body

// Calculate distance using Google API
const response = await axios.get(
`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickupLat},${pickupLng}&destinations=${destinationLat},${destinationLng}&key=AIzaSyBGMNgrZc-4zw8mijC68m9oFn5BPFXEleY`
)

const meters = response.data.rows[0].elements[0].distance.value

const miles = meters * 0.000621371

// Pricing
const mpg = 40
const fuelPrice = 6.82

const gallonsUsed = miles / mpg

const fuelCost = gallonsUsed * fuelPrice

const commission = fuelCost * 0.10

const totalRidePrice = fuelCost + commission

const ride = new Ride({

driver:req.userId,

pickup,
pickupLat,
pickupLng,

destination,
destinationLat,
destinationLng,

date,
time,
timeType,

seats,
seatsAvailable:seats,

distanceMiles:miles,

driverPrice:fuelCost,

platformCommission:commission,

totalRidePrice:totalRidePrice

})

await ride.save()

res.json({
message:"Ride created successfully",
ride
})

}catch(error){

res.status(500).json({error:error.message})

}

}


exports.getRides = async (req,res)=>{

const rides = await Ride.find()

res.json(rides)

}
exports.searchRides = async (req,res)=>{

try{

const pickupLat = parseFloat(req.query.pickupLat)
const pickupLng = parseFloat(req.query.pickupLng)

const destinationLat = parseFloat(req.query.destinationLat)
const destinationLng = parseFloat(req.query.destinationLng)

if(!pickupLat || !pickupLng || !destinationLat || !destinationLng){
return res.status(400).json({error:"Missing coordinates"})
}

const rides = await Ride.find()

const results = rides.filter(ride=>{

if(!ride.pickupLat || !ride.destinationLat) return false

// distance passenger pickup → driver pickup
const pickupDistance = geolib.getDistance(

{ latitude: pickupLat, longitude: pickupLng },
{ latitude: ride.pickupLat, longitude: ride.pickupLng }

)

// distance passenger destination → driver destination
const destinationDistance = geolib.getDistance(

{ latitude: destinationLat, longitude: destinationLng },
{ latitude: ride.destinationLat, longitude: ride.destinationLng }

)

// distance between passenger start & driver destination
const routeDistance = geolib.getDistance(

{ latitude: pickupLat, longitude: pickupLng },
{ latitude: ride.destinationLat, longitude: ride.destinationLng }

)

// check if passenger route overlaps driver route
return pickupDistance <= 20000 || destinationDistance <= 20000 || routeDistance <= 20000

})

res.json(results)

}catch(error){

res.status(500).json({error:error.message})

}

}