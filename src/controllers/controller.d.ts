// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2019-2023, THEMOST LP All rights reserved
import {ExpressDataContext} from '../app';
import {HttpJsonResult, HttpXmlResult, HttpContentResult, HttpRedirectResult, HttpNextResult} from './results';

export declare class HttpConsumer {
    callable: (this: any, ...args: any[]) => Promise<any>;
    constructor(callable: (this: any, ...args: any[]) => Promise<any>);
    run(context: any, ...args: any[]): Promise<any>;
}

export declare class HttpController {
    context: ExpressDataContext;
    [k: string]: any;
    constructor();
    json(data: any): HttpJsonResult;
    xml(data: any): HttpXmlResult;
    content(content: any): HttpContentResult;
    redirect(url: string): HttpRedirectResult;
    next(): HttpNextResult;
}

export declare function getControllerActions(controllerCtor: Function): { key: string, action: string, method: Function }[];
