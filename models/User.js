const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
role:{
type:String,
enum:["user","admin"],
default:"user"
},
name:String,

email:{
type:String,
unique:true
},


password:String,

company:String,

workLocation:String,

scheduleType:{
type:String,
enum:["fixed","rota","flexible"],
default:"rota"
},
isBanned:{
type:Boolean,
default:false
},


createdAt:{
type:Date,
default:Date.now
}

})

module.exports = mongoose.model("User",UserSchema)