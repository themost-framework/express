import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';
let ContactPoint = require('./contact-point-model');
/**
 * @class
 
 * @property {number} id
 * @property {string} addressCountry
 * @property {string} addressLocality
 * @property {string} addressRegion
 * @property {string} postOfficeBoxNumber
 * @property {string} postalCode
 * @property {string} streetAddress
 * @augments {DataObject}
 */
@EdmMapping.entityType('PostalAddress')
class PostalAddress extends ContactPoint {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = PostalAddress;