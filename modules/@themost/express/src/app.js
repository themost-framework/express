/**
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import path from "path";
import Symbol from "symbol";
import {Args, ConfigurationBase, ApplicationService, IApplication} from "@themost/common";
import {DefaultDataContext, DataConfigurationStrategy, ODataConventionModelBuilder, ODataModelBuilder} from "@themost/data";
import {ServicesConfiguration} from "./configuration";
import {serviceRouter} from './service';
import {BehaviorSubject} from 'rxjs';

const configurationProperty = Symbol('configuration');
const applicationProperty = Symbol('application');
const unattendedProperty = Symbol('unattended');

/**
 *
 * @param {ExpressDataApplication} app
 * @constructor
 */
class ApplicationServiceRouter extends ApplicationService {
    constructor(app) {
        super(app);
        Object.defineProperty(this, 'serviceRouter', {
            enumerable: false,
            configurable: false,
            writable: true,
            value: serviceRouter
        });
    }

}

/**
 * @class
 * @param {string=} configurationPath - The configuration directory path
 */
class ExpressDataApplication extends IApplication {
    constructor(configurationPath) {
        super();
        // add container property as behavior subject
        this.container = new BehaviorSubject(null);
        //initialize services
        Object.defineProperty(this, 'services', {
            value: { },
            enumerable: false,
            writable: false 
        });
        // initialize @themost/data configuration
        this[configurationProperty] = new ConfigurationBase(path.resolve(process.cwd(), configurationPath || 'config'));
        // use default data configuration strategy
        this[configurationProperty].useStrategy(DataConfigurationStrategy, DataConfigurationStrategy);
        // use default model builder
        this.useModelBuilder();
        // use application service router to allow service router extensions
        this.useService(ApplicationServiceRouter);
        // add service property as behavior subject
        this.serviceRouter = new BehaviorSubject(serviceRouter);
        // register configuration services
        ServicesConfiguration.config(this);

    }

    /**
     * Registers an application strategy e.g. a singleton service which is going to be used in application context
     * @param {*} serviceCtor
     * @param {*} strategyCtor
     * @returns IApplication
     */
    // eslint-disable-next-line no-unused-vars
    useStrategy(serviceCtor, strategyCtor) {
        Args.notFunction(strategyCtor,"Service constructor");
        Args.notFunction(strategyCtor,"Strategy constructor");
        this.services[serviceCtor.name] = new strategyCtor(this);
        return this;
    }

    /**
     * Returns the instance of ODataModelBuilder strategy which has been activated for this application
     * @returns ODataModelBuilder
     */
    useModelBuilder() {
        // initialize data model builder
        const builder = new ODataConventionModelBuilder(this.getConfiguration());
        // initialize model builder
        builder.initializeSync();
        // use model convention builder
        this.useStrategy(ODataModelBuilder, function() {
          return builder;
        });
    }

    /**
     * Returns the instance of ODataModelBuilder strategy which has been activated for this application
     * @returns ODataModelBuilder
     */
    getBuilder() {
      return this.getStrategy(ODataModelBuilder);
    }

    /**
     * Checks if the current application has a strategy of the given type
    * @param {*} serviceCtor
    * @returns {boolean}
    */
    // eslint-disable-next-line no-unused-vars
    hasStrategy(serviceCtor) {
        Args.notFunction(serviceCtor,"Service constructor");
        return Object.prototype.hasOwnProperty.call(this.services, serviceCtor.name);
    }

    /**
     * Gets an application strategy based on the given base service type
     * @param {*} serviceCtor
     * @return {*}
     */
    // eslint-disable-next-line no-unused-vars
    getStrategy(serviceCtor) {
        Args.notFunction(serviceCtor,"Service constructor");
        return this.services[serviceCtor.name];
    }

    /**
     * @returns {ConfigurationBase}
     */
    getConfiguration() {
        return this[configurationProperty];
    }

    /**
     * Creates a new data context based on the current configuration
     * @returns {ExpressDataContext}
     */
    createContext() {
        const context = new ExpressDataContext(this.getConfiguration());
        context[applicationProperty] = this;
        return context;
    }

    /**
     * Gets an application service based on the given base service type
     * @param {*} serviceCtor
     * @return {*}
     */
    getService(serviceCtor) {
        return this.getStrategy(serviceCtor);
    }

    /**
     * Checks if the current application has a strategy of the given type
     * @param {*} serviceCtor
     * @return {boolean}
     */
    hasService(serviceCtor) {
        return this.hasStrategy(serviceCtor);
    }

    /**
     * Registers an application service e.g. a singleton service which is going to be used in application context
     * @param {*} serviceCtor
     * @returns *
     */
    // eslint-disable-next-line no-unused-vars
    useService(serviceCtor) {
        return this.useStrategy(serviceCtor, serviceCtor);
    }

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
    execute(callable, callback) {
      // create context
      const context = this.createContext();
      //execute callable function with the context as parameter
      return callable(context, (err, value) => {
          // finalize data context
          context.finalize(() => {
              // and finally execute callback
             return callback(err, value);
           });
      });
    }

    /**
     * @param {Express=} app
     * @returns {*}
     */
    middleware(app) {
      const thisApp = this;
      // noinspection JSUnresolvedVariable
        if (app && app.engines) {
            // get express application engines
            const engines  = Object.keys(app.engines).map(key => {
                return {
                    name: key,
                    extension: /^\./.test(key) ? key.substr(1) : key,
                    render: function(name, options, callback) {
                        if (new RegExp('.' + this.extension + '$', 'ig').test(name) === false) {
                            return app.render(name.concat('.', this.extension), options, callback);
                        }
                        return app.render(name, options, callback);
                    }
                }
            });
            // set application configuration engines based on underlying application
            thisApp.getConfiguration().setSourceAt('engines', engines);
        } else {
            // set application configuration engines as empty array
            thisApp.getConfiguration().setSourceAt('engines', []);
        }
        // broadcast container
        this.container.next(app);
      return function dataContextMiddleware(req, res, next) {
          const context = new ExpressDataContext(thisApp.getConfiguration());
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
          req.on('end', () => {
            //on end
            if (req.context) {
              //finalize data context
              return req.context.finalize( () => {
                //
              });
            }
          });
          return next();
      };
    }

    /**
     * Converts an application URL into one that is usable on the requesting client. A valid application relative URL always start with "~/".
     * If the relativeUrl parameter contains an absolute URL, the URL is returned unchanged.
     * Note: An HTTP application base path may be set in settings/app/base configuration section. The default value is "/".
     * @param {string} appRelativeUrl - A string which represents an application relative URL like ~/login
     */
    resolveUrl(appRelativeUrl) {
        if (/^~\//.test(appRelativeUrl)) {
            let base = this.getConfiguration().getSourceAt("settings/app/base") || "/";
            base += /\/$/.test(base) ? '' : '/';
            return appRelativeUrl.replace(/^~\//, base);
        }
        return appRelativeUrl;
    }
}

/**
 * @class
 * @inherits DefaultDataContext
 * @param {ConfigurationBase=} configuration
 */
class ExpressDataContext extends DefaultDataContext {
    constructor(configuration) {
        super();
        this.getConfiguration = () => {
            return configuration;
        };
        const self = this;
        Object.defineProperty(this, 'application', {
           enumerable: false,
           configurable: false,
           get() {
               return self[applicationProperty];
           }
        });
    }

    /**
     * @param {*} strategyCtor
     */
    getStrategy(strategyCtor) {
        return this.getConfiguration().getStrategy(strategyCtor);
    }

    /**
     * @returns {IApplication}
     */
    getApplication() {
        return this[applicationProperty];
    }

    /**
     * @callback ExpressDataContext~unattendedCallable
     * @param {ExpressDataApplication~executeCallback} cb
     */

    /**
    * @callback ExpressDataContext~unattendedCallback
    * @param {Error=} err
    * @param {*=} value
    */

    /**
     * Executes the specified callable in unattended mode.
     * @param {ExpressDataContext~unattendedCallable} callable
     * @param {ExpressDataContext~unattendedCallback} callback
     */
    unattended(callable, callback) {
        const self = this;
        let interactiveUser;
        if (typeof callback !== 'function') {
            throw new Error('Invalid argument. Unattended callback must be a function.');
        }
        if (typeof callable !== 'function') {
            return callback(new Error('Invalid argument. Unattended callable must be a function.'));
        }
        // if context is already in attended mode execute callable
        if (self[unattendedProperty]) {
            try {
                return callable.bind(self)((err, result) => {
                    return callback(err, result);
                });
            }
            catch(err) {
                return callback(err);
            }
        }
        // get unattended execution account
        const account = self.getConfiguration().getSourceAt('settings/auth/unattendedExecutionAccount');
        // get interactive user
        if (self.user) {
            interactiveUser = Object.assign({}, self.user);
            // set interactive user
            self.interactiveUser = interactiveUser;
        }
        if (account) {
            self.user = { name:account, authenticationType:'Basic' };
        }
        try {
          // set unattended flag
            self[unattendedProperty] = true;
            return callable.bind(self)((err, result) => {
                //restore user
                if (interactiveUser) {
                    self.user = Object.assign({ }, interactiveUser);
                }
                delete self.interactiveUser;
                delete self[unattendedProperty];
                return callback(err, result);
            });
        }
        catch(err) {
            // restore user
            if (interactiveUser) {
                self.user = Object.assign({ }, interactiveUser);
            }
            // delete temporary interactive user
            delete self.interactiveUser;
            // delete unattended flag
            delete self[unattendedProperty];
            return callback(err);
        }
    }

    /**
     * @param {string} extension
     */
    engine(extension) {
        // format extension
        const ext = /^\./.test(extension) ? extension.substr(1): extension;
        // get engines
        const engines = this.getConfiguration().getSourceAt('engines') || [];
        // find engine by extension
        const engine = engines.find(x => {
            return x.extension === ext;
        });
        if (engine == null) {
            throw new Error('The specified template engine cannot be found.');
        }
        return engine;
    }
}
export {ExpressDataContext};
export {ExpressDataApplication};
export {ApplicationServiceRouter};
