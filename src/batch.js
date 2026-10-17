import {HttpNotAcceptableError, HttpNotFoundError, TraceUtils, HttpBadRequestError, Guid} from '@themost/common';
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
 * @param {import('express').Router} routerOrApplication - The Express routerOrApplication to use for handling batch requests. This is necessary to execute the batch requests using the same routerOrApplication as the main application.
 * @param {{headers:Array<string>=,min:number=,max:number=}=} options - Optional configuration options for the batch middleware.
 * @returns {import('express').Handler}
 */
function batch(routerOrApplication, options) {

    const batchRouter = Router();

    const opts = options || {
            min: 2,
            max: 25,
            headers: [
                'authorization',
                'content-type',
                'accept',
                'accept-language',
                'accept-encoding',
                'user-agent'
            ]
    };
    if (typeof opts.min !== 'number') {
        opts.min = 2;
    }
    if (typeof opts.max !== 'number') {
        opts.max = 25;
    }

    batchRouter.use(function batchInit(req, res, next) {
        // noinspection JSUnresolvedReference
        if (req.batchReq) {
            // override res.send and res.json to capture the response from the batch request
            res.json = function (body) {
                res.body = body;
                res.emit('batch.data', res);
            };
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
            const contentType = req.get('content-type');
            if (contentType !== 'application/json') {
                return next(new HttpNotAcceptableError());
            }
            const { min, max } = opts;
            // check if the request is a batch request
            const {requests: batchRequests} = req.body;
            if (Array.isArray(batchRequests)) {
                if (batchRequests.length < min || batchRequests.length > max) {
                    return next(new HttpNotAcceptableError(`Batch request must contain between ${min} and ${max} requests`));
                }
                // stage #1 - assign id and headers to batch requests
                batchRequests.forEach((batchRequest, index) => {
                    // assign id to batch request if not provided
                    batchRequest.id  = batchRequest.id || (index + 1).toString();
                    // convert relative urls to absolute urls by prefixing them with the original request url
                    if (batchRequest.url.startsWith('/')) {
                        batchRequest.url = new URL(batchRequest.url, req.protocol + '://' + req.get('host')).toString();
                    }
                    // validate that batch request has method and url properties
                    if (typeof batchRequest.method !== 'string' || typeof batchRequest.url !== 'string') {
                        throw new HttpBadRequestError(`Batch request at index ${index} is missing required properties 'method' and 'url'`);
                    }
                    // assign headers from the original request to the batch request
                    // note: only include headers that are specified in the options to prevent leaking sensitive information to the batch requests
                    batchRequest.headers = {
                        ...Object.keys(req.headers)
                            .filter(header => opts.headers.includes(header)).reduce((acc, header) => {
                                acc[header] = req.headers[header];
                                return acc;
                            }, {})
                    };
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
                    const validate = new Ajv({
                        strict: false
                    }).compile(BatchRequestMessageSchema);
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
                            // add events to capture the response from the batch request
                            childRes.on(
                                'batch.data',
                                /**
                                 * @this {ServerResponse}
                                 * @param response
                                 */
                                function (response) {
                                    this.end();
                                    this.emit('finish');
                                    resolve({
                                        id: batchRequest.id,
                                        status: response.statusCode,
                                        headers: response.headers,
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
                                    const errorResult = {
                                        id: batchRequest.id,
                                        status: error.status || error.statusCode || 500,
                                        body: Object.getOwnPropertyNames(error).reduce((acc, key) => {
                                            acc[key] = error[key];
                                            return acc;
                                        }, {})
                                    };
                                    // if the error has a constructor name, include it in the response body
                                    // noinspection JSUnresolvedReference
                                    if (error.constructor && error.constructor.name) {
                                        errorResult.body.name = error.constructor && error.constructor.name;
                                    }
                                    this.end();
                                    this.emit('finish');
                                    // noinspection JSUnresolvedReference
                                    if (this.req.batchReq && this.req.batchReq.atomicityGroup) {
                                        // if the batch request is part of an atomicity group, throw an error to trigger a transaction rollback for the entire group
                                        reject(errorResult);
                                    }
                                    resolve(errorResult);
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
                            return req.context.db.executeInTransactionAsync(async () => {
                                await Promise.sequence(requests.map((request) => {
                                    return () => {
                                        // parse body for assigning params in the batch request
                                        if (request.body && typeof request.body === 'object') {
                                            const body = JSON.parse(JSON.stringify(request.body), (key, value) => {
                                                if (typeof value === 'string' && value.startsWith('$$')) {
                                                    // split property path by dot notation to extract dataset and property name for value assignment
                                                    // e.g. "$$dataset.property" -> dataset: "dataset", property: "property"
                                                    const property = value.substring(2).split('.');
                                                    // get dataset name from the property path
                                                    const dataset = property.shift();
                                                    // get the result of the batch request that corresponds to the dataset name
                                                    const result = results.find(r => r.id === dataset);
                                                    if (result) {
                                                        const [val] = at(result.body, property);
                                                        return val;
                                                    } else {
                                                        throw new HttpBadRequestError(`Batch request with id "${dataset}" cannot be found for property reference "${value}"`);
                                                    }
                                                }
                                                return value;
                                            });
                                            request.body = request._body = body;
                                        }
                                        return executeBatchRequestAsync(request).then((intermediateResult) => {
                                            const result = results.find(r => r.id === request.id);
                                            if (result) {
                                                Object.assign(result, intermediateResult);
                                            }
                                        });
                                    }
                                }));
                            }).catch((atomicityGroupError) => {
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
                                            Object.assign(result, {
                                                status: 0,
                                                atomicityGroup
                                            });
                                        }
                                    }
                                });
                                const result = results.find(r => r.id === atomicityGroupError.id);
                                if (result) {
                                    Object.assign(result, atomicityGroupError);
                                }
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
                            return executeBatchRequestAsync(request);
                        }
                    })).then((results) => {
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