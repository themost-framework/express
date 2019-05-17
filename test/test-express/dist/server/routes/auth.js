"use strict";var _express = _interopRequireDefault(require("express"));
var _passportLocal = require("passport-local");
var _passportHttp = require("passport-http");
var _crypto = _interopRequireDefault(require("crypto"));
var _common = require("@themost/common");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

/**
                                                                                                                                        * @param {passport.PassportStatic} passport
                                                                                                                                        */
function authRouter(passport) {
  // local strategy example
  passport.use(new _passportHttp.BasicStrategy({
    session: false,
    passReqToCallback: true },

  function (req, username, password, done) {
    // query users by name
    return req.context.model('User').where('name').equal(username).
    silent().
    getItem().then(user => {
      // if user cannot be found
      if (user == null) {
        return done(null, false);
      }
      // query user credentials by user identifier and password
      return req.context.model('UserCredential').
      where('id').equal(user.id).prepare().
      and('userPassword').equal(`{clear}${password}`).
      or('userPassword').equal(`'{md5}'${_crypto.default.createHash('md5').update(password).digest('hex')}`).
      or('userPassword').equal(`'{sha1}'${_crypto.default.createHash('sha1').update(password).digest('hex')}`).
      silent().
      count().then(exists => {
        // if ser password is correct
        if (exists) {
          // validate that user is enabled
          if (!user.enabled) {
            return done(new _common.HttpForbiddenError('User account is disabled'));
          }
          // return user
          return done(null, user);
        }
        return done(null, false);
      });
    }).catch(err => {
      return done(err);
    });
  }));


  passport.use(new _passportLocal.Strategy({
    usernameField: 'username',
    passwordField: 'password',
    session: false,
    passReqToCallback: true },

  function (req, username, password, done) {
    // query users by name
    return req.context.model('User').where('name').equal(username).
    silent().
    getItem().then(user => {
      // if user cannot be found
      if (user == null) {
        return done(null, false);
      }
      // query user credentials by user identifier and password
      return req.context.model('UserCredential').
      where('id').equal(user.id).prepare().
      and('userPassword').equal(`{clear}${password}`).
      or('userPassword').equal(`'{md5}'${_crypto.default.createHash('md5').update(password).digest('hex')}`).
      or('userPassword').equal(`'{sha1}'${_crypto.default.createHash('sha1').update(password).digest('hex')}`).
      silent().
      count().then(exists => {
        // if ser password is correct
        if (exists) {
          // validate that user is enabled
          if (!user.enabled) {
            return done(new _common.HttpForbiddenError('User account is disabled'));
          }
          // return user
          return done(null, user);
        }
        return done(null, false);
      });
    }).catch(err => {
      return done(err);
    });
  }));


  passport.serializeUser(function (user, done) {
    done(null, user);
  });

  passport.deserializeUser(function (user, done) {
    done(null, user);
  });
  let router = _express.default.Router();

  router.use(passport.initialize());

  router.use(passport.session());

  router.use((req, res, next) => {
    if (typeof req.user === 'undefined') {
      req.user = {
        name: 'anonymous' };

    }
    return next();
  });

  router.get('/login', (req, res) => {
    if (req.user && req.user.name !== 'anonymous') {
      res.redirect('/');
    }
    res.render('login');
  });

  router.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
  });

  router.post('/login',
  passport.authenticate('local', { failureRedirect: '/login' }),
  function (req, res) {
    res.redirect('/');
  });

  return router;
}

module.exports = authRouter;
//# sourceMappingURL=auth.js.map