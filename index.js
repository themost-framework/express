/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
var path = require("path");
var LangUtils = require("@themost/common").LangUtils;
var DefaultDataContext = require("@themost/data/data-context").DefaultDataContext;
var ConfigurationBase = require("@themost/common/config").ConfigurationBase;
var DataConfigurationStrategy = require("@themost/data/data-configuration").DataConfigurationStrategy;

/**
 * @class
 * @inherits DefaultDataContext
 * @param {ConfigurationBase=} configuration
 */ 
function ExpressDataContext(configuration) {
    ExpressDataContext.super_.bind(this)();
    this.getConfiguration = function() {
        return configuration;
    };
}
LangUtils.inherits(ExpressDataContext, DefaultDataContext);
/**
 * @param {Function} strategyCtor
 */ 
ExpressDataContext.prototype.getStrategy = function(strategyCtor) {
    return this.getConfiguration().getStrategy(strategyCtor);
};

/**
 * @param {string} configurationPath
 */
function dataContext(configurationPath) {
    //initialize @themost/data configuration
    var config = new ConfigurationBase(path.resolve(process.cwd(), configurationPath));
    //use default data configuration strategy
    config.useStrategy(DataConfigurationStrategy, DataConfigurationStrategy);
      return function dataContextMiddleware(req, res, next) {
      /**
       * @name context
       * @type {ExpressDataContext}
       * @memberOf req
       */
      req.context = new ExpressDataContext(config);
      req.on('end', function() {
        //on end
        if (req.context) {
          //finalize data context
          return req.context.finalize(()=> {
            //
          });
        }
      });
      return next();
  };
}

module.exports.ExpressDataContext = ExpressDataContext;
module.exports.dataContext = dataContext;