import {EdmMapping,EdmType} from '@themost/data/odata';
import Thing = require('./thing-model');
import GeoCoordinates = require('./geo-coordinates-model');
import ImageObject = require('./image-object-model');

/**
 * @class
 */
declare class Place extends Thing {

     
     public id: number; 
     
     /**
      * @description The basic containment relation between places.
      */
     public containedIn?: Place; 
     
     /**
      * @description The geo coordinates of the place.
      */
     public geo?: GeoCoordinates|any; 
     
     /**
      * @description A URL to a map of the place.
      */
     public map?: string; 
     
     /**
      * @description Photographs of this place.
      */
     public photos?: Array<ImageObject|any>; 

}

export = Place;