import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';
let Thing = require('./thing-model');
/**
 * @class
 
 * @property {number} id
 * @property {ProductCategory|any} category
 * @property {boolean} discontinued
 * @property {number} price
 * @property {Product} isRelatedTo
 * @property {Product} isSimilarTo
 * @property {string} model
 * @property {string} productID
 * @property {Date} releaseDate
 * @property {QuantitativeValue} weight
 * @augments {DataObject}
 */
@EdmMapping.entityType('Product')
class Product extends Thing {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = Product;