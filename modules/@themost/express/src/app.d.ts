// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2020, THEMOST LP All rights reserved
import {ConfigurationBase, IApplicationService, ApplicationBase} from '@themost/common';
import {DefaultDataContext, ODataModelBuilder} from '@themost/data';
import {Application, RequestHandler, Router} from 'express';
import {BehaviorSubject} from 'rxjs';

export declare class ApplicationServiceRouter implements IApplicationService {
    public serviceRouter: Router;

    public getApplication(): ApplicationBase;
}

export declare class ExpressDataApplication {

    public readonly container: BehaviorSubject<Application>;

    public readonly serviceRouter: BehaviorSubject<Router>;

    constructor(configurationPath?: string);

    public useModelBuilder(): ODataModelBuilder;

    public getBuilder(): ODataModelBuilder;

    public useStrategy(serviceCtor: void, strategyCtor: void): this;

    public useService(serviceCtor: void): this;

    public hasStrategy<T>(serviceCtor: new() => T): boolean;

    public hasService<T>(serviceCtor: new() => T): boolean;

    public getStrategy<T>(serviceCtor: new() => T): T;

    public getService<T>(serviceCtor: new() => T): T;

    public createContext(): ExpressDataContext;

    public execute(callable: void, callback: void);

    public getConfiguration(): ConfigurationBase;

    public middleware(app?: any): RequestHandler;

}

/**
 * Holds user information of a data context
 */
export interface AuthenticatedUser {
    /**
     * Gets or sets a string which represents the name of the user
     */
    name: string;
    /**
     * Gets or sets a string which represents the current authentication type e.g. Basic, Bearer, None etc
     */
    authenticationType?: string;
    /**
     * Gets or sets a string which represents a token associated with this user
     */
    authenticationToken?: string;
    /**
     * Gets or sets a scope if current authentication type is associated with scopes like OAuth2 authentication
     */
    authenticationScope?: string;
    /**
     * Gets or sets a key returned by authentication provider and identifies this user e.g. The id of the user
     */
    authenticationProviderKey?: any;
}

/**
 * Holds user information when a data context is in unattended mode
 */
export interface InteractiveUser {

    name: string;
    /**
     * Gets or sets a string which represents the current authentication type e.g. Basic, Bearer, None etc
     */
    authenticationType?: string;
}

export declare class ExpressDataContext extends DefaultDataContext {

    public interactiveUser?: InteractiveUser;

    public user?: AuthenticatedUser;

    public application: ExpressDataApplication;

    public getConfiguration(): ConfigurationBase;

    public getApplication(): ExpressDataApplication;

    public getStrategy<T>(serviceCtor: new() => T): T;

    public engine(extension): any;
}

declare global {
    namespace Express {
        interface Request {
            context: ExpressDataContext;
        }
    }
}
