import {EdmMapping,EdmType} from '@themost/data/odata';
import Intangible = require('./intangible-model');

/**
 * @class
 */
declare class Offer extends Intangible {

     
     public id: number; 
     
     /**
      * @description An additional offer that can only be obtained in combination with the first base offer (e.g. supplements and extensions that are available for a surcharge).
      */
     public addOn?: Offer; 
     
     /**
      * @description The date after which the price is no longer available.
      */
     public priceValidUntil?: Date; 

}

export = Offer;