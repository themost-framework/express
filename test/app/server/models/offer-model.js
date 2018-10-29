import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';
let Intangible = require('./intangible-model');
/**
 * @class
 
 * @property {number} id
 * @property {Offer} addOn
 * @property {Date} priceValidUntil
 * @augments {DataObject}
 */
@EdmMapping.entityType('Offer')
class Offer extends Intangible {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = Offer;