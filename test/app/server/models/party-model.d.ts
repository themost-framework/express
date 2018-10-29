import {EdmMapping,EdmType} from '@themost/data/odata';
import Thing = require('./thing-model');
import ContactPoint = require('./contact-point-model');
import Order = require('./order-model');

/**
 * @class
 */
declare class Party extends Thing {

     
     public id: number; 
     
     /**
      * @description A collection of contact points for a person or organization.
      */
     public contactPoints?: Array<ContactPoint>; 
     
     /**
      * @description A collection of orders made by the party (Persor or Organization).
      */
     public orders?: Array<Order|any>; 

}

export = Party;