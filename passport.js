/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
var BasicStrategy = require("passport-http").BasicStrategy;
var TextUtils = require("@themost/common").TextUtils;
 /**
  * @param {ExpressDataApplication} dataApp
  */ 
  function basicStrategy(dataApp) {
  return new BasicStrategy(
  function(username, password, done) {
    // create context
   return dataApp.execute(function(context, cb) {
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
);
}

module.exports.basicStrategy = basicStrategy;