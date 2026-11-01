// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2019-2023, THEMOST LP All rights reserved
import express from 'express';
import {LangUtils} from '@themost/common';
import {capitalize} from 'lodash';
import {HttpRoute, RouterService} from './route';
import {HttpConsumer, getControllerActions} from './controller';
import {HttpResult, HttpNextResult, HttpContentResult, HttpJsonResult} from './results';

/**
 * Finds the controller constructor of the given route
 * @param {RouterService} routerService
 * @param {HttpRoute} route
 * @returns {Function|undefined}
 */
function resolveController(routerService, route) {
    const controller = route.params.controller;
    if (typeof controller === 'function') {
        return controller;
    }
    if (typeof controller === 'string') {
        return routerService.getController(controller);
    }
}

/**
 * Finds the controller method which is going to handle the given action and HTTP method
 * @param {Function} controllerCtor
 * @param {string} action
 * @param {string} httpMethod e.g. GET, POST etc
 * @returns {{key: string, action: string, method: Function}|undefined}
 */
function resolveAction(controllerCtor, action, httpMethod) {
    if (typeof action !== 'string') {
        return;
    }
    const methodAttribute = `http${capitalize(httpMethod)}`;
    const actions = getControllerActions(controllerCtor).filter((item) => item.method[methodAttribute] === true);
    const lowerAction = action.toLowerCase();
    return actions.find((item) => item.action === action) ||
        actions.find((item) => item.action.toLowerCase() === lowerAction);
}

/**
 * Collects the values of controller method parameters by searching route parameters, query and body
 * @param {Function} method
 * @param {HttpRoute} route
 * @param {import('express').Request} req
 * @returns {*}
 */
function resolveParams(method, route, req) {
    const aliases = method.httpParamAlias || {};
    const sources = [
        route.params,
        req.query,
        req.body != null && typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : null
    ];
    return LangUtils.getFunctionParams(method).reduce((params, name) => {
        const alias = aliases[name] || name;
        const source = sources.find((item) => item != null && Object.prototype.hasOwnProperty.call(item, alias));
        params[name] = source ? source[alias] : undefined;
        return params;
    }, {});
}

/**
 * Executes the consumers (e.g. authorization or parameter validation) of the given controller method
 * @param {Function} method
 * @param {*} context
 * @param {*} params
 * @returns {Promise<void>}
 */
async function runConsumers(method, context, params) {
    const consumers = Object.keys(method).filter((key) => method[key] instanceof HttpConsumer);
    // authorize always runs first
    consumers.sort((a, b) => (a === 'authorize' ? -1 : 0) - (b === 'authorize' ? -1 : 0));
    for (const key of consumers) {
        await method[key].run(context, params);
    }
}

/**
 * Converts the value returned by a controller method to an HTTP result
 * @param {*} value
 * @returns {HttpResult}
 */
function toHttpResult(value) {
    if (value instanceof HttpResult) {
        return value;
    }
    if (value == null) {
        return new HttpContentResult(null);
    }
    if (typeof value === 'string') {
        return new HttpContentResult(value);
    }
    if (Buffer.isBuffer(value)) {
        const result = new HttpContentResult(value);
        result.contentType = 'application/octet-stream';
        result.contentEncoding = 'binary';
        return result;
    }
    return new HttpJsonResult(value);
}

/**
 * Returns an express router which handles requests by using the HTTP controllers and routes
 * registered in RouterService of the given application
 * @param {import('./app').ExpressDataApplication} app
 * @returns {import('express').Router}
 */
function controllerRouter(app) {
    if (app && typeof app.hasService === 'function' && app.hasService(RouterService) === false) {
        app.useService(RouterService);
    }
    const router = express.Router();
    router.use(async function controllerHandler(req, res, next) {
        try {
            const context = req.context;
            if (context == null) {
                return next();
            }
            const application = (typeof context.getApplication === 'function' && context.getApplication()) || app;
            /**
             * @type {RouterService}
             */
            const routerService = application && application.getService(RouterService);
            if (routerService == null) {
                return next();
            }
            for (const routeConfig of routerService.routes) {
                const route = new HttpRoute(routeConfig);
                if (route.isMatch(req.url) === false) {
                    continue;
                }
                const ControllerCtor = resolveController(routerService, route);
                if (ControllerCtor == null) {
                    continue;
                }
                const action = resolveAction(ControllerCtor, route.params.action, req.method);
                if (action == null) {
                    continue;
                }
                // set request and response
                Object.defineProperty(context, 'request', {
                    configurable: true,
                    enumerable: false,
                    writable: true,
                    value: req
                });
                Object.defineProperty(context, 'response', {
                    configurable: true,
                    enumerable: false,
                    writable: true,
                    value: res
                });
                const controller = new ControllerCtor();
                controller.context = context;
                const params = resolveParams(action.method, route, req);
                await runConsumers(action.method, context, params);
                const value = await action.method.apply(controller, Object.keys(params).map((key) => params[key]));
                if (value instanceof HttpNextResult) {
                    return next();
                }
                // the controller method has already handled the response
                if (value === undefined && (res.headersSent || res.writableEnded)) {
                    return;
                }
                await toHttpResult(value).execute(context);
                if (res.writableEnded === false) {
                    res.end();
                }
                return;
            }
            return next();
        } catch (err) {
            return next(err);
        }
    });
    return router;
}

export {
    controllerRouter
}
