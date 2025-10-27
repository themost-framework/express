// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2019-2023, THEMOST LP All rights reserved
import express from 'express';

const serviceRouter = express.Router();

import {getEntitySetIndex} from './middleware';
import {getMetadataDocument} from './middleware';
import {bindEntitySet} from './middleware';
import {getEntitySet} from './middleware';
import {postEntitySet} from './middleware';
import {deleteEntitySet} from './middleware';
import {getEntity} from './middleware';
import {postEntity} from './middleware';
import {deleteEntity} from './middleware';
import {getEntityNavigationProperty} from './middleware';
import {getEntitySetFunction} from './middleware';
import {postEntitySetFunction} from './middleware';
import {postEntitySetAction} from './middleware';
import {getEntityFunction} from './middleware';
import {postEntityAction} from './middleware';
import {batch} from './batch';

/**
 *
 * @param {ReadableStream} stream
 * @returns {Promise<Buffer>}
 */
function readStream(stream) {
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

serviceRouter.post('/\\$batch', batch(serviceRouter));

Object.defineProperty(serviceRouter, 'alternateName', {
    configurable: true,
    enumerable: true,
    writable: false,
    value: 'serviceRouter'
});

function findByAlternateName(item) {
    if (typeof item.handle === 'function' && item.handle.alternateName === 'serviceRouter') {
        return item;
    }
    if (Array.isArray(item.stack)) {
        return item.stack.find(findByAlternateName);
    }
}

function getServiceRouter(app) {
    if (app && app._router && app._router.stack) {
        const router = app._router.stack.find(findByAlternateName);
        if (router) {
            return router.handle;
        }
    }
}

export {serviceRouter, readStream, getServiceRouter};
