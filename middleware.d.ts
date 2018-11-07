/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
 
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