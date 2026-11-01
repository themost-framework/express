// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2019-2023, THEMOST LP All rights reserved
import {HttpJsonResult, HttpXmlResult, HttpContentResult, HttpRedirectResult, HttpNextResult} from './results';

/**
 * Wraps a function which is going to be executed against an HTTP context
 * e.g. a validation or an authorization check which runs before an HTTP controller action
 */
class HttpConsumer {
    /**
     * @param {function(...*):Promise<*>} callable
     */
    constructor(callable) {
        this.callable = callable;
    }

    /**
     * Executes callable against the given context
     * @param {*} context
     * @param {...*} args
     * @returns {Promise<*>}
     */
    run(context, ...args) {
        return this.callable.apply(context, args);
    }
}

/**
 * The base class of an HTTP controller
 */
class HttpController {
    constructor() {
        /**
         * @type {import('../app').ExpressDataContext}
         */
        this.context = undefined;
    }

    /**
     * @param {*} data
     * @returns {HttpJsonResult}
     */
    json(data) {
        return new HttpJsonResult(data);
    }

    /**
     * @param {*} data
     * @returns {HttpXmlResult}
     */
    xml(data) {
        return new HttpXmlResult(data);
    }

    /**
     * @param {*} content
     * @returns {HttpContentResult}
     */
    content(content) {
        return new HttpContentResult(content);
    }

    /**
     * @param {string} url
     * @returns {HttpRedirectResult}
     */
    redirect(url) {
        return new HttpRedirectResult(url);
    }

    /**
     * Passes control to the next request handler
     * @returns {HttpNextResult}
     */
    next() {
        return new HttpNextResult();
    }
}

/**
 * Returns the methods of the given controller constructor which have been annotated as HTTP controller actions
 * e.g. by using httpGet(), httpPost() etc
 * @param {Function} controllerCtor
 * @returns {Array<{key: string, action: string, method: Function}>}
 */
function getControllerActions(controllerCtor) {
    const results = [];
    const keys = new Set();
    let proto = controllerCtor.prototype;
    while (proto && proto !== Object.prototype) {
        for (const key of Object.getOwnPropertyNames(proto)) {
            if (key === 'constructor' || keys.has(key)) {
                continue;
            }
            keys.add(key);
            const descriptor = Object.getOwnPropertyDescriptor(proto, key);
            if (descriptor && typeof descriptor.value === 'function') {
                const method = descriptor.value;
                const isAction = Object.keys(method).some((name) => /^http[A-Z]/.test(name));
                if (isAction) {
                    results.push({
                        key,
                        action: method.httpAction || key,
                        method
                    });
                }
            }
        }
        proto = Object.getPrototypeOf(proto);
    }
    return results;
}

export {
    HttpConsumer,
    HttpController,
    getControllerActions
}
