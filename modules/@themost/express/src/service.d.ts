// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2020, THEMOST LP All rights reserved
import {Application, Router} from 'express';

declare const serviceRouter: Router;

// noinspection JSUnusedGlobalSymbols
declare function readStream(stream: ReadableStream): Buffer;

declare function getServiceRouter(app: Application): Router;

export {serviceRouter, readStream, getServiceRouter};
