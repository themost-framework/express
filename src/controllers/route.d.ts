// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2019-2023, THEMOST LP All rights reserved
import {ApplicationBase, ApplicationService} from '@themost/common';

export declare const HTTP_ROUTE_PATTERNS: Map<string, () => string>;
export declare const HTTP_ROUTE_PARSERS: Map<string, (value: any) => any>;

export declare interface HttpRouteConfig {
    path: string;
    index?: number;
    controller?: string | Function;
    action?: string;
    [key: string]: any;
}

export declare class HttpRoute {
    routeConfig?: HttpRouteConfig;
    params: { [key: string]: any };
    constructor(routeConfig?: HttpRouteConfig);
    isMatch(urlToMatch: string): boolean;
}

export declare class RouterService extends ApplicationService {
    readonly routes: HttpRouteConfig[];
    readonly controllers: Map<string, Function>;
    constructor(app: ApplicationBase);
    add(item: HttpRouteConfig): this;
    addRange(...items: HttpRouteConfig[]): this;
    useController(controllerCtor: Function): this;
    getController(name: string): Function | undefined;
    parseUrl(url: string, startIndex?: number): HttpRoute | undefined;
}
