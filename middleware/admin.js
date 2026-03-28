module.exports = (req, res, next) => {

try{

if(req.role !== "admin"){
return res.status(403).json({
message: "Access denied. Admin only."
})
}

next()

}catch(error){

res.status(500).json({ error: error.message })

}

}