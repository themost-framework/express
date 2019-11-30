/**
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */

 import {IApplication, IApplicationService} from '@themost/common/app';
 import {ConfigurationBase} from '@themost/common/config';
 import {DefaultDataContext} from '@themost/data/data-context';
 import {ODataModelBuilder} from '@themost/data/odata';
 import {RequestHandler, Router} from 'express';

 export declare class ApplicationServiceRouter implements IApplicationService {
     public getApplication(): IApplication;
     public getServiceRouter(): Router;
 }

 export declare class ExpressDataApplication implements IApplication {

     constructor(configurationPath?: string);

     public useModelBuilder(): ODataModelBuilder;

     public getBuilder(): ODataModelBuilder;

     public useStrategy(serviceCtor: void, strategyCtor: void): IApplication;

     public useService(serviceCtor: void): ExpressDataApplication;

     public hasStrategy(serviceCtor: void): boolean;

     public hasService(serviceCtor: void): boolean;

     public getStrategy(serviceCtor: void): any;

     public getService(serviceCtor: void): any;

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

     public getStrategy(serviceCtor: void): any;

     public engine(extension): any;
 }
