/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
var path = require("path");
var Q = require("q");
var Symbol = require("symbol");
var LangUtils = require("@themost/common").LangUtils;
var IApplication = require("@themost/common/app").IApplication;
var DefaultDataContext = require("@themost/data/data-context").DefaultDataContext;
var ConfigurationBase = require("@themost/common/config").ConfigurationBase;
var DataConfigurationStrategy = require("@themost/data/data-configuration").DataConfigurationStrategy;
var DataConfiguration = require("@themost/data/data-configuration").DataConfiguration;
var ODataConventionModelBuilder = require("@themost/data/odata").ODataConventionModelBuilder;
var ODataModelBuilder = require("@themost/data/odata").ODataModelBuilder;


let configurationProperty = Symbol('configuration');
let applicationProperty = Symbol('application');
/**
 * @class
 * @implements IApplication
 * @param {string} configurationPath - The configuration directory path
 */ 
function ExpressDataApplication(configurationPath) {
  
    ExpressDataApplication.super_.bind(this)();
  // initialize @themost/data configuration
    this[configurationProperty] = new ConfigurationBase(path.resolve(process.cwd(), configurationPath));
    // use default data configuration strategy
    this[configurationProperty].useStrategy(DataConfigurationStrategy, DataConfigurationStrategy);
    // use default model builder
    this.useModelBuilder();
}
LangUtils.inherits(ExpressDataApplication, IApplication);

/**
 * Registers an application strategy e.g. a singleton service which is going to be used in application context
 * @param {Function} serviceCtor
 * @param {Function} strategyCtor
 * @returns IApplication
 */
// eslint-disable-next-line no-unused-vars
ExpressDataApplication.prototype.useStrategy = function(serviceCtor, strategyCtor) {
    return this[configurationProperty].useStrategy(serviceCtor, strategyCtor);
};
/**
 * Returns the instance of ODataModelBuilder strategy which has been activated for this application
 * @returns ODataModelBuilder
 */ 
ExpressDataApplication.prototype.useModelBuilder = function() {
    // initialize data model builder
    let builder = new ODataConventionModelBuilder(new DataConfiguration(this.getConfiguration().getConfigurationPath()));
    // initialize model builder
    builder.initializeSync();
    // use model convention builder
    this.useStrategy(ODataModelBuilder, function() {
      return builder;
    });
};
/**
 * Returns the instance of ODataModelBuilder strategy which has been activated for this application
 * @returns ODataModelBuilder
 */ 
ExpressDataApplication.prototype.getBuilder = function() {
  return this.getStrategy(ODataModelBuilder);
}

/**
* @param {Function} serviceCtor
* @returns {boolean}
*/
// eslint-disable-next-line no-unused-vars
ExpressDataApplication.prototype.hasStrategy = function(serviceCtor) {
    return this[configurationProperty].hasStrategy(serviceCtor);
};

/**
 * Gets an application strategy based on the given base service type
 * @param {Function} serviceCtor
 * @return {*}
 */
// eslint-disable-next-line no-unused-vars
ExpressDataApplication.prototype.getStrategy = function(serviceCtor) {
    return this[configurationProperty].getStrategy(serviceCtor);
};
/**
 * @returns {ConfigurationBase}
 */
ExpressDataApplication.prototype.getConfiguration = function() {
    return this[configurationProperty];
};

/**
 * Creates a new data context based on the current configuration
 * @returns {ExpressDataContext}
 */
ExpressDataApplication.prototype.createContext = function() {
    let context = new ExpressDataContext(this.getConfiguration());
    context[applicationProperty] = this;
    return context;
};

/**
 * @callback ExpressDataApplication~executeCallback
 * @param {Error=} err
 * @param {*=} value
 */

/**
 * @callback ExpressDataApplication~executeCallable
 * @param {ExpressDataContext} context
 * @param {ExpressDataApplication~executeCallback} cb
 */
 
/**
 * Creates an new context and executes the given callable. Use this method to execute a function 
 * as a service by initializing a data context outside of an HTTP request
 * @param {ExpressDataApplication~executeCallable} callable A callable function to execute
 * @param {ExpressDataApplication~executeCallback} callback A callback function for finalizing data context
 */ 
ExpressDataApplication.prototype.execute = function(callable, callback) {
  // create context
  let context = this.createContext();
  //execute callable function with the context as parameter
  return callable(context, function (err, value) {
      // finalize data context
      context.finalize(function() {
          // and finally execute callback
         return callback(err, value);
       });
  });
};


ExpressDataApplication.prototype.middleware = function() {
  var thisApp = this;
  return function dataContextMiddleware(req, res, next) {
      
      let context = new ExpressDataContext(thisApp.getConfiguration());
      // define application property
      context[applicationProperty] = thisApp;
      /**
       * Gets the current context user
       * @name user
       * @type {*}
       * @memberOf ExpressDataContext
       */
      Object.defineProperty(context, 'user', {
        get: function() {
          return req.user;
        },
        set: function(value) {
          req.user = value;
        }
      });
      /**
       * @name context
       * @type {ExpressDataContext}
       * @memberOf req
       */
      Object.defineProperty(req, 'context', {
        get: function() {
          return context;
        }
      });
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
};
/**
 * Enables passport basic authorization based on @themost/data user management
 */ 

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
 * @returns {IApplication}
 */ 
ExpressDataContext.prototype.getApplication = function() {
    return this[applicationProperty];
};

module.exports.ExpressDataContext = ExpressDataContext;
module.exports.ExpressDataApplication = ExpressDataApplication;