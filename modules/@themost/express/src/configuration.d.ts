// MOST Web Framework 2.0 Codename Blueshift Copyright (c) 2019-2023, THEMOST LP All rights reserved
import {ExpressDataApplication} from './app';

export declare interface ServiceConfigurationElement {
    serviceType: string;
    strategyType: string;
}

export declare class ServicesConfiguration {
    public config(app: ExpressDataApplication): void;
}
