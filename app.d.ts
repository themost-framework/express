/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
 
 import {IApplication} from '@themost/common/app';
 import {ODataModelBuilder} from '@themost/data/odata';
 import {DefaultDataContext} from '@themost/data/data-context';
 import {ConfigurationBase} from '@themost/common/config';
 
 export declare class ExpressDataApplication extends IApplication {
     
     constructor(configurationPath: string);
     
     useModelBuilder(): ODataModelBuilder;
     
     getBuilder(): ODataModelBuilder;
     
     useStrategy(serviceCtor: Function, strategyCtor: Function): ExpressDataApplication;
     
     useService(serviceCtor: Function): ExpressDataApplication;
    
     hasStrategy(serviceCtor: Function): boolean;
    
     hasService(serviceCtor: Function): boolean;
    
     getStrategy(serviceCtor: Function): any;
    
     getService(serviceCtor: Function): any;
    
     createContext(): ExpressDataContext;
    
     execute(callback: Function, callback: Faunction);
 }
 
 export declare class ExpressDataContext extends DefaultDataContext {
     
     getConfiguration(): ConfigurationBase;
     
     getApplication(): ExpressDataApplication;
     
     getStrategy(serviceCtor: Function): any;
 }