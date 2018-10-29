import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';
let Thing = require('./thing-model');
/**
 * @class
 
 * @property {number} id
 * @property {Array<ContactPoint>} contactPoints
 * @property {Array<Order>} orders
 * @augments {DataObject}
 */
@EdmMapping.entityType('Party')
class Party extends Thing {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = Party;