import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';
let Thing = require('./thing-model');
/**
 * @class
 
 * @property {number} id
 * @augments {DataObject}
 */
@EdmMapping.entityType('Intangible')
class Intangible extends Thing {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = Intangible;