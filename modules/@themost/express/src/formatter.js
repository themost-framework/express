/**
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import {AbstractMethodError, ApplicationService} from '@themost/common';
import {XSerializer} from '@themost/xml';
import {Readable} from 'stream';

class HttpResponseFormatter {
    /**
     * @param {*} data 
     */
    // eslint-disable-next-line no-unused-vars
    constructor(data) {
        Object.defineProperty(this, 'data', {
            configurable: true,
            enumerable: true,
            get: function() {
                return data;
            }
        });
    }
    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    // eslint-disable-next-line no-unused-vars
    execute(req, res) {
        throw new AbstractMethodError();
    }
}

class XmlResponseFormatter extends HttpResponseFormatter {
    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    // eslint-disable-next-line no-unused-vars
    execute(req, res) {
        if (this.data == null) {
            res.status(204).type('application/xml').send();
        }
        // get value
        const text = XSerializer.serialize(this.data).outerXML();
        // send data
        res.status(200).type('application/xml').send(text);
    }
}

class JsonResponseFormatter extends HttpResponseFormatter {
    /**
     * 
     * @param {Request} req 
     * @param {Response} res
     */
    // eslint-disable-next-line no-unused-vars
    execute(req, res) {
        res.json(this.data);
    }
}

class ResponseFormatterWrapper {
    constructor(container, data) {
        this.for = function(req, res) {
            const dictionary = {};
            container.formatters.forEach((value, key) => {
                const FormatterCtor = value;
                // noinspection JSCheckFunctionSignatures
                Object.defineProperty(dictionary, key, {
                    enumerable: true,
                    configurable: true,
                    get: function () {
                        return function() {
                            return new FormatterCtor(data).execute(req, res);
                        };
                    }
                });
            });
            return dictionary;
        }
    }
}

class ResponseFormatter extends ApplicationService {

    constructor(app) {
        super(app);
        // add default formatters
        // eslint-disable-next-line no-undef
        this.formatters = new Map();
        // add default formatter application/json
        this.formatters.set('default', JsonResponseFormatter);
        // add application/json formatter
        this.formatters.set('application/json', JsonResponseFormatter);
    }


    format(data) {
        return new ResponseFormatterWrapper(this, data);
    }

}

class StreamFormatter {

    /**
     * @param {*} data
     */
    constructor(data) {
        Object.defineProperty(this, 'data', {
            configurable: true,
            enumerable: true,
            get: function() {
                return data;
            }
        });
    }

    /**
     *
     * @param {Request} req
     * @param {Response} res
     * @param {NextFunction} next
     */
    // eslint-disable-next-line no-unused-vars
    execute(req, res, next) {
        // if stream has an attribute for contentType
        // set it, otherwise set application/octet-stream
        res.contentType(this.data.contentType || 'application/octet-stream');
        // get content-location header
        if (Object.prototype.hasOwnProperty.call(this.data, 'contentLocation')) {
            res.setHeader('Content-Location', this.data.contentLocation);
        }
        // get content-language header
        if (Object.prototype.hasOwnProperty.call(this.data, 'contentLanguage')) {
            res.setHeader('Content-Language', this.data.contentLanguage);
        }
        // get content-disposition header
        if (Object.prototype.hasOwnProperty.call(this.data, 'contentDisposition')) {
            res.setHeader('Content-Disposition', this.data.contentDisposition);
        }
        // get content-encoding header
        if (Object.prototype.hasOwnProperty.call(this.data, 'contentEncoding')) {
            res.setHeader('Content-Encoding', this.data.contentEncoding);
        }
        // get content-md5 header
        if (Object.prototype.hasOwnProperty.call(this.data, 'contentMD5')) {
            res.setHeader('Content-MD5', this.data.contentMD5);
        }

        if (this.data instanceof Buffer) {
            // convert to stream
            const stream = Readable.from(this.data);
            // pipe stream
            stream.pipe(res);
            // handle error
            stream.on('error', err => {
                return next(err);
            });
            // handle end
            stream.on('end', () => {
                return res.end();
            });
        } else {
            // pipe data
            this.data.pipe(res);
            // handle error
            this.data.on('error', err => {
                return next(err);
            });
            // handle end
            this.data.on('end', () => {
                return res.end();
            });
        }

    }
}

export {
    ResponseFormatter,
    HttpResponseFormatter,
    XmlResponseFormatter,
    JsonResponseFormatter,
    StreamFormatter
};
