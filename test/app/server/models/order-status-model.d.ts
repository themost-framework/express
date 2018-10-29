import {EdmMapping,EdmType} from '@themost/data/odata';

import {DataObject} from '@themost/data/data-object';
/**
 * @class
 */
declare class OrderStatus extends DataObject {

     
     public id: number; 
     
     /**
      * @description The name of the item.
      */
     public name: string; 
     
     /**
      * @description An alias for the item.
      */
     public alternateName: string; 
     
     /**
      * @description A short description of the item.
      */
     public description?: string; 
     
     /**
      * @description A color associated with this item.
      */
     public color?: string; 

}

export = OrderStatus;