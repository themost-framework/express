import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';

/**
 * @class
 
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @augments {DataObject}
 */
@EdmMapping.entityType('ProductCategory')
class ProductCategory extends DataObject {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = ProductCategory;