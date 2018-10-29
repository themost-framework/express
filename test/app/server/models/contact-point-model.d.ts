import {EdmMapping,EdmType} from '@themost/data/odata';

import {DataObject} from '@themost/data/data-object';
/**
 * @class
 */
declare class ContactPoint extends DataObject {

     
     public id: number; 
     
     public additionalType: *; 
     
     /**
      * @description A person or organization can have different contact points, for different purposes. For example, a sales contact point, a PR contact point and so on. This property is used to specify the kind of contact point.
      */
     public contactType?: string; 
     
     /**
      * @description An email address associated with this item.
      */
     public email?: string; 
     
     /**
      * @description A telephone number associated with this item.
      */
     public telephone?: string; 
     
     /**
      * @description A fax number associated with this item.
      */
     public faxNumber?: string; 

}

export = ContactPoint;