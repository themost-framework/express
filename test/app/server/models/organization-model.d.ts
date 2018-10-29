import {EdmMapping,EdmType} from '@themost/data/odata';
import Party = require('./party-model');
import Person = require('./person-model');

/**
 * @class
 */
declare class Organization extends Party {

     
     public id: number; 
     
     /**
      * @description People working for this organization. (legacy spelling; see singular form, employee)
      */
     public employees?: Array<Person|any>; 
     
     /**
      * @description A person who founded this organization (legacy spelling; see singular form, founder).
      */
     public founders?: Array<Person|any>; 
     
     /**
      * @description The date that this organization was founded.
      */
     public foundingDate?: Date; 
     
     /**
      * @description The official name of the organization, e.g. the registered company name.
      */
     public legalName?: string; 
     
     /**
      * @description A collection of members of this organization.
      */
     public members?: Array<Organization>; 

}

export = Organization;