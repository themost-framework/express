import {EdmMapping,EdmType} from '@themost/data/odata';
import {DataObject} from '@themost/data/data-object';

/**
 * @class
 
 * @property {number} id
 * @property {number} elevation
 * @property {number} latitude
 * @property {number} longitude
 * @augments {DataObject}
 */
@EdmMapping.entityType('GeoCoordinates')
class GeoCoordinates extends DataObject {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = GeoCoordinates;