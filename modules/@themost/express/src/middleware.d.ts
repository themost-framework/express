// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2017-2020, THEMOST LP All rights reserved
import {RequestHandler} from 'express';

export declare interface BindEntitySetOptions {
    from?: string;
}

export declare interface EntitySetOptions {

    entitySet?: string;

    entitySetActionFrom?: string;

    entitySetFunctionFrom?: string;

    navigationPropertyFrom?: string;

    entityActionFrom?: string;

    entityFunctionFrom?: string;

}

export declare interface EntityOptions {

    entitySet?: string;

    navigationPropertyFrom?: string;

    entityActionFrom?: string;

    entityFunctionFrom?: string;

}

export declare function bindEntitySet(options?: BindEntitySetOptions): RequestHandler;

export declare function getEntitySetIndex(): RequestHandler;

export declare function getMetadataDocument(): RequestHandler;

export declare function getEntitySet(options?: EntitySetOptions): RequestHandler;

export declare function postEntitySet(options?: EntitySetOptions): RequestHandler;

export declare function deleteEntitySet(options?: EntitySetOptions): RequestHandler;

export declare function getEntity(options?: EntityOptions): RequestHandler;

export declare function postEntity(options?: EntityOptions): RequestHandler;

export declare function deleteEntity(options?: EntityOptions): RequestHandler;

export declare function getEntityNavigationProperty(options?: EntityOptions): RequestHandler;

export declare function getEntitySetFunction(options?: EntitySetOptions): RequestHandler;

export declare function postEntitySetFunction(options?: EntitySetOptions): RequestHandler;

export declare function postEntitySetAction(options?: EntitySetOptions): RequestHandler;

export declare function getEntityFunction(options?: EntityOptions): RequestHandler;

export declare function postEntityAction(options?: EntityOptions): RequestHandler;
