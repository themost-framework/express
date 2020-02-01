

/**
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import { ApplicationService } from "@themost/common";
import {Response, Request} from 'express';

export declare class HttpResponseFormatter {
    data: any;
    execute(req: Request, res: Response): Promise<any>;
}

export declare class JsonResponseFormatter extends HttpResponseFormatter {

}

export declare class XmlResponseFormatter extends HttpResponseFormatter {

}

export declare class ResponseFormatter extends ApplicationService {
    formatters: Map<string, Function>;
    for(data: any, req: Request, res: Response, next: Function): ResponseFormatter;
}