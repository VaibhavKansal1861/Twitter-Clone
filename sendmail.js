const{createTransport}=require("nodemailer");
var nodemailer = require ('nodemailer');
async function sendVerifyEmail(to_email)
{
var transport = nodemailer.createTransport({
    service:"gmail",
    host:"smtp.gmail.com",
    port:465,
    secure:false,
    auth:{
        user:"anuragvashisht18@gmail.com",
        pass:"ahxt aihn evnc gvps"
    }
})

var info = transport.sendMail({
    to:to_email,
    from:"anuragvashisht@gmail.com",
    subject:"Please verify email ",
    html:"<h1 style=\"color:red; background-color:yellow;\">Click on the link below to verify your email</h1><a href=\"http://localhost:8082/verifyemail?email="+to_email+"\">Click to verify</a>"
    });
}

module.exports=sendVerifyEmail;
