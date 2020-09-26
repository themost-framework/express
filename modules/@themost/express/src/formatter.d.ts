// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2020, THEMOST LP All rights reserved

import { ApplicationService } from '@themost/common';
import {NextFunction, Request, Response} from 'express';

export declare class HttpResponseFormatter {
    public data: any;
    constructor(app: any);
    public execute(req: Request, res: Response): Promise<any>;
}

// noinspection JSUnusedGlobalSymbols
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

// noinspection JSUnusedGlobalSymbols
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
