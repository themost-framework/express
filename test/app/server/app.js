import createError from 'http-errors';
import express from 'express';
import engine from 'ejs-locals';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import sassMiddleware from 'node-sass-middleware';
import {ExpressDataApplication, serviceRouter, dateReviver} from '../../../index';
import passport from 'passport';
import {BasicStrategy} from 'passport-http';
import indexRouter from './routes/index';
import {TextUtils} from '@themost/common';

let app = express();

// use ejs-locals for all ejs templates
app.engine('ejs', engine);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));

app.use(express.json({
  reviver: dateReviver 
}));

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// data context setup
const dataApplication = new ExpressDataApplication(path.resolve(__dirname, 'config'));
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
          .count().then((value) => {
            // if password matches user password
            if (value) {
              //return true
              return cb(null, user);  
            }
            //otherwise return false
          return cb(null, false);  
        });
      }).catch((err) => {
        return cb(err);  
      });
    }, (err, value) => {
      return done(err, value);
    });
    
  }
));

app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: false, // true = .sass and false = .scss
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/api', passport.authenticate('basic', { session: false }), serviceRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || err.statusCode || 500);
  res.render('error');
});

module.exports = app;
