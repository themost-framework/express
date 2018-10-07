var util = require("util");
var path = require("path");
var DefaultDataContext = require("@themost/data/data-context").DefaultDataContext;
var ConfigurationBase = require("@themost/common/config").ConfigurationBase;
var DataConfigurationStrategy = require("@themost/data/data-configuration").DataConfigurationStrategy;

/**
 * @class
 * @param {ConfigurationBase=} configuration
 */ 
function ExpressDataContext(configuration) {
    ExpressDataContext.super_.bind(this)();
    this.getConfiguration = function() {
        return configuration;
    }
}
util.inherits(ExpressDataContext, DefaultDataContext);
/**
 * @param {Function} strategyCtor
 */ 
ExpressDataContext.prototype.getStrategy = function(strategyCtor) {
    return this.getConfiguration().getStrategy(strategyCtor);
}

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
    req.on('end', ()=> {
      //on end
      if (req.context) {
        //finalize data context
        return req.context.finalize(()=> {
          //
        });
      }
    });
    return next();
  }
}

module.exports.ExpressDataContext = ExpressDataContext;
module.exports.dataContext = dataContext;