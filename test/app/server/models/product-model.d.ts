import {EdmMapping,EdmType} from '@themost/data/odata';
import Thing = require('./thing-model');
import ProductCategory = require('./product-category-model');

/**
 * @class
 */
declare class Product extends Thing {

     
     public id: number; 
     
     /**
      * @description A category related to this product.
      */
     public category?: ProductCategory|any; 
     
     /**
      * @description Indicates whether this product is discontinued or not.
      */
     public discontinued?: boolean; 
     
     /**
      * @description The price of the product.
      */
     public price?: number; 
     
     /**
      * @description A pointer to another, somehow related product (or multiple products).
      */
     public isRelatedTo?: Product; 
     
     /**
      * @description A pointer to another, functionally similar product (or multiple products).
      */
     public isSimilarTo?: Product; 
     
     /**
      * @description The model of the product. Use with the URL of a ProductModel or a textual representation of the model identifier. The URL of the ProductModel can be from an external source. It is recommended to additionally provide strong product identifiers via the gtin8/gtin13/gtin14 and mpn properties.
      */
     public model?: string; 
     
     /**
      * @description The product identifier, such as ISBN. For example: <code>&lt;meta itemprop='productID' content='isbn:123-456-789'/&gt;</code>.
      */
     public productID?: string; 
     
     /**
      * @description The release date of a product or product model. This can be used to distinguish the exact variant of a product.
      */
     public releaseDate?: Date; 
     
     /**
      * @description The weight of the product.
      */
     public weight?: QuantitativeValue; 

}

export = Product;