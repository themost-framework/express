import {EdmMapping,EdmType} from '@themost/data/odata';
import ContactPoint = require('./contact-point-model');

/**
 * @class
 */
declare class PostalAddress extends ContactPoint {

     
     public id: number; 
     
     /**
      * @description The country. For example, USA. You can also provide the two-letter ISO 3166-1 alpha-2 country code.
      */
     public addressCountry?: string; 
     
     /**
      * @description The locality. For example, Mountain View.
      */
     public addressLocality?: string; 
     
     /**
      * @description The region. For example, CA.
      */
     public addressRegion?: string; 
     
     /**
      * @description The post office box number for PO box addresses.
      */
     public postOfficeBoxNumber?: string; 
     
     /**
      * @description The postal code. For example, 94043.
      */
     public postalCode?: string; 
     
     /**
      * @description The street address. For example, 1600 Amphitheatre Pkwy.
      */
     public streetAddress?: string; 

}

export = PostalAddress;