/**
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import express from 'express';
import {ODataModelBuilder} from '@themost/data';

const serviceRouter = express.Router();

import {getEntitySetIndex} from "./middleware";
import {getMetadataDocument} from "./middleware";
import {bindEntitySet} from "./middleware";
import {getEntitySet} from "./middleware";
import {postEntitySet} from "./middleware";
import {deleteEntitySet} from "./middleware";
import {getEntity} from "./middleware";
import {postEntity} from "./middleware";
import {deleteEntity} from "./middleware";
import {getEntityNavigationProperty} from "./middleware";
import {getEntitySetFunction} from "./middleware";
import {postEntitySetFunction} from "./middleware";
import {postEntitySetAction} from "./middleware";
import {getEntityFunction} from "./middleware";
import {postEntityAction} from "./middleware";
import {onServiceHeaders} from "./middleware";
import url from 'url';
/**
 *
 * @param {ReadableStream} stream
 * @returns {Promise<Buffer>}
 */
function readStream(stream) {
    // eslint-disable-next-line no-undef
    return new Promise((resolve, reject) => {
        let buffers = [];
        stream.on('data', (d) => {
            buffers.push(d);
        });
        stream.on('end', () => {
            return resolve(Buffer.concat(buffers));
        });
        stream.on('error', (err) => {
            return reject(err);
        });
    });
}

serviceRouter.use((req, res, next) => {
    if (req.context && req.context.request == null) {
        // set context request
        // to be compatible with @themost/web context
        Object.defineProperty(req.context, 'request', {
            enumerable: false,
            configurable: true,
            get: function() {
                return req;
            }
        });
    }
    if (req.context && req.context.response == null) {
        // set context response
        // to be compatible with @themost/web context
        Object.defineProperty(req.context, 'response', {
            enumerable: false,
            configurable: true,
            get: function() {
                return res;
            }
        });
    }
    if (req.context != null) {
         /**
         * get current model builder
         * @type {ODataModelBuilder}
         */
        const builder = req.context.getApplication().getStrategy(ODataModelBuilder);
        if (typeof builder.getContextLink !== 'function') {
            builder.hasContextLink(
                /**
                 * @param {ExpressRequestContext} context 
                 */
                function(context) {
                    let serviceOrigin = context.getApplication().getConfiguration().getSourceAt('settings/builder/serviceOrigin');
                    // get serviceRoot from applicatiom configuration
                    if (serviceOrigin) {
                        // get absolute URI
                        return new URL('$metadata', serviceOrigin);
                    }
                }
            );
        }
    }
    return next();
   
});

serviceRouter.use(onServiceHeaders());

/* GET /  */
serviceRouter.get('/', getEntitySetIndex());

/* GET /  */
serviceRouter.get('/\\$metadata', getMetadataDocument());

/* GET /:entitySet  */
serviceRouter.get('/:entitySet', bindEntitySet(), getEntitySet());

/* POST /:entitySet insert or update a data object or an array of data objects. */
serviceRouter.post('/:entitySet', bindEntitySet(), postEntitySet());

/* PUT /:entitySet insert or update a data object or an array of data objects. */
serviceRouter.put('/:entitySet', bindEntitySet(), postEntitySet());

/* DELETE /:entitySet removes a data object or an array of data objects. */
serviceRouter.delete('/:entitySet', bindEntitySet(), deleteEntitySet());

/* GET /:entitySet/:entitySetFunction/  */
serviceRouter.get('/:entitySet/:entitySetFunction', bindEntitySet(), getEntitySetFunction());

/* POST /:entitySet/:entitySetAction/  */
serviceRouter.post('/:entitySet/:entitySetAction', bindEntitySet(), postEntitySetAction());

/* GET /:entitySet/:entitySetFunction/:entityFunction  */
serviceRouter.get('/:entitySet/:entitySetFunction/:entityFunction', bindEntitySet(), getEntitySetFunction());

/* GET /:entitySet/:entitySetFunction/:entityAction  */
serviceRouter.post('/:entitySet/:entitySetFunction/:entityAction', bindEntitySet(), postEntitySetFunction());

/* GET /:entitySet/:entitySetFunction/:navigationProperty  */
serviceRouter.get('/:entitySet/:entitySetFunction/:navigationProperty', bindEntitySet(), getEntitySetFunction());

/* GET /:entitySet/:id/:entityFunction  */
serviceRouter.get('/:entitySet/:id/:entityFunction', bindEntitySet(), getEntityFunction());

/* POST /:entitySet/:id/:entityAction  */
serviceRouter.post('/:entitySet/:id/:entityAction', bindEntitySet(), postEntityAction());

/* GET /:entitySet/:id/:navigationProperty  */
serviceRouter.get('/:entitySet/:id/:navigationProperty', bindEntitySet(), getEntityNavigationProperty());

/* GET /:entitySet/:id  */
serviceRouter.get('/:entitySet/:id', bindEntitySet(), getEntity());

/* POST /:entitySet/:id posts a data object by id. */
serviceRouter.post('/:entitySet/:id', bindEntitySet(), postEntity());

/* DELETE /:entitySet/:id deletes a data object by id. */
serviceRouter.delete('/:entitySet/:id', bindEntitySet(), deleteEntity());

export {serviceRouter, readStream};
