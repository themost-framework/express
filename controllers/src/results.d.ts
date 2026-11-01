import {IncomingMessage, ServerResponse} from 'http';

export declare interface HttpResultContext {
    request?: IncomingMessage;
    response: ServerResponse;
}

export declare abstract class HttpResult {
    contentType: string;
    contentEncoding: string;
    status?: number;
    abstract execute(context: HttpResultContext): Promise<void>;
}

export declare class HttpContentResult extends HttpResult {
    content: any;
    constructor(content: any);
    execute(context: HttpResultContext): Promise<void>;
}

export declare class HttpJsonResult extends HttpResult {
    data: any;
    constructor(data: any);
    execute(context: HttpResultContext): Promise<void>;
}

export declare class HttpXmlResult extends HttpResult {
    data: any;
    constructor(data: any);
    execute(context: HttpResultContext): Promise<void>;
}

export declare class HttpRedirectResult extends HttpResult {
    url: string;
    constructor(url: string);
    execute(context: HttpResultContext): Promise<void>;
}

export declare class HttpNextResult extends HttpResult {
    execute(context: HttpResultContext): Promise<void>;
}
