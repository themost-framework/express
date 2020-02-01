/**
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import {AbstractMethodError, ApplicationService} from '@themost/common';
import {XSerializer} from '@themost/xml';

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
    async execute(req, res) {
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
    async execute(req, res) {
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
     * @param {Function} next 
     */
    // eslint-disable-next-line no-unused-vars
    async execute(req, res) {
        res.json(this.data);
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
        // add application/xml formatter
        this.formatters.set('application/xml', XmlResponseFormatter);
    }

    /**
     * Returns a formatter object for Response.format() method
     * @param {Response} res
     * @param {*} data 
     */
    for(data, req, res, next) {
        const dictionary = {};
        this.formatters.forEach((value, key) => {
            const FormatterCtor = value;
            Object.defineProperty(dictionary, key, {
                enumerable: true,
                configurable: true,
                get: function () {
                    return function() {
                        return new FormatterCtor(data).execute(req, res).catch( err => {
                            return next(err);
                        });
                    }
                }
            });
        });
        return dictionary;
    }

}

export {ResponseFormatter, HttpResponseFormatter, XmlResponseFormatter, JsonResponseFormatter};