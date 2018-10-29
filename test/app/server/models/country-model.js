import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';
let Place = require('./place-model');
/**
 * @class
 
 * @property {number} id
 * @property {string} official
 * @property {string} cca2
 * @property {string} cioc
 * @property {string} cca3
 * @property {string} currency
 * @augments {DataObject}
 */
@EdmMapping.entityType('Country')
class Country extends Place {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = Country;