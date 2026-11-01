import {HttpConsumer, HttpConsumerCallable} from './controller';

export declare class DecoratorError extends Error {
    constructor(msg?: string);
}

export declare interface HttpControllerAnnotation extends Function {
    httpController: { name: string };
}

export declare interface HttpControllerMethodDeclaration {
    httpGet?: boolean;
    httpPost?: boolean;
    httpPut?: boolean;
    httpPatch?: boolean;
    httpDelete?: boolean;
    httpHead?: boolean;
    httpOptions?: boolean;
    httpAny?: boolean;
}

export declare interface HttpControllerMethodAnnotation extends HttpControllerMethodDeclaration, Function {
    httpAction?: string;
    httpParams?: { [name: string]: HttpParamAttributeOptions };
    httpParamAlias?: { [name: string]: string };
    httpRoutes?: { path: string, index: number }[];
}

export declare interface HttpParamAttributeOptions {
    name: string;
    type?: string;
    pattern?: RegExp | string;
    minValue?: any;
    maxValue?: any;
    minLength?: number;
    maxLength?: number;
    required?: boolean;
    message?: string;
}

export declare interface HttpMethodDecoratorExtras {
    name?: string;
    params?: HttpParamAttributeOptions[];
}

export declare function httpController(name?: string): ClassDecorator;
export declare function httpGet(extras?: HttpMethodDecoratorExtras): MethodDecorator;
export declare function httpAny(extras?: HttpMethodDecoratorExtras): MethodDecorator;
export declare function httpPost(extras?: HttpMethodDecoratorExtras): MethodDecorator;
export declare function httpPut(extras?: HttpMethodDecoratorExtras): MethodDecorator;
export declare function httpPatch(extras?: HttpMethodDecoratorExtras): MethodDecorator;
export declare function httpDelete(extras?: HttpMethodDecoratorExtras): MethodDecorator;
export declare function httpOptions(extras?: HttpMethodDecoratorExtras): MethodDecorator;
export declare function httpHead(extras?: HttpMethodDecoratorExtras): MethodDecorator;
export declare function httpAction(name: string): MethodDecorator;
export declare function httpRoute(url: string, index?: number): MethodDecorator;
export declare function httpParamAlias(name: string, alias: string): MethodDecorator;
export declare function httpParam(options: HttpParamAttributeOptions): MethodDecorator;
export declare function httpAuthorize(value?: boolean): MethodDecorator;
export declare function httpActionConsumer(name: string, consumer: HttpConsumer | HttpConsumerCallable): MethodDecorator;
