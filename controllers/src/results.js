// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2019-2023, THEMOST LP All rights reserved
import {PassThrough, Stream} from 'stream';
import {XSerializer} from '@themost/xml';

/**
 * @param {Buffer|Stream} input
 * @returns {Stream}
 */
function bufferToStream(input) {
    if (input instanceof Stream) {
        return input;
    }
    const stream = new PassThrough();
    stream.push(input);
    stream.push(null);
    return stream;
}

/**
 * @abstract
 * Represents the result of an HTTP controller action
 */
class HttpResult {
    constructor() {
        this.contentType = 'text/html';
        this.contentEncoding = 'utf8';
        /**
         * @type {number|undefined}
         */
        this.status = undefined;
    }

    /**
     * Writes the result to the response of the given context
     * @abstract
     * @param {{request: import('express').Request, response: import('express').Response}} context
     * @returns {Promise<void>}
     */
    // eslint-disable-next-line no-unused-vars
    async execute(context) {
        throw new Error('Method not implemented.');
    }
}

class HttpContentResult extends HttpResult {
    /**
     * @param {*} content
     */
    constructor(content) {
        super();
        this.content = content;
    }

    async execute(context) {
        if (this.content == null) {
            context.response.writeHead(this.status || 204);
            return;
        }
        context.response.writeHead(this.status || 200, { 'Content-Type': this.contentType });
        if (this.contentEncoding === 'binary') {
            return await new Promise((resolve, reject) => {
                const source = bufferToStream(this.content);
                source.on('end', () => {
                    return resolve();
                });
                source.on('error', (err) => {
                    return reject(err);
                });
                return source.pipe(context.response);
            });
        }
        context.response.write(this.content, this.contentEncoding);
    }
}

class HttpJsonResult extends HttpResult {
    /**
     * @param {*} data
     */
    constructor(data) {
        super();
        this.data = data;
        this.contentType = 'application/json';
    }

    async execute(context) {
        if (this.data == null) {
            context.response.writeHead(this.status || 204);
            return;
        }
        context.response.writeHead(this.status || 200, { 'Content-Type': this.contentType });
        context.response.write(JSON.stringify(this.data), this.contentEncoding);
    }
}

class HttpXmlResult extends HttpResult {
    /**
     * @param {*} data
     */
    constructor(data) {
        super();
        this.data = data;
        this.contentType = 'application/xml';
    }

    async execute(context) {
        if (this.data == null) {
            context.response.writeHead(this.status || 204);
            return;
        }
        context.response.writeHead(this.status || 200, { 'Content-Type': this.contentType });
        context.response.write(XSerializer.serialize(this.data), this.contentEncoding);
    }
}

class HttpRedirectResult extends HttpResult {
    /**
     * @param {string} url
     */
    constructor(url) {
        super();
        this.url = url;
        this.status = 302;
    }

    async execute(context) {
        context.response.writeHead(this.status, { 'Location': this.url });
    }
}

/**
 * A result which passes control to the next request handler
 */
class HttpNextResult extends HttpResult {
    // eslint-disable-next-line no-unused-vars
    async execute(context) {
        // do nothing
    }
}

export {
    HttpResult,
    HttpContentResult,
    HttpJsonResult,
    HttpXmlResult,
    HttpRedirectResult,
    HttpNextResult
}
