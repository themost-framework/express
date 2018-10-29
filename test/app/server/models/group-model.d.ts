import {EdmMapping,EdmType} from '@themost/data/odata';
import Account = require('./account-model');
import User = require('./user-model');

/**
 * @class
 */
declare class Group extends Account {

     
     /**
      * @description The identifier of the item.
      */
     public id: number; 
     
     /**
      * @description Contains the collection of group members (users or groups).
      */
     public members?: Array<User|any>; 
     
     /**
      * @description Contains a collection of tags for this object.
      */
     public tags?: Array<string>; 

}

export = Group;