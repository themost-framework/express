import {EdmMapping,EdmType} from '@themost/data/odata';

import {DataObject} from '@themost/data/data-object';
/**
 * @class
 */
declare class GeoCoordinates extends DataObject {

     
     public id: number; 
     
     /**
      * @description The elevation of a location. For example 1200 metres.
      */
     public elevation?: number; 
     
     /**
      * @description The latitude of a location. For example 37.42242.
      */
     public latitude: number; 
     
     /**
      * @description The longitude of a location. For example -122.08585.
      */
     public longitude: number; 

}

export = GeoCoordinates;