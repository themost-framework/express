import {EdmMapping,EdmType} from '@themost/data/odata';
import Party = require('./party-model');
import User = require('./user-model');
import Organization = require('./organization-model');
import PostalAddress = require('./postal-address-model');
import Country = require('./country-model');

/**
 * @class
 */
declare class Person extends Party {

     
     public id: number; 
     
     /**
      * @description The user associated with this person.
      */
     public user?: User|any; 
     
     /**
      * @description An additional name for a Person, can be used for a middle name.
      */
     public additionalName?: string; 
     
     /**
      * @description An organization that this person is affiliated with. For example, a school/university, a club, or a team.
      */
     public affiliation?: Organization|any; 
     
     /**
      * @description Date of birth.
      */
     public birthDate?: Date; 
     
     /**
      * @description A child of the person.
      */
     public children?: Array<Person>; 
     
     /**
      * @description Physical address of the item.
      */
     public address?: PostalAddress|any; 
     
     /**
      * @description A colleague of the person.
      */
     public colleagues?: Array<Person>; 
     
     /**
      * @description Family name.
      */
     public familyName?: string; 
     
     /**
      * @description The most generic uni-directional social relation.
      */
     public follows?: Array<Person>; 
     
     /**
      * @description Gender of the person.
      */
     public gender?: string; 
     
     /**
      * @description Given name. In the U.S., the first name of a Person. This can be used along with familyName instead of the Name property.
      */
     public givenName?: string; 
     
     /**
      * @description The job title of the person (for example, Financial Manager).
      */
     public jobTitle?: string; 
     
     /**
      * @description The primary email address of the person.
      */
     public email?: string; 
     
     /**
      * @description The most generic bi-directional social/work relation.
      */
     public knows?: Array<Person>; 
     
     /**
      * @description An organization to which the person belongs.
      */
     public memberOf?: Array<Organization|any>; 
     
     /**
      * @description Nationality of the person.
      */
     public nationality?: Country|any; 
     
     /**
      * @description A parents of the person (legacy spelling; see singular form, parent).
      */
     public parents?: Array<Person>; 
     
     /**
      * @description The most generic familial relation.
      */
     public relatedTo?: Array<Person>; 
     
     /**
      * @description The person's spouse.
      */
     public spouse?: Person; 
     
     /**
      * @description Organizations that the person works for.
      */
     public worksFor?: Array<Organization|any>; 

}

export = Person;