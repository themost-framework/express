import {HttpError, HttpNotFoundError, TraceUtils, HttpBadRequestError, Guid} from '@themost/common';
import {URL} from 'url';
import { IncomingMessage, ServerResponse } from 'http';
import {Router} from 'express';
import {schema as BatchRequestMessageSchema} from './batch.schema';
import Ajv from 'ajv';
import '@themost/promise-sequence';
import at from 'lodash/at';

/**
 * Represents a single request inside a batch payload.
 *
 * @interface BatchRequestMessage
 * @property {string} id - Unique identifier for the batched request.
 * @property {string} method - HTTP method (e.g. `GET`, `POST`, `PUT`, `DELETE`).
 * @property {string} url - Request URL or path (relative to the batch endpoint).
 * @property {Record<string, string>} headers - Key/value map of request headers.
 * @property {*} [body] - Optional request body / payload.
 * @property {string} [atomicityGroup] - Optional atomicity group identifier; requests in the same group should be executed atomically.
 * @property {string[]} [dependsOn] - Optional list of other request `id`s this request depends on.
 */

/**
 * Custom IncomingMessage class to represent individual requests within the batch payload.
 * This allows us to create child request objects that can be processed by the Express router as if they were real HTTP requests.
 */
class BatchIncomingMessage extends IncomingMessage {
    /**
     * @param {import('express').Request} req
     */
    constructor(req) {
        super();
        const { method, url, body, headers } = req;
        this.method = method;
        const uri = new URL(url, 'http://localhost');
        this.url = uri.pathname;
        this.body = body;
        // use _body to disable body parsing in the child request since the body is already parsed in the parent request
        if (this.method === 'POST' || this.method === 'PUT' || this.method === 'PATCH') {
            this._body = this.body || {};
        }
        this.query = Object.fromEntries(uri.searchParams.entries());
        this.headers = headers || {};
        if (this.body) {
            this.headers['content-length'] = Buffer.byteLength(JSON.stringify(this.body)).toString();
        } else {
            delete this.headers['content-length'];
        }
    }
}

class BatchServerResponse extends ServerResponse {
    /**
     * @param {IncomingMessage} req
     */
    constructor(req) {
        super(req);
        this.statusCode = 200;
        this.headers = {};
    }
    status(code) {
        this.statusCode = code;
        return this;
    }

    write(chunk, encoding, callback) {
        super.write(chunk, encoding, callback);
    }

    end(callback) {
        super.end(callback);
    }

    send(body) {
        this.emit('data', {
            status: this.statusCode,
            headers: this.headers,
            body
        });
    }
    json(body) {
        this.setHeader('Content-Type', 'application/json');
        this.send(body);
    }
    set(field, value) {
        this.headers[field] = value;
        return this;
    }
    setHeader(field, value) {
        this.set(field, value);
    }
    get(field) {
        return this.headers[field];
    }
    getHeader(field) {
        return this.headers[field];
    }
}

/**
 * The default collection of headers which are inherited by batch requests from the original request
 * @type {Array<string>}
 */
const DefaultInheritedHeaders = [
    'authorization',
    'content-type',
    'accept',
    'accept-language',
    'accept-encoding',
    'user-agent'
];

/**
 * The collection of headers which identify the user of the original request.
 * These headers are always inherited by batch requests and cannot be defined by them.
 * @type {Array<string>}
 */
const IdentityHeaders = [
    'authorization',
    'cookie'
];

/**
 * Validates batch request messages
 * @type {import('ajv').ValidateFunction}
 */
const validateBatchRequest = new Ajv({
    strict: false
}).compile(BatchRequestMessageSchema);

/**
 * Overrides the response methods of a batch child response in order to capture its body
 * and emit a single `batch.data` event when the response is completed
 * by using res.json(), res.send(), res.end() or by piping a stream to it.
 * @param {ServerResponse} res
 */
function captureResponse(res) {
    const chunks = [];
    let completed = false;
    const complete = (body) => {
        if (completed) {
            return;
        }
        completed = true;
        res.body = body;
        res.emit('batch.data', res);
    };
    Object.assign(res, {
        json(body) {
            if (!res.getHeader('Content-Type')) {
                res.setHeader('Content-Type', 'application/json');
            }
            complete(body);
            return res;
        },
        send(body) {
            if (body != null && typeof body === 'object' && !Buffer.isBuffer(body)) {
                return res.json(body);
            }
            if (body != null) {
                chunks.push(Buffer.isBuffer(body) ? body : Buffer.from(String(body)));
            }
            return res.end();
        },
        write(chunk, encoding, callback) {
            if (typeof encoding === 'function') {
                callback = encoding;
                encoding = undefined;
            }
            if (chunk != null) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
            }
            if (typeof callback === 'function') {
                callback();
            }
            return true;
        },
        end(chunk, encoding, callback) {
            if (typeof chunk === 'function') {
                callback = chunk;
                chunk = undefined;
            } else if (typeof encoding === 'function') {
                callback = encoding;
                encoding = undefined;
            }
            if (chunk != null) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
            }
            let body;
            if (chunks.length > 0) {
                const buffer = Buffer.concat(chunks);
                const contentType = String(res.getHeader('Content-Type') || '');
                // return textual content as string and binary content as base64 string
                body = /^text\/|json|xml/i.test(contentType) || contentType === '' ? buffer.toString() : buffer.toString('base64');
            }
            complete(body);
            if (typeof callback === 'function') {
                callback();
            }
            return res;
        }
    });
}

/**
 * Converts an error to a batch response item
 * @param {*} error
 * @param {boolean} includeStack
 * @returns {{status: number, body: *}}
 */
function toErrorResult(error, includeStack) {
    const body = Object.getOwnPropertyNames(error).filter((key) => {
        return key !== 'stack' || includeStack;
    }).reduce((acc, key) => {
        acc[key] = error[key];
        return acc;
    }, {});
    // if the error has a constructor name, include it in the response body
    if (error.constructor && error.constructor.name) {
        body.name = error.constructor.name;
    }
    return {
        status: error.status || error.statusCode || 500,
        body
    };
}

/**
 * @param {import('express').Router} routerOrApplication - The Express routerOrApplication to use for handling batch requests. This is necessary to execute the batch requests using the same routerOrApplication as the main application.
 * @param {{headers:Array<string>=,min:number=,max:number=}=} options - Optional configuration options for the batch middleware.
 * @returns {import('express').Handler}
 */
function batch(routerOrApplication, options) {

    const batchRouter = Router();

    const opts = Object.assign({}, options);
    if (typeof opts.min !== 'number') {
        opts.min = 2;
    }
    if (typeof opts.max !== 'number') {
        opts.max = 25;
    }
    if (Array.isArray(opts.headers) === false) {
        opts.headers = DefaultInheritedHeaders;
    }
    opts.headers = opts.headers.map((header) => header.toLowerCase());

    batchRouter.use(function batchInit(req, res, next) {
        // noinspection JSUnresolvedReference
        if (req.batchReq) {
            res.on('error', function (err) {
                res.emit('batch.error', err);
            });
            res.on('finish', function () {
               TraceUtils.debug(
                     `Batch request [${req.batchReq.id}] ${req.batchReq.method} ${req.batchReq.url} ${res.statusCode}`
               )
            });
        }
        return next();
    });

    batchRouter.post('/\\$batch', function(req, res, next) {
        try {
            // noinspection JSUnresolvedReference
            if (req.batchReq) {
                return next(new HttpBadRequestError('Nested batch requests are not supported'));
            }
            if (!req.is('application/json')) {
                return next(new HttpError(415));
            }
            const { min, max } = opts;
            // include error stack in batch responses only in development or test environment
            const includeStack = ['development', 'test'].includes(req.app && req.app.get('env'));
            // check if the request is a batch request
            const {requests: batchRequests} = req.body;
            if (Array.isArray(batchRequests)) {
                if (batchRequests.length < min || batchRequests.length > max) {
                    return next(new HttpBadRequestError(`Batch request must contain between ${min} and ${max} requests`));
                }
                // stage #1 - assign id and headers to batch requests
                batchRequests.forEach((batchRequest, index) => {
                    // assign id to batch request if not provided
                    batchRequest.id  = batchRequest.id || (index + 1).toString();
                    // validate that batch request has method and url properties
                    if (typeof batchRequest.method !== 'string' || typeof batchRequest.url !== 'string') {
                        throw new HttpBadRequestError(`Batch request at index ${index} is missing required properties 'method' and 'url'`);
                    }
                    // convert relative urls to absolute urls
                    // e.g. "/api/users" is resolved against the host of the original request
                    // and "users" is resolved against the service root (the base url of the batch endpoint)
                    const serviceRoot = new URL(req.baseUrl.replace(/\/$/, '') + '/', req.protocol + '://' + req.get('host'));
                    let uri;
                    try {
                        uri = new URL(batchRequest.url, serviceRoot);
                    } catch (err) {
                        throw new HttpBadRequestError(`Batch request at index ${index} has an invalid url`);
                    }
                    // a batch request is allowed to target only resources of the current service
                    // e.g. a request to another host or to a path outside the service root (even through "../" segments) is prohibited
                    if (uri.origin !== serviceRoot.origin || uri.pathname.startsWith(serviceRoot.pathname) === false) {
                        throw new HttpBadRequestError(`Batch request at index ${index} targets a resource outside of the current service`);
                    }
                    batchRequest.url = uri.toString();
                    // assign headers from the original request to the batch request
                    // note: only include headers that are specified in the options to prevent leaking sensitive information to the batch requests
                    // note: identity headers (authorization, cookie) are always inherited from the original request
                    const inheritedHeaders = Object.keys(req.headers)
                        .filter(header => IdentityHeaders.includes(header) || opts.headers.includes(header)).reduce((acc, header) => {
                            acc[header] = req.headers[header];
                            return acc;
                        }, {});
                    // headers defined by the batch request itself take precedence over inherited headers
                    const ownHeaders = batchRequest.headers != null && typeof batchRequest.headers === 'object' ? Object.keys(batchRequest.headers).reduce((acc, header) => {
                        acc[header.toLowerCase()] = batchRequest.headers[header];
                        return acc;
                    }, {}) : {};
                    // a batch request cannot define its own identity headers because all batch requests
                    // are executed on behalf of the user of the original request and share the same data context
                    const identityHeader = IdentityHeaders.find((header) => Object.prototype.hasOwnProperty.call(ownHeaders, header));
                    if (identityHeader) {
                        throw new HttpBadRequestError(`Batch request at index ${index} cannot define ${identityHeader} header. This header is inherited from the batch request.`);
                    }
                    batchRequest.headers = Object.assign(inheritedHeaders, ownHeaders);
                });
                // stage #2 - assign atomicity group to batch requests and execute them sequentially
                const shouldAssignAtomicityGroup = batchRequests.some(batchRequest => batchRequest.atomicityGroup != null);
                if (shouldAssignAtomicityGroup) {
                    batchRequests.forEach((batchRequest, index) => {
                        if (batchRequest.atomicityGroup == null) {
                            throw new HttpBadRequestError(`Batch request at index ${index} is missing required property 'atomicityGroup' which is required when at least one batch request contains an 'atomicityGroup' property`);
                        }
                    });
                }
                // stage #3 - validate that all batch requests with the same atomicity group have the same method and url properties
                /**
                 * @type {{[k:string]:Array<BatchRequestMessage>}}
                 */
                const atomicityGroups = {};
                batchRequests.forEach((batchRequest) => {
                    // validate batch request against the schema
                    const validate = validateBatchRequest;
                    if (validate(batchRequest) === false) {
                        const error = new HttpBadRequestError(`Batch request with id ${batchRequest.id} is invalid`);
                        TraceUtils.error(`Batch request with url "${batchRequest.url}" is invalid`);
                        validate.errors.forEach(validationError => {
                            TraceUtils.error(`Validation error: ${validationError.instancePath} ${validationError.message}.`);
                        })
                        throw error;
                    }
                    if (batchRequest.atomicityGroup != null) {
                        if (Object.hasOwnProperty.call(atomicityGroups, batchRequest.atomicityGroup) === false) {
                            atomicityGroups[batchRequest.atomicityGroup] = [];
                        }
                        // push batch request to the corresponding atomicity group
                        atomicityGroups[batchRequest.atomicityGroup].push(batchRequest);
                    }
                });
                const results = batchRequests.map(({id}) => {
                    return {
                        id,
                    }
                });
                /**
                 * Resolves property references e.g. "$$1.id" of the body of the given batch request
                 * by using the results of the batch requests that have already been executed
                 * @param {BatchRequestMessage} request
                 */
                function resolveReferences(request) {
                    if (request.body == null || typeof request.body !== 'object') {
                        return;
                    }
                    const body = JSON.parse(JSON.stringify(request.body), (key, value) => {
                        if (typeof value === 'string' && value.startsWith('$$')) {
                            // split property path by dot notation to extract dataset and property name for value assignment
                            // e.g. "$$dataset.property" -> dataset: "dataset", property: "property"
                            const property = value.substring(2).split('.');
                            // get dataset name from the property path
                            const dataset = property.shift();
                            // get the result of the batch request that corresponds to the dataset name
                            const result = results.find(r => r.id === dataset);
                            if (result == null) {
                                throw new HttpBadRequestError(`Batch request with id "${dataset}" cannot be found for property reference "${value}"`);
                            }
                            // a result without status has not been executed yet
                            if (result.status == null) {
                                throw new HttpBadRequestError(`Batch request with id "${dataset}" has not been executed before batch request "${request.id}" and cannot be used for property reference "${value}"`);
                            }
                            // a referenced request that has failed cannot be used
                            if (result.status < 200 || result.status >= 300) {
                                throw new HttpError(424, `Batch request with id "${dataset}" has failed and cannot be used for property reference "${value}"`);
                            }
                            const [val] = at(result.body, property);
                            return val;
                        }
                        return value;
                    });
                    request.body = request._body = body;
                }
                function executeBatchRequestAsync(batchRequest) {
                    return new Promise((resolve, reject) => {
                        try {
                            // create child request
                            const childReq = new BatchIncomingMessage(batchRequest);
                            // inherit context from the original request
                            Object.defineProperty(childReq, 'context', {
                                get() {
                                    return req.context;
                                },
                                configurable: true
                            });
                            Object.defineProperty(childReq, 'parentReq', {
                                get() {
                                    return req;
                                },
                                configurable: true
                            });
                            Object.defineProperty(childReq, 'batchReq', {
                                get() {
                                    return batchRequest;
                                },
                                configurable: true
                            });
                            // create a new response object for the batch request
                            const childRes = new BatchServerResponse(childReq);
                            // capture the response of the batch request
                            // note: response methods are defined as own properties because expressInit middleware
                            // replaces the prototype of the response object with the application response
                            captureResponse(childRes);
                            // add events to capture the response from the batch request
                            childRes.on(
                                'batch.data',
                                /**
                                 * @this {ServerResponse}
                                 * @param response
                                 */
                                function (response) {
                                    this.emit('finish');
                                    resolve({
                                        id: batchRequest.id,
                                        status: response.statusCode,
                                        headers: response.getHeaders(),
                                        body: response.body
                                    });
                                });
                            childRes.on(
                                'batch.error',
                                /**
                                 * @this {ServerResponse}
                                 * @param {*} error
                                 */
                                function (error) {
                                    const errorResult = Object.assign(toErrorResult(error, includeStack), {
                                        id: batchRequest.id
                                    });
                                    this.emit('finish');
                                    if (batchRequest.atomicityGroup) {
                                        // if the batch request is part of an atomicity group, throw an error to trigger a transaction rollback for the entire group
                                        return reject(errorResult);
                                    }
                                    return resolve(errorResult);
                                });
                            // noinspection JSUnresolvedReference
                            const router = routerOrApplication._router || routerOrApplication;
                            router.handle(childReq, childRes, function (err) {
                                // if the batch request was not handled, return a 404 error
                                if (err == null) {
                                    return childRes.emit('batch.error', new HttpNotFoundError());
                                }
                                Object.assign(err, {
                                    message: err.message
                                });
                                childRes.emit('batch.error', err);
                            });
                        } catch(err) {
                            return reject(err);
                        }

                    });
                }
                // check atomicity groups for consistency
                if (Object.keys(atomicityGroups).length > 0) {
                    // create a map of atomicity groups to functions that execute the batch requests in the group sequentially within a transaction
                    const sources = Object.keys(atomicityGroups).map((atomicityGroup) => {
                        // get batch requests for the atomicity group
                        const requests = atomicityGroups[atomicityGroup];
                        // return a function that executes the batch requests in the atomicity group sequentially within a transaction
                        return () => {
                            // execute batch requests in the atomicity group sequentially within a transaction
                            Object.assign(req.context.db, {
                                identifier: Guid.newGuid().toString()
                            });
                            // holds the batch request which is currently being executed
                            let currentRequest = null;
                            return req.context.db.executeInTransactionAsync(async () => {
                                await Promise.sequence(requests.map((request) => {
                                    return () => {
                                        currentRequest = request;
                                        resolveReferences(request);
                                        return executeBatchRequestAsync(request).then((intermediateResult) => {
                                            const result = results.find(r => r.id === request.id);
                                            if (result) {
                                                Object.assign(result, intermediateResult);
                                            }
                                        });
                                    }
                                }));
                            }).catch((err) => {
                                let atomicityGroupError = err;
                                const isBatchResult = err != null && err.id != null && requests.some((request) => request.id === err.id);
                                if (isBatchResult === false) {
                                    // the error was not produced by a batch request (e.g. an invalid property reference
                                    // or a transaction error), so assign it to the request which was being executed
                                    TraceUtils.error(`An error occurred while executing atomicity group "${atomicityGroup}"`);
                                    TraceUtils.error(err);
                                    const failedRequest = currentRequest || requests[0];
                                    atomicityGroupError = Object.assign(toErrorResult(err || new Error('Unknown error'), includeStack), {
                                        id: failedRequest.id
                                    });
                                }
                                // if any request in the atomicity group fails, capture the error for all requests in the group
                                requests.forEach((request) => {
                                    const result = results.find(r => r.id === request.id);
                                    if (result) {
                                        if (result.id === atomicityGroupError.id) {
                                            Object.assign(result, atomicityGroupError, {
                                                atomicityGroup
                                            });
                                        } else {
                                            // for requests that belongs to the same atomicity group but did not cause the error, set status to 0 to indicate that they were not executed due to the failure of another request in the same atomicity group
                                            // and remove any response data since their changes have been rolled back
                                            delete result.body;
                                            delete result.headers;
                                            Object.assign(result, {
                                                status: 0,
                                                atomicityGroup
                                            });
                                        }
                                    }
                                });
                            });
                        }
                    });
                    Promise.sequence(sources).then(() => {
                        res.json({ responses: results });
                    }).catch((err) => {
                        next(err);
                    });
                } else {
                    // no atomicity groups, execute batch requests sequentially
                    void Promise.sequence(batchRequests.map((request) => {
                        return () => {
                            const result = results.find(r => r.id === request.id);
                            try {
                                resolveReferences(request);
                            } catch (err) {
                                // an invalid property reference fails only the current batch request
                                return Object.assign(result, toErrorResult(err, includeStack), {
                                    id: request.id
                                });
                            }
                            return executeBatchRequestAsync(request).then((intermediateResult) => {
                                return Object.assign(result, intermediateResult);
                            });
                        }
                    })).then(() => {
                        res.json({ responses: results });
                    }).catch((err) => {
                        next(err);
                    });
                }
            } else {
                // not a batch request, continue to the next middleware
                return next();
            }
        } catch (err) {
            return next(err);
        }
    });
    return batchRouter;
}

export {
    batch
}