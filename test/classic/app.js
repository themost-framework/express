var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var sassMiddleware = require('node-sass-middleware');
var ExpressDataApplication = require("../../index").ExpressDataApplication;

var BasicStrategy = require("passport-http").BasicStrategy;
var TextUtils = require("@themost/common").TextUtils;

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var serviceRouter = require('../../service');
var passport = require("passport");
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));

var DateTimeRegex = /^\d{4}-([0]\d|1[0-2])-([0-2]\d|3[01])(?:[T ](\d+):(\d+)(?::(\d+)(?:\.(\d+))?)?)?(?:Z(-?\d*))?([+-](\d+):(\d+))?$/;
app.use(express.json({
  reviver: function(key, value) {
    if (typeof value === "string" && DateTimeRegex.test(value)) {
        return new Date(value);
    }
    return value;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// data context setup
var dataApplication = new ExpressDataApplication(path.resolve(__dirname, 'config'));
// use data middleware (register req.context)
app.use(dataApplication.middleware());
// use basic strategy based on @themost/data user management
passport.use(new BasicStrategy(
  function(username, password, done) {
    // create context
   return dataApplication.execute(function(context, cb) {
      // query user by name
    return context.model('User').where('name').equal(username).silent().getItem().then(function (user) {
        // if user does not exist
        if (typeof user === 'undefined') { 
          return cb(null, false); 
        }
        // check if user has enabled attribute
        if (user.hasOwnProperty('enabled') && user.enabled === false) {
          return cb(null, false); 
        }
        // verify password
        return context.model('UserCredential').where('id').equal(user.id).prepare()
          .and('userPassword').equal('{clear}'.concat(password))
          .or('userPassword').equal('{md5}'.concat(TextUtils.toMD5(password)))
          .or('userPassword').equal('{sha1}'.concat(TextUtils.toSHA1(password)))
          .silent()
          .count().then(function (value) {
            // if password matches user password
            if (value) {
              //return true
              return cb(null, user);  
            }
            //otherwise return false
          return cb(null, false);  
        });
      }).catch(function(err) {
        return cb(err);  
      });
    }, function(err, value) {
      return done(err, value);
    });
    
  }
));

app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true, // true = .sass and false = .scss
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api', passport.authenticate('basic', { session: false }), serviceRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || err.statusCode || 500);
  res.render('error');
});

module.exports = app;
