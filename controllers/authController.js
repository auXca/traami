const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/User")

exports.register = async (req,res)=>{

try{

const {
name,email,password,company,workLocation,scheduleType
} = req.body

const existingUser = await User.findOne({email})

if(existingUser){
return res.status(400).json({message:"Email already exists"})
}

const hashedPassword = await bcrypt.hash(password,10)

const user = new User({

name,
email,
password:hashedPassword,
company,
workLocation,
scheduleType

})

await user.save()

res.json({message:"Account created successfully"})

}catch(error){

res.status(500).json({error:error.message})

}

}
exports.login = async (req,res)=>{

const {email,password} = req.body

const user = await User.findOne({email})

if(!user){
return res.status(400).json({message:"User not found"})
}

const valid = await bcrypt.compare(password,user.password)

if(!valid){
return res.status(400).json({message:"Invalid password"})
}

const token = jwt.sign(
{userId:user._id, role:user.role},
"SECRET_KEY",
{expiresIn:"7d"}
)

res.json({
token,
userId:user._id,
role:user.role
})

}