import {EdmMapping,EdmType} from '@themost/data/odata';
import Thing = require('./thing-model');

/**
 * @class
 */
declare class Account extends Thing {

     
     /**
      * @description The identifier of the item.
      */
     public id: number; 
     
     /**
      * @description Contains a set of flags that define the type and scope of an account object.
      */
     public accountType?: number; 

}

export = Account;