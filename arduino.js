const express = require("express");
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const expressValidator = require('express-validator');
const config = require('./config/database');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const five = require('johnny-five');


var board = new five.Board();

mongoose.connect(config.database, { useMongoClient: true }, () => {
    console.log("Connected to mLab!");
});

mongoose.Promise = global.Promise;

// Bring in models
var User = require('./models/user');
var Log = require('./models/log');

// Express Validator Middleware
app.use(expressValidator({
    errorFormatter: function(param, msg, value) {
        var namespace = param.split('.')
        , root    = namespace.shift()
        , formParam = root;
  
      while(namespace.length) {
        formParam += '[' + namespace.shift() + ']';
      }
      return {
        param : formParam,
        msg   : msg,
        value : value
      };
    }
}));

// Express Session Middleware
app.use(session({
    secret: 'it3202islove',
    resave: true,
    saveUninitialized: true
}));

// Express Messages Middleware
app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

//Load View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//Body Parser Middleware
app.use(bodyParser.urlencoded({extended: false }));
app.use(bodyParser.json());

//Set public folder
app.use(express.static(path.join(__dirname, 'public')));

//Passport config
require('./config/passport')(passport);
//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

app.locals.moment = require('moment');

app.get('*', function(req, res, next){
    res.locals.user = req.user || null;
    next();
});

//Registration Process
app.post('/users/register', function(req, res){
    const name = req.body.name;
    const lastname = req.body.lastname;
    const username = req.body.username;
    const password = req.body.password;
    const password2 = req.body.password2;

    let newUser = new User({
        name:name,
        lastname:lastname,
        username:username,
        password:password

    });

    bcrypt.genSalt(10, function(err,salt){
        bcrypt.hash(newUser.password, salt, function(err,hash){
            if(err){
                console.log(err);
            }

            newUser.password = hash;
            newUser.save(function(err){
                if(err){
                    console.log(err);
                    return;
                }else{
                    res.redirect('/');
                }
            });
        });
    });
    
});

//Login Submit Post
app.post('/users/login', function(req, res, next){
    passport.authenticate('local', {
        successRedirect :'/',
        failureRedirect : '/login',
        failureFlash : true
    })(req, res, next);
});

//LOGOUT PAGE
app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
}); 

//INDEX
app.get('/', function(req, res){
    Log.find().sort({date:-1}).exec(function(err,results){
        if(err){
            console.log(err);
        }else{
            //console.log(JSON.stringify(results));
            //res.render('test',{logs:results});
            
            res.render('index', {logs:results});
        }
    });
    //res.render('test', results);
}); 

//INSERTING LOGS
board.on("ready", function(){
	var self = this;
	var ndx;
	for(ndx = 5; ndx< 14; ndx++){
		self.pinMode( ndx, 1 );
	}
	for(ndx = 5; ndx< 14; ndx++){
		self.digitalWrite( ndx, 0);
    }
    

    function callback(red, yellow, green, sum) {
        self.digitalWrite( 8, 1 );
        self.digitalWrite( 11, 1 );
        self.digitalWrite( 7, 1 );
            self.wait(green, function(){
                self.digitalWrite( 8, 0);
                self.digitalWrite( 11, 0 );		
                self.digitalWrite( 12, 1 );
                self.digitalWrite( 9, 1 );	
                self.wait(yellow, function(){
                    self.digitalWrite( 7, 0 );
                    self.digitalWrite( 12, 0);
                    self.digitalWrite( 9, 0 );
                    self.digitalWrite( 13, 1);
                    self.digitalWrite( 10, 1 );
                    self.digitalWrite( 5, 1 );
                    self.wait(red, function(){
                        self.digitalWrite( 5, 0);
                        self.digitalWrite( 6, 1);
                        self.wait(yellow, function(){
                            self.digitalWrite( 13, 0);
                             self.digitalWrite( 10, 0);
                            self.digitalWrite( 6, 0);
                            callback(red, yellow, green, sum);
                        });	
                    });	
                            
                });
            });
        }
 
 
    
        

        var a = app.post('/offAll', function(req, res){
                    var i= setInterval(function(){
                        for(ndx = 5; ndx< 14; ndx++){
                            self.digitalWrite( ndx, 0);
                    }
                    }, 1000);
                    
                    setTimeout(function(){
                        clearInterval(i);
                    }, 20000);
                
                res.redirect('/');
         });


    app.post('/insertLogs', function(req, res){
        var red = req.body.red;
         var yellow = req.body.yellow;
         var green = req.body.green;
         var offButton = req.body.offButton;
         const userID = req.user.id;
          const username = req.user.username;

         //Getting current date and time
        var date = new Date();
        
        var hour = date.getHours();
        hour = (hour < 10 ? "0" : "") + hour;

        var min  = date.getMinutes();
         min = (min < 10 ? "0" : "") + min;

        var sec  = date.getSeconds();
        sec = (sec < 10 ? "0" : "") + sec;

         var year = date.getFullYear();

          var month = date.getMonth() + 1;
          month = (month < 10 ? "0" : "") + month;

            var day  = date.getDate();
          day = (day < 10 ? "0" : "") + day;

         var dateToday = day+"/"+month+"/"+year;
         var timeToday = hour+":"+min+":"+sec;
               red = red * 1000;
	            yellow = yellow * 1000;
               green = green * 1000;
                  const sum = yellow+red+green+yellow;
                
                  if(offButton!=0){
                   callback(red, yellow, green, sum); 
                    let newLog = new Log({
                        userID:userID,
                         username:username,
                        red:green,
                         yellow:yellow,
                        green:green,
                        date:dateToday,
                        time:timeToday
                     });                             
                      newLog.save(function(err){
                          if(err){
                          console.log(err);
                           return;
                          }else{
                          res.redirect('/');
                          }
                    });
                  }else{
                    for(ndx = 5; ndx< 14; ndx++){
                        self.digitalWrite( ndx, 0);
                    }
                    res.redirect('/');
                  }
                 
  
                        
                    
                    
});
});


app.listen("3000",()=>{
    console.log("Server is running on port 3000...");
});