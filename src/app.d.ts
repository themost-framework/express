// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2019-2023, THEMOST LP All rights reserved
// tslint:disable-next-line:ordered-imports
import {ConfigurationBase, IApplicationService, ApplicationBase} from '@themost/common';
import {ApplicationServiceConstructor} from '@themost/common/app';
import {DataAdapterConstructor, DefaultDataContext, ODataModelBuilder} from '@themost/data';
import {Application, RequestHandler, Router} from 'express';
import {BehaviorSubject} from 'rxjs';

export declare interface ApplicationConfiguration {
    [key: string]: unknown;
    services?: { serviceType: string; strategyType?: string }[];
    settings?: {
        [key: string]: unknown,
        crypto?: {
            algorithm: string,
            key: string,
        },
        auth?: {
            [key: string]: unknown,
            unattendedExecutionAccount?: string;
        },
        schema?: {
            loaders?: { loaderType: string;}[];
        },
        i18n?: {
            defaultLocale: string;
            locales: string[];
        }
    }
    adapterTypes?: {
        name: string;
        invariantName: string;
        type: string | DataAdapterConstructor<any>;
    }[];
    adapters?: {
        name: string;
        invariantName: string;
        default?: boolean;
        options: unknown;
    }[];
}

export declare class ApplicationServiceRouter implements IApplicationService {
    public serviceRouter: Router;

    public getApplication(): ApplicationBase;
}

export declare interface CreateApplicationContext {
    createContext(): ExpressDataContext;
}

export declare class ExpressDataApplication implements ApplicationBase, CreateApplicationContext {

    public readonly container: BehaviorSubject<Application>;

    public readonly serviceRouter: BehaviorSubject<Router>;

    constructor(configurationPath?: string);

    configuration: ConfigurationBase;

    useStrategy(serviceCtor: ApplicationServiceConstructor<any>, strategyCtor: ApplicationServiceConstructor<any>): this;

    useService(serviceCtor: ApplicationServiceConstructor<any>): this;

    public useModelBuilder(): ODataModelBuilder;

    public getBuilder(): ODataModelBuilder;

    public hasStrategy<T>(serviceCtor: ApplicationServiceConstructor<T>): boolean;

    public hasService<T>(serviceCtor: ApplicationServiceConstructor<T>): boolean;

    public getStrategy<T>(serviceCtor: ApplicationServiceConstructor<T>): T;

    hasService<T>(serviceCtor: ApplicationServiceConstructor<T>): boolean;

    getService<T>(serviceCtor: ApplicationServiceConstructor<T>): T;

    public createContext(): ExpressDataContext;

    public execute(callable: void, callback: void): void;

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

    public application: ExpressDataApplication;

    public getConfiguration(): ConfigurationBase;

    public getApplication(): ExpressDataApplication;

    public getStrategy<T>(serviceCtor: new() => T): T;

    public engine(extension: string): any;
}

declare global {
    namespace Express {
        interface Request {
            context: ExpressDataContext;
        }
    }
}

declare module '@themost/common' {
    interface DataAdapterBase {
        dispose(): void;
    }
}

declare module '@themost/data' {
    interface ODataConventionModelBuilder {
        initializeSync(): void;
    }
}
