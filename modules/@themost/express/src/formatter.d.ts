

/**
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import { ApplicationService } from '@themost/common';
import {NextFunction, Request, Response} from 'express';

export declare class HttpResponseFormatter {
    public data: any;
    constructor(app: any);
    public execute(req: Request, res: Response): Promise<any>;
}

export declare class JsonResponseFormatter extends HttpResponseFormatter {

}

export declare class XmlResponseFormatter extends HttpResponseFormatter {

}

export declare interface ResponseFormatterWrapper {
    for(req: Request, res: Response): any;
}

export declare class ResponseFormatter extends ApplicationService {
    public formatters: Map<string, () => void>;
    constructor(app: any);
    public format(data?: any): ResponseFormatterWrapper;
}

export declare interface StreamResponse {
    contentLocation?: string;
    contentDisposition?: string;
    contentLanguage?: string;
    contentEncoding?: string;
    contentMD5?: string;
}

export declare class StreamFormatter {
    public data: any;
    constructor(data: any);
    public execute(req: Request, res: Response, next: NextFunction): void;
}
