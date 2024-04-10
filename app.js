var express=require('express');
var session=require('express-session');
var bodyParser =require('body-parser');
var app=express();

app.use(session({secret:"test123!@#"}));
app.use("/uploads",express.static("uploads"));
app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine','ejs');
var db=require('./db_con.js');
var multer=require('multer');

var sendVerifyEmail=require("./sendmail.js");


var storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,"uploads/");
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now()+"-"+req.session.userid+"-"+file.originalname);
    }
});


app.get('/',function(req,res){

    var msg="";
    if(req.session.msg!="")
    {
        msg=req.session.msg;
        req.session.msg="";
    }

    res.render('login',{msg:msg});
});

app.post('/login_submit',function(req,res){
    const {email,pass}=req.body;
    let sql="";

    if(isNaN(email))
    {
        sql="select * from user where email='"+email+"' and password='"+pass+"' and status=1 and softdelete=0";
    }
    else
    {
        sql="select * from user where mobile="+email+" and password='"+pass+"' and status=1 and softdelete=0";
    }

    db.query(sql,function(err,result,fields){
        if(err)
        {
            console.log(err);
        }
        console.log(result);
        if(result.length==0)
            res.render('login',{msg:"username password did not match"});
        else
        {
            req.session.userid=result[0].uid;
            console.log(req.session.userid);
            req.session.un=result[0].fname+""+result[0].lname;
            console.log(req.session.un);
            res.redirect('/home');
        }
    });

});

app.get('/signup',function(req,res){
    res.render('signup',{errmsg:""});
});

app.post('/reg_submit',(req,res)=>{
    const {fname,mname,lname,email,pass,cpass,dob,gender,username}=req.body;

    let sql_check="";

    if(isNaN(email))
    {
        sql_check="select email from user where email='"+email+"'";
    }
    
    else
    {
        sql_check="select mobile from user where mobile='"+email+"'";
    }

    db.query(sql_check,function(err,result,fields){
        if(err)
            throw err;
        if(result.length==1)
        {
            let errmsg="";
            if(isNaN(email))
            {
                sendVerifyEmail(email);
                errmsg="Email already exist";
               
            }
            else
            {
                errmsg="Mobile number already exist";
            }
            res.render('signup',{errmsg:errmsg});
        }
        else
        {
            let sql="";
            if(isNaN(email))
            {
                sql="insert into user (fname,mname,lname,email,password,dob,dor,gender,username) values (?,?,?,?,?,?,?,?,?)";
            }
            else
            {
                sql="insert into user (fname,mname,lname,mobile,password,dob,dor,gender,username) values (?,?,?,?,?,?,?,?,?)";
            }
            let t=new Date();
            let m=t.getMonth()+1;
            
            let dor=t.getFullYear()+"-"+m+"-"+t.getDate();

            db.query(sql,[fname,mname,lname,email,pass,dob,dor,gender,username],function(err,result){
                if(err)
                    throw err;
                if(result.insertId>0)
                {
                    if(isNaN(email))
                        sendVerifyEmail(email);
                    req.session.msg="Account created, please check mail to verify email.";
                    res.redirect('/');
                }
                else
                {
                    res.render('signup',{errmsg:"Cannot complete signup, try again"});
                }
            });
        }
    });
});

app.get('/home',function(req,res){
    if(req.session.userid!="")
    {
        let msg="";
        if(req.session.msg!="")
        {
            msg=req.session.msg;
        }
        let sql="select * from tweet inner join user on user.uid=tweet.uid where tweet.uid=? OR tweet.uid in (select follow_id from user_follows where uid=?) OR tweet.post like '%"+req.session.un+"%' order by datetime desc";

        db.query(sql,[req.session.userid,req.session.userid],function(err,result,fields){
            if(err)
                throw err;
            res.render('home',{data:"",msg:msg,result:result});
            });

    }
    else
    {
        req.session.msg="Please Login first to view home page";
        res.redirect('/');
    }
});

app.get('/logout',function(req,res){
    req.session.userid="";
    res.redirect('/');
});

app.get('/editprofile',function(req,res){

   
    db.query("select * from user where uid =?",[req.session.userid],function(err,result,fields){
        if(err)
            throw err;
        if(result.length==1)
        {
            res.render('editprofile',{editmsg:"",result:result});
        }
        else{
            res.redirect('/');
        }
    });
        
});

app.post('/edit_profile_submit',function(req,res){
    const {fname,mname,lname,about}=req.body;
    let sqlupdate="update user set fname=?,mname=?,lname=?,about=? where uid=?";

    db.query(sqlupdate, [fname,mname,lname,about,req.session.userid],function(err,result){
        if(result.affectedRows==1)
        {
            req.session.msg="data updated";
            res.redirect('/home');
        }
        else
        {
            req.session.msg="cannot update profile";
            res.render('/home');
        }
    });
});

app.get('/followers',function(req,res){
    let sql="select * from user where uid in (select uid from user_follows where follow_id=?)"

    db.query(sql,[req.session.userid],function(err,result,fields){
        if(err)
            throw err;
        res.render('followers_view',{result:result,msg:""});
    });
});

app.get('/following',function(req,res){
    let sql="select * from user where uid in (select follow_id from user_follows where uid=?)";

    db.query(sql,[req.session.userid],function(err,result,fields){
        if(err)
            throw err;
        res.render('following_view',{result:result,msg:""});
    });
});

var upload_detail=multer({storage:storage});

app.post('/tweet_submit',upload_detail.single('tweet_img'),function(req,res){
    const{post}=req.body;

    var filename="";
    var mimetype="";

    try{
        filename=req.file.filename;
        mimetype=req.file.mimetype;
    }
    catch(err){
        console.log(err);
    }

    //console.log(req.file);
    //console.log(req.file.filename);
    var d=new Date();
    var m=d.getMonth()+1;
    var ct=d.getFullYear()+"-"+m+"-"+d.getDate()+" "+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds();

    let sql="insert into tweet (uid,post,datetime,image_vdo_name,type) values (?,?,?,?,?)";

    db.query(sql,[req.session.userid,post,ct,filename,mimetype],function(err,result){
        if(err)
            throw err;
        if(result.insertId>0)
            req.session.msg="tweet done";
        else
            req.session.msg="cannot tweet your post"; 
            res.redirect('/home');
    });
});

app.get('/verifyemail',function(req,res){
    let email=req.query['email'];

    let sql_update="UPDATE user SET status = 1 WHERE email = ?";
    

    db.query(sql_update,[email],function(err,result,fields){
        
        if(err)
        {
            throw err;
        }
        if (result.affectedRows == 1) {
            req.session.msg = "Email verified. Kindly login."; 
            res.redirect('/');
        }
        else 
        {
            req.session.msg = "Email not verified";
            res.redirect('/');
        }
        
        
    });
});

app.listen(8082,function(){
    console.log("server running localhost 8082 port");
});
/*
1) select * from tweet where uid=?;
2) select * from tweet where uid in (select follow_id from user_follows where uid=?)
3) select * from tweet where post like '%username%';

select * from tweet where uid=? OR uid in (select follow_id from user_follows where uid=?) OR post like '%username%'; order by datetime desc;

select * from tweet inner join user on user.uid=tweet.uid where tweet.uid=? OR tweet.uid in (select follow_id from user_follows where uid=?) OR tweet.post like '%+req.session.%un+%'; order by datetime desc;


req.session.un=result[0].fname+" "+result[0].lname;


3. Print count of tweet deleted by each user
a. Select count(*) from tweet where softdelete=1 group by uid in order to find 

4. Print List of user who did not make any tweet,comment or like any tweet.
    a. Select uid username from user where did not in (select distinct pid from tweet)

    b. Select uid,username from user where uid not in (select distinct uid from tweet_comment);

    c. Select uid,username from user where uid not in(slect distinct uid from tweet_like);

5. print counting of user you are following and user following you.
    a. Select count(*) from user_follows where uid=?
    b. Select count(*)from user_follows where follow_id=?

6. Counting of the tweet for any given tag.
    a. Select count(*) from tweet where post like "%#gm%";

7. Print tweet along with comment count on each tweet.
    a. Select count(tweet_comment.tcid), post from tweet_comment inner join tweet on tweet.tid=tweet_comment.tid
    group by tweet_comment.id
*/

