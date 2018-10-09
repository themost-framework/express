var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var sassMiddleware = require('node-sass-middleware');
var ExpressDataApplication = require("../../index").ExpressDataApplication;
var basicStrategy = require("../../passport").basicStrategy;

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var peopleRouter = require('./routes/people');
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
passport.use(basicStrategy(dataApplication));

app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true, // true = .sass and false = .scss
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/people', passport.authenticate('basic', { session: false }), peopleRouter);

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
