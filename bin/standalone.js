/**
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
 import http from 'http';
 import debug from 'debug';
 import {Args} from '@themost/common';
 import express from 'express';
 import path from 'path';
 import {ExpressDataApplication, serviceRouter} from '../modules/@themost/express/src';
import { ODataModelBuilder } from '@themost/data';

 // normalize a port into a number, string, or false.
 function normalizePort(val) {
    let port = parseInt(val, 10);
    if (isNaN(port)) {
        // named pipe
        return val;
    }
    if (port >= 0) {
        // port number
        return port;
    }
    return false;
}
// get port from environment
let port = normalizePort(process.env.PORT) || 3000;
// get bind address.
let host = process.env.HOST || 'localhost';

 const app = express();

 // create a new instance of data application
 const dataApplication = new ExpressDataApplication(path.resolve(__dirname, '../modules/@themost/express/src/test/config'));

 dataApplication.getService(ODataModelBuilder).defaultNamespace = 'Test1';
 dataApplication.getService(ODataModelBuilder).hasContextLink((context) => {
    return `http://${host}:${port}/api/$metadata`;
 });
 // hold data application
 app.set('ExpressDataApplication', dataApplication);
 // use data middleware (register req.context)
 app.use(dataApplication.middleware(app));
 // set testRouter
 // noinspection JSCheckFunctionSignatures
 app.use('/api/', serviceRouter);

 
 // enable namespace
 debug.enable('themost-framework:*');
 const log = debug('themost-framework:test');


// noinspection JSUnresolvedFunction
let server = http.createServer(app);
// listen on provided port, on all network interfaces.
server.on('error', err => {
    return reject(err);
    });
server.on('close', () => {
    log('Stopping the test api server from accepting new connections.');
});
server.on('listening', () => {
    let addr = server.address();
    // eslint-disable-next-line no-console
    log(`Test api server starts listening on http://${addr.address}:${addr.port}`);
});
server.listen(port, host);
