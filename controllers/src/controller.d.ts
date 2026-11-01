import {ExpressDataContext} from '@themost/express';
import {HttpJsonResult, HttpXmlResult, HttpContentResult, HttpRedirectResult, HttpNextResult} from './results';

export declare type HttpConsumerCallable = (context: any, ...args: any[]) => Promise<any>;

export declare class HttpConsumer {
    callable: HttpConsumerCallable;
    constructor(callable: HttpConsumerCallable);
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
