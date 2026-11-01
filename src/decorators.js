// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2019-2023, THEMOST LP All rights reserved
import {TraceUtils, HttpBadRequestError, HttpUnauthorizedError} from '@themost/common';
import {DataTypeValidator, MinLengthValidator, MaxLengthValidator,
    MinValueValidator, MaxValueValidator, RequiredValidator, PatternValidator} from '@themost/data';
import {HttpConsumer} from './controller';

const HTTP_METHODS = [
    'httpGet',
    'httpHead',
    'httpOptions',
    'httpPost',
    'httpPut',
    'httpDelete',
    'httpPatch'
];

class DecoratorError extends Error {
    constructor(msg) {
        super(msg || 'Decorator is not valid on this declaration type.');
    }
}

/**
 * @param {*} descriptor
 */
function validateMethodDescriptor(descriptor) {
    if (descriptor == null || typeof descriptor.value !== 'function') {
        throw new DecoratorError();
    }
}

/**
 * Defines an HTTP controller
 * @param {string=} name The name of the controller
 * @returns {ClassDecorator}
 */
function httpController(name) {
    return (target) => {
        if (typeof target !== 'function') {
            throw new DecoratorError();
        }
        Object.defineProperty(target, 'httpController', {
            value: {
                name: name || target.name
            },
            configurable: true,
            enumerable: true,
            writable: true
        });
        return target;
    };
}

/**
 * @param {import('./decorators').HttpControllerMethodDeclaration} method
 * @param {import('./decorators').HttpMethodDecoratorExtras=} extras
 */
function httpMethod(method, extras) {
    return (target, key, descriptor) => {
        validateMethodDescriptor(descriptor);
        Object.assign(descriptor.value, method);
        if (extras) {
            if (typeof extras.name === 'string') {
                httpAction(extras.name)(target, key, descriptor);
            }
            if (Array.isArray(extras.params)) {
                for (const param of extras.params) {
                    httpParam(param)(target, key, descriptor);
                }
            }
        }
        return descriptor;
    };
}

/**
 * @param {import('./decorators').HttpMethodDecoratorExtras=} extras
 */
function httpGet(extras) {
    return httpMethod({
        httpGet: true,
        httpOptions: true,
        httpHead: true
    }, extras);
}

/**
 * @param {import('./decorators').HttpMethodDecoratorExtras=} extras
 */
function httpAny(extras) {
    return httpMethod(HTTP_METHODS.reduce((obj, httpKey) => {
        obj[httpKey] = true;
        return obj;
    }, {
        httpAny: true
    }), extras);
}

/**
 * @param {import('./decorators').HttpMethodDecoratorExtras=} extras
 */
function httpPost(extras) {
    return httpMethod({
        httpPost: true,
        httpOptions: true,
        httpHead: true
    }, extras);
}

/**
 * @param {import('./decorators').HttpMethodDecoratorExtras=} extras
 */
function httpPatch(extras) {
    return httpMethod({
        httpPatch: true,
        httpOptions: true,
        httpHead: true
    }, extras);
}

/**
 * @param {import('./decorators').HttpMethodDecoratorExtras=} extras
 */
function httpPut(extras) {
    return httpMethod({
        httpPut: true,
        httpOptions: true,
        httpHead: true
    }, extras);
}

/**
 * @param {import('./decorators').HttpMethodDecoratorExtras=} extras
 */
function httpDelete(extras) {
    return httpMethod({
        httpDelete: true,
        httpOptions: true,
        httpHead: true
    }, extras);
}

/**
 * @param {import('./decorators').HttpMethodDecoratorExtras=} extras
 */
function httpOptions(extras) {
    return httpMethod({
        httpOptions: true
    }, extras);
}

/**
 * @param {import('./decorators').HttpMethodDecoratorExtras=} extras
 */
function httpHead(extras) {
    return httpMethod({
        httpHead: true
    }, extras);
}

/**
 * Defines the name of an HTTP controller action
 * @param {string} name
 */
function httpAction(name) {
    if (typeof name !== 'string') {
        throw new TypeError('Action name must be a string');
    }
    return (target, key, descriptor) => {
        validateMethodDescriptor(descriptor);
        descriptor.value.httpAction = name;
        return descriptor;
    };
}

/**
 * Defines an alias for an HTTP controller action parameter
 * @param {string} name
 * @param {string} alias
 */
function httpParamAlias(name, alias) {
    if (typeof name !== 'string') {
        throw new TypeError('Parameter name must be a string');
    }
    if (typeof alias !== 'string') {
        throw new TypeError('Parameter alias must be a string');
    }
    return (target, key, descriptor) => {
        validateMethodDescriptor(descriptor);
        descriptor.value.httpParamAlias = descriptor.value.httpParamAlias || {};
        descriptor.value.httpParamAlias[name] = alias;
        return descriptor;
    };
}

/**
 * @param {*} context
 * @param {import('./decorators').HttpParamAttributeOptions} param
 * @param {*} value
 * @returns {*} A validation result or undefined
 */
function validateParam(context, param, value) {
    const validators = [];
    if (param.required === true) {
        validators.push(new RequiredValidator());
    }
    if (typeof param.type === 'string') {
        validators.push(new DataTypeValidator(param.type));
    }
    if (param.pattern != null) {
        validators.push(new PatternValidator(param.pattern));
    }
    if (typeof param.minLength === 'number') {
        validators.push(new MinLengthValidator(param.minLength));
    }
    if (typeof param.maxLength === 'number') {
        validators.push(new MaxLengthValidator(param.maxLength));
    }
    if (typeof param.minValue !== 'undefined') {
        validators.push(new MinValueValidator(param.minValue));
    }
    if (typeof param.maxValue !== 'undefined') {
        validators.push(new MaxValueValidator(param.maxValue));
    }
    for (const validator of validators) {
        validator.setContext(context);
        const validationResult = validator.validateSync(value);
        if (validationResult) {
            return validationResult;
        }
    }
}

/**
 * Defines validation rules for an HTTP controller action parameter
 * @param {import('./decorators').HttpParamAttributeOptions} options
 */
function httpParam(options) {
    if (options == null || typeof options !== 'object') {
        throw new TypeError('Parameter options must be an object');
    }
    if (typeof options.name !== 'string') {
        throw new TypeError('Parameter name must be a string');
    }
    return (target, key, descriptor) => {
        validateMethodDescriptor(descriptor);
        descriptor.value.httpParams = descriptor.value.httpParams || {};
        descriptor.value.httpParams[options.name] = Object.assign({ type: 'Text' }, options);
        if (typeof descriptor.value.httpParam === 'undefined') {
            /**
             * Validates action parameters. A consumer is executed with this=context and the action parameters as argument
             */
            descriptor.value.httpParam = new HttpConsumer(function(params) {
                const context = this;
                const httpParams = descriptor.value.httpParams;
                for (const name of Object.keys(httpParams)) {
                    const httpParamItem = httpParams[name];
                    const value = params ? params[name] : undefined;
                    const validationResult = validateParam(context, httpParamItem, value);
                    if (validationResult) {
                        TraceUtils.error(JSON.stringify(Object.assign({}, validationResult, {
                            param: httpParamItem,
                            request: context.request ? {
                                url: context.request.url,
                                method: context.request.method
                            } : undefined
                        })));
                        return Promise.reject(new HttpBadRequestError('Bad request parameter',
                            httpParamItem.message || validationResult.message));
                    }
                }
                return Promise.resolve();
            });
        }
        return descriptor;
    };
}

/**
 * Requires an authenticated user for executing an HTTP controller action
 * @param {boolean=} value
 */
function httpAuthorize(value) {
    return (target, key, descriptor) => {
        validateMethodDescriptor(descriptor);
        const authorize = typeof value === 'boolean' ? value : true;
        if (authorize) {
            descriptor.value.authorize = new HttpConsumer(function() {
                const context = this;
                if (context.user && context.user.name !== 'anonymous') {
                    return Promise.resolve();
                }
                return Promise.reject(new HttpUnauthorizedError());
            });
        } else {
            delete descriptor.value.authorize;
        }
        return descriptor;
    };
}

/**
 * Defines a consumer which is going to be executed before an HTTP controller action
 * @param {string} name
 * @param {Function|HttpConsumer} consumer
 */
function httpActionConsumer(name, consumer) {
    return (target, key, descriptor) => {
        validateMethodDescriptor(descriptor);
        if (consumer instanceof HttpConsumer) {
            descriptor.value[name] = consumer;
            return descriptor;
        }
        if (typeof consumer !== 'function') {
            throw new Error('Consumer must be a function.');
        }
        descriptor.value[name] = new HttpConsumer(consumer);
        return descriptor;
    };
}

/**
 * Defines an HTTP route which is going to be registered by RouterService.useController()
 * @param {string} url
 * @param {number=} index
 */
function httpRoute(url, index) {
    if (typeof url !== 'string') {
        throw new TypeError('Route path must be a string');
    }
    return (target, key, descriptor) => {
        validateMethodDescriptor(descriptor);
        const method = descriptor.value;
        if (method.httpAny !== true) {
            // set httpHead and httpOptions if they have not been defined
            if (Object.prototype.hasOwnProperty.call(method, 'httpHead') === false) {
                method.httpHead = true;
            }
            if (Object.prototype.hasOwnProperty.call(method, 'httpOptions') === false) {
                method.httpOptions = true;
            }
        }
        method.httpRoutes = method.httpRoutes || [];
        method.httpRoutes.push({
            path: url,
            index: index || 0
        });
        return descriptor;
    };
}

export {
    DecoratorError,
    httpController,
    httpGet,
    httpAny,
    httpPost,
    httpPut,
    httpPatch,
    httpDelete,
    httpOptions,
    httpHead,
    httpAction,
    httpRoute,
    httpParamAlias,
    httpParam,
    httpAuthorize,
    httpActionConsumer
}
