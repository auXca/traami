const jwt = require("jsonwebtoken")

module.exports = (req,res,next)=>{

const token = req.headers.authorization?.split(" ")[1]

if(!token){
return res.status(401).json({message:"No token"})
}

try{

const decoded = jwt.verify(token,"SECRET_KEY")

req.userId = decoded.userId
req.role = decoded.role

next()

}catch(err){

res.status(401).json({message:"Invalid token"})

}

}