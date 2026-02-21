import {HttpNotAcceptableError, HttpNotFoundError, TraceUtils, Guid, HttpBadRequestError} from '@themost/common';
import {URL} from 'url';
import { IncomingMessage, ServerResponse } from 'http';
import {Router} from 'express';

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
                const results = [];
                let index = 0;
                function executeNext() {
                    if (index < batchRequests.length) {
                        const batchRequest = batchRequests[index];
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
                                results.push({
                                    id: batchRequest.id,
                                    status: response.statusCode,
                                    headers: response.headers,
                                    body: response.body
                                });
                                index++;
                                this.end();
                                this.emit('finish');
                                executeNext();
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
                                if (error.constructor && error.constructor.name) {
                                    errorResult.body.name = error.constructor && error.constructor.name;
                                }
                                results.push(errorResult);
                                index++;
                                this.end();
                                this.emit('finish');
                                executeNext();
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
                    } else {
                        // all batch requests have been executed, return the results
                        res.json({ responses: results });
                    }
                }
                executeNext();
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