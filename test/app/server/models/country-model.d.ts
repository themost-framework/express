import {EdmMapping,EdmType} from '@themost/data/odata';
import Place = require('./place-model');

/**
 * @class
 */
declare class Country extends Place {

     
     public id: number; 
     
     /**
      * @description The official name of the country.
      */
     public official?: string; 
     
     /**
      * @description The ISO 3166-1 alpha-2 code of the country.
      */
     public cca2?: string; 
     
     /**
      * @description The International Olympic Committee code of the country.
      */
     public cioc?: string; 
     
     /**
      * @description The ISO 3166-1 alpha-3 code of the country.
      */
     public cca3?: string; 
     
     /**
      * @description The currency of the country.
      */
     public currency?: string; 

}

export = Country;