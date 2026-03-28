navigator.geolocation.watchPosition((position)=>{

const lat = position.coords.latitude
const lng = position.coords.longitude

socket.emit("driverLocation",{lat,lng})

})