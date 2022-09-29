/**
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
///
import {ModuleLoaderStrategy, TraceUtils} from '@themost/common';
// noinspection JSUnusedGlobalSymbols
/**
 * @class
 */
class ServicesConfiguration {
    /**
     * Adds application services as they are defined in application configuration services section
     * @example
     * # config/app.json
     * {
     *      "services": [
     *          { "serviceType":"./services/my-service#MyService" },
     *          { "strategyType":"./services/my-service#MyStrategy", "serviceType":"./services/my-service#MyService" }
     *      ]
     * }
     *
     * @param {ExpressDataApplication} app
     */
    static config(app) {
        /**
         * @type {Array<ServiceConfigurationElement>}
         */
        const services = app.getConfiguration().getSourceAt('services');
        if (Array.isArray(services)) {
            services.forEach(
                /**
                 * @param {ServiceConfigurationElement} x
                 */
                x => {
                    if (Object.prototype.hasOwnProperty.call(x, '-serviceType')) {
                        return;
                    }
                    if (Object.prototype.hasOwnProperty.call(x, 'serviceType') === false) {
                        throw new Error('Invalid configuration. Service type cannot be empty at this context.');
                    }
                    const strategyType = x.strategyType || x.serviceType;
                    let StrategyCtor;
                    let ServiceCtor;
                    let typeModule;
                    let typeCtor;
                    let hashIndex = strategyType.indexOf('#');
                    if (hashIndex>-1) {
                        typeModule = app.getConfiguration().getStrategy(ModuleLoaderStrategy).require(strategyType.substr(0,hashIndex));
                        typeCtor = strategyType.substr(hashIndex+1,strategyType.length-hashIndex);
                        StrategyCtor = typeModule[typeCtor];
                    }
                    else {
                        StrategyCtor = app.getConfiguration().getStrategy(ModuleLoaderStrategy).require(strategyType);
                    }
                    hashIndex = x.serviceType.indexOf('#');
                    if (hashIndex>-1) {
                        typeModule = app.getConfiguration().getStrategy(ModuleLoaderStrategy).require(x.serviceType.substr(0,hashIndex));
                        typeCtor = x.serviceType.substr(hashIndex+1,x.serviceType.length-hashIndex);
                        ServiceCtor = typeModule[typeCtor];
                    }
                    else {
                        ServiceCtor = app.getConfiguration().getStrategy(ModuleLoaderStrategy).require(x.serviceType);
                    }
                    // if strategy is not defined
                    if (StrategyCtor == null) {
                        // use service
                        app.useService(ServiceCtor);
                    }
                    else {
                        // otherwise use strategy
                        app.useStrategy(ServiceCtor, StrategyCtor);
                    }
            });
        }
    }
}

export {ServicesConfiguration};
